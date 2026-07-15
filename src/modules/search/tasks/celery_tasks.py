import asyncio
from datetime import datetime, timezone

from src.core.celery_app import celery_app
from src.core.database import async_session_factory
from src.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="search.reindex",
    max_retries=3,
    acks_late=True,
)
def reindex_task(self, job_id: str, user_id: str, full: bool = True):
    asyncio.run(_reindex_async(job_id, user_id, full))


async def _reindex_async(job_id: str, user_id: str, full: bool):
    async with async_session_factory() as session:
        from src.modules.search.services.elasticsearch_client import ElasticsearchClient
        from src.modules.search.services.indexing_service import IndexingService
        from src.modules.search.repositories.search import IndexJobRepository
        from src.modules.search.models.search import IndexJobStatus

        es = ElasticsearchClient()
        await es.connect()

        service = IndexingService(session, es)
        job_repo = IndexJobRepository(session)

        try:
            await service.update_job_progress(job_id, 0)

            if full:
                await es.create_index()

            from sqlalchemy import text

            batch_size = 500
            offset = 0
            total_indexed = 0
            total_failed = 0

            while True:
                if full:
                    query = text("""
                        SELECT id, user_id, subject, sender, recipients, body_text,
                               date, message_id, folder, labels, tags, size_bytes,
                               conversion_status, metadata
                        FROM emails
                        WHERE user_id = :user_id
                        ORDER BY id
                        LIMIT :limit OFFSET :offset
                    """)
                else:
                    query = text("""
                        SELECT id, user_id, subject, sender, recipients, body_text,
                               date, message_id, folder, labels, tags, size_bytes,
                               conversion_status, metadata
                        FROM emails
                        WHERE user_id = :user_id
                          AND updated_at > (
                              SELECT completed_at FROM search_index_jobs
                              WHERE job_type = 'incremental' AND status = 'completed'
                              ORDER BY completed_at DESC LIMIT 1
                          )
                        ORDER BY id
                        LIMIT :limit OFFSET :offset
                    """)

                result = await session.execute(
                    query, {"user_id": user_id, "limit": batch_size, "offset": offset}
                )
                rows = result.fetchall()

                if not rows:
                    break

                documents = []
                for row in rows:
                    documents.append({
                        "document_id": str(row[0]),
                        "user_id": str(row[1]),
                        "subject": row[2],
                        "sender": row[3],
                        "recipients": row[4] or [],
                        "body_text": row[5],
                        "date": row[6].isoformat() if row[6] else None,
                        "message_id": row[7],
                        "folder": row[8],
                        "labels": row[9] or [],
                        "tags": row[10] or [],
                        "size_bytes": row[11] or 0,
                        "conversion_status": row[12],
                        "metadata": row[13] or {},
                    })

                bulk_result = await service.bulk_index_documents(documents)
                total_indexed += bulk_result["indexed"]
                total_failed += bulk_result["failed"]

                await service.update_job_progress(job_id, total_indexed, total_failed)

                offset += batch_size
                logger.info(
                    "reindex_progress",
                    extra={"job_id": job_id, "indexed": total_indexed, "failed": total_failed},
                )

            await service.complete_job(job_id, success=True)

            logger.info(
                "reindex_completed",
                extra={"job_id": job_id, "indexed": total_indexed, "failed": total_failed},
            )

        except Exception as e:
            logger.error("reindex_failed", extra={"job_id": job_id, "error": str(e)})
            await service.complete_job(job_id, success=False, error=str(e))
            raise self.retry(exc=e, countdown=60)

        finally:
            await es.close()


@celery_app.task(
    bind=True,
    name="search.index_document",
    max_retries=3,
)
def index_document_task(self, document_data: dict):
    asyncio.run(_index_document_async(document_data))


