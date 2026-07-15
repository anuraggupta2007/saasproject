from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy import select, func, and_, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.base import BaseRepository
from src.modules.search.models.search import (
    SearchHistory,
    SavedSearch,
    SearchAnalytics,
    IndexJob,
    QuerySuggestion,
    IndexJobStatus,
)


class SearchHistoryRepository(BaseRepository[SearchHistory]):
    def __init__(self, session: AsyncSession):
        super().__init__(SearchHistory, session)

    async def record_search(
        self,
        user_id,
        query,
        results_count,
        latency_ms,
        filters=None,
        page=1,
        page_size=20,
        sort_by="relevance",
        clicked_result_id=None,
        ip_address=None,
    ) -> SearchHistory:
        entry = SearchHistory(
            user_id=str(user_id),
            query=query,
            filters=filters or {},
            results_count=results_count,
            latency_ms=latency_ms,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            clicked_result_id=clicked_result_id,
            ip_address=ip_address,
        )
        self.session.add(entry)
        await self.session.commit()
        return entry

    async def get_user_history(
        self, user_id: str, page: int = 1, page_size: int = 20
    ) -> tuple[list[SearchHistory], int]:
        query = select(SearchHistory).where(SearchHistory.user_id == user_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(SearchHistory.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def get_popular_queries(self, limit: int = 10, days: int = 30) -> list[dict]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        result = await self.session.execute(
            select(
                SearchHistory.query,
                func.count(SearchHistory.id).label("count"),
                func.avg(SearchHistory.latency_ms).label("avg_latency"),
            )
            .where(SearchHistory.created_at >= cutoff)
            .group_by(SearchHistory.query)
            .order_by(func.count(SearchHistory.id).desc())
            .limit(limit)
        )
        return [
            {"query": row[0], "count": row[1], "avg_latency": round(row[2], 2)}
            for row in result.all()
        ]

    async def cleanup_old_history(self, days: int = 90) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        result = await self.session.execute(
            delete(SearchHistory).where(SearchHistory.created_at < cutoff)
        )
        await self.session.commit()
        return result.rowcount


class SavedSearchRepository(BaseRepository[SavedSearch]):
    def __init__(self, session: AsyncSession):
        super().__init__(SavedSearch, session)

    async def create_saved_search(
        self, user_id, name, query, filters=None, sort_by="relevance", notify_on_match=False
    ) -> SavedSearch:
        saved = SavedSearch(
            user_id=str(user_id),
            name=name,
            query=query,
            filters=filters or {},
            sort_by=sort_by,
            notify_on_match=notify_on_match,
        )
        self.session.add(saved)
        await self.session.commit()
        return saved

    async def get_user_saved_searches(self, user_id: str) -> list[SavedSearch]:
        result = await self.session.execute(
            select(SavedSearch)
            .where(SavedSearch.user_id == user_id)
            .order_by(SavedSearch.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_name(self, user_id: str, name: str) -> SavedSearch | None:
        result = await self.session.execute(
            select(SavedSearch).where(
                and_(SavedSearch.user_id == user_id, SavedSearch.name == name)
            )
        )
        return result.scalar_one_or_none()

    async def update_last_run(self, search_id: UUID, match_count: int):
        search = await self.get_by_id(search_id)
        if search:
            search.last_run_at = datetime.now(timezone.utc)
            search.match_count = match_count
            await self.session.commit()

    async def delete_saved_search(self, search_id: UUID) -> bool:
        search = await self.get_by_id(search_id)
        if search:
            await self.session.delete(search)
            await self.session.commit()
            return True
        return False


class SearchAnalyticsRepository(BaseRepository[SearchAnalytics]):
    def __init__(self, session: AsyncSession):
        super().__init__(SearchAnalytics, session)

    async def record_daily_stats(self, stats: dict) -> SearchAnalytics:
        date = stats.get("date", datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0))

        existing = await self.session.execute(
            select(SearchAnalytics).where(SearchAnalytics.date == date)
        )
        analytics = existing.scalar_one_or_none()

        if analytics:
            analytics.total_queries = stats.get("total_queries", analytics.total_queries)
            analytics.unique_users = stats.get("unique_users", analytics.unique_users)
            analytics.avg_latency_ms = stats.get("avg_latency_ms", analytics.avg_latency_ms)
            analytics.p95_latency_ms = stats.get("p95_latency_ms", analytics.p95_latency_ms)
            analytics.p99_latency_ms = stats.get("p99_latency_ms", analytics.p99_latency_ms)
            analytics.zero_result_queries = stats.get("zero_result_queries", analytics.zero_result_queries)
            analytics.cached_queries = stats.get("cached_queries", analytics.cached_queries)
            analytics.top_queries = stats.get("top_queries", analytics.top_queries)
            analytics.top_filters = stats.get("top_filters", analytics.top_filters)
            analytics.index_size_bytes = stats.get("index_size_bytes", analytics.index_size_bytes)
            analytics.index_doc_count = stats.get("index_doc_count", analytics.index_doc_count)
        else:
            analytics = SearchAnalytics(date=date, **stats)
            self.session.add(analytics)

        await self.session.commit()
        return analytics

    async def get_analytics(self, days: int = 30) -> list[SearchAnalytics]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        result = await self.session.execute(
            select(SearchAnalytics)
            .where(SearchAnalytics.date >= cutoff)
            .order_by(SearchAnalytics.date.desc())
        )
        return list(result.scalars().all())

    async def get_summary(self, days: int = 30) -> dict:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        result = await self.session.execute(
            select(
                func.sum(SearchAnalytics.total_queries).label("total"),
                func.avg(SearchAnalytics.avg_latency_ms).label("avg_latency"),
                func.avg(SearchAnalytics.cached_queries * 100.0 / func.nullif(SearchAnalytics.total_queries, 0)).label("cache_hit"),
                func.avg(SearchAnalytics.zero_result_queries * 100.0 / func.nullif(SearchAnalytics.total_queries, 0)).label("zero_result"),
                func.max(SearchAnalytics.index_doc_count).label("doc_count"),
            ).where(SearchAnalytics.date >= cutoff)
        )
        row = result.one()
        return {
            "total_queries": row.total or 0,
            "avg_latency_ms": round(row.avg_latency or 0, 2),
            "cache_hit_ratio": round(row.cache_hit or 0, 2),
            "zero_result_ratio": round(row.zero_result or 0, 2),
            "document_count": row.doc_count or 0,
        }


class IndexJobRepository(BaseRepository[IndexJob]):
    def __init__(self, session: AsyncSession):
        super().__init__(IndexJob, session)

    async def create_job(
        self, job_type, user_id=None, total_documents=0, metadata=None
    ) -> IndexJob:
        job = IndexJob(
            job_type=job_type,
            user_id=str(user_id) if user_id else None,
            total_documents=total_documents,
            metadata_=metadata or {},
        )
        self.session.add(job)
        await self.session.commit()
        return job

    async def update_job_status(
        self, job_id, status, indexed=None, failed=None, error_message=None
    ) -> IndexJob | None:
        job = await self.get_by_id(job_id)
        if job:
            job.status = status
            if indexed is not None:
                job.indexed_documents = indexed
            if failed is not None:
                job.failed_documents = failed
            if error_message:
                job.error_message = error_message
            if status == IndexJobStatus.RUNNING.value:
                job.started_at = datetime.now(timezone.utc)
            elif status in (IndexJobStatus.COMPLETED.value, IndexJobStatus.FAILED.value):
                job.completed_at = datetime.now(timezone.utc)
            await self.session.commit()
        return job

    async def get_active_jobs(self) -> list[IndexJob]:
        result = await self.session.execute(
            select(IndexJob).where(
                IndexJob.status.in_([IndexJobStatus.PENDING.value, IndexJobStatus.RUNNING.value])
            ).order_by(IndexJob.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_user_jobs(self, user_id: str, limit: int = 10) -> list[IndexJob]:
        result = await self.session.execute(
            select(IndexJob)
            .where(IndexJob.user_id == user_id)
            .order_by(IndexJob.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_recent_jobs(self, limit: int = 20) -> list[IndexJob]:
        result = await self.session.execute(
            select(IndexJob).order_by(IndexJob.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())


class QuerySuggestionRepository(BaseRepository[QuerySuggestion]):
    def __init__(self, session: AsyncSession):
        super().__init__(QuerySuggestion, session)

    async def record_query(self, query_text: str, user_id: str = None):
        existing = await self.session.execute(
            select(QuerySuggestion).where(
                and_(
                    QuerySuggestion.query_text == query_text,
                    QuerySuggestion.user_id == user_id,
                )
            )
        )
        suggestion = existing.scalar_one_or_none()

        if suggestion:
            suggestion.frequency += 1
            suggestion.last_used_at = datetime.now(timezone.utc)
        else:
            suggestion = QuerySuggestion(
                query_text=query_text,
                user_id=user_id,
            )
            self.session.add(suggestion)

        await self.session.commit()

    async def get_suggestions(self, prefix: str, limit: int = 10) -> list[str]:
        result = await self.session.execute(
            select(QuerySuggestion.query_text)
            .where(QuerySuggestion.query_text.ilike(f"%{prefix}%"))
            .order_by(QuerySuggestion.frequency.desc())
            .limit(limit)
        )
        return [row[0] for row in result.all()]