async def _index_document_async(document_data: dict):
    async with async_session_factory() as session:
        from src.modules.search.services.elasticsearch_client import ElasticsearchClient
        from src.modules.search.services.indexing_service import IndexingService

        es = ElasticsearchClient()
        await es.connect()

        service = IndexingService(session, es)

        try:
            result = await service.index_document(document_data)
            logger.info("document_indexed", extra={"doc_id": document_data.get("document_id")})
            return result
        except Exception as e:
            logger.error("index_document_failed", extra={"error": str(e)})
            raise self.retry(exc=e, countdown=30)
        finally:
            await es.close()


@celery_app.task(
    bind=True,
    name="search.retry_failed",
    max_retries=2,
)
def retry_failed_task(self, job_id: str, documents: list[dict]):
    asyncio.run(_retry_failed_async(job_id, documents))


async def _retry_failed_async(job_id: str, documents: list[dict]):
    async with async_session_factory() as session:
        from src.modules.search.services.elasticsearch_client import ElasticsearchClient
        from src.modules.search.services.indexing_service import IndexingService

        es = ElasticsearchClient()
        await es.connect()

        service = IndexingService(session, es)

        try:
            result = await service.retry_failed_documents(job_id, documents)
            logger.info("retry_completed", extra={"job_id": job_id})
            return result
        except Exception as e:
            logger.error("retry_failed", extra={"job_id": job_id, "error": str(e)})
            raise self.retry(exc=e, countdown=60)
        finally:
            await es.close()


@celery_app.task(
    bind=True,
    name="search.collect_analytics",
    max_retries=2,
)
def collect_analytics_task(self):
    asyncio.run(_collect_analytics_async())


async def _collect_analytics_async():
    async with async_session_factory() as session:
        from src.modules.search.repositories.search import (
            SearchHistoryRepository,
            SearchAnalyticsRepository,
        )
        from src.modules.search.services.elasticsearch_client import ElasticsearchClient
        from src.modules.search.services.indexing_service import IndexingService
        from datetime import timedelta

        history_repo = SearchHistoryRepository(session)
        analytics_repo = SearchAnalyticsRepository(session)
        es = ElasticsearchClient()
        await es.connect()

        try:
            now = datetime.now(timezone.utc)
            today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            yesterday = today - timedelta(days=1)

            from sqlalchemy import text

            result = await session.execute(
                text("""
                    SELECT
                        COUNT(*) as total,
                        COUNT(DISTINCT user_id) as unique_users,
                        AVG(latency_ms) as avg_latency,
                        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95,
                        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99,
                        SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END) as zero_results
                    FROM search_history
                    WHERE created_at >= :start AND created_at < :end
                """),
                {"start": yesterday, "end": today},
            )
            row = result.one()

            popular = await history_repo.get_popular_queries(10, 1)

            index_service = IndexingService(session, es)
            index_status = await index_service.get_index_status()

            await analytics_repo.record_daily_stats({
                "date": yesterday,
                "total_queries": row.total or 0,
                "unique_users": row.unique_users or 0,
                "avg_latency_ms": round(row.avg_latency or 0, 2),
                "p95_latency_ms": round(row.p95 or 0, 2),
                "p99_latency_ms": round(row.p99 or 0, 2),
                "zero_result_queries": row.zero_results or 0,
                "cached_queries": 0,
                "top_queries": popular,
                "top_filters": [],
                "index_size_bytes": index_status.get("index_size_bytes", 0),
                "index_doc_count": index_status.get("document_count", 0),
            })

            logger.info("search_analytics_collected")
            return {"success": True}

        except Exception as e:
            logger.error("analytics_collection_failed", extra={"error": str(e)})
            return {"success": False, "error": str(e)}
        finally:
            await es.close()


@celery_app.task(
    bind=True,
    name="search.cleanup_history",
    max_retries=2,
)
def cleanup_history_task(self, days: int = 90):
    asyncio.run(_cleanup_history_async(days))


async def _cleanup_history_async(days: int):
    async with async_session_factory() as session:
        from src.modules.search.repositories.search import SearchHistoryRepository

        repo = SearchHistoryRepository(session)
        deleted = await repo.cleanup_old_history(days)

        logger.info("search_history_cleaned", extra={"days": days, "deleted": deleted})
        return {"deleted": deleted}
