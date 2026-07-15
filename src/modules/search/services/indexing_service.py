import re
from datetime import datetime, timezone
from html import unescape
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.search.services.elasticsearch_client import ElasticsearchClient
from src.modules.search.repositories.search import IndexJobRepository
from src.modules.search.models.search import IndexJobStatus, IndexJobType

logger = get_logger(__name__)


class IndexingService:
    def __init__(self, session: AsyncSession, es_client: ElasticsearchClient):
        self.session = session
        self.es = es_client
        self.job_repo = IndexJobRepository(session)

    def sanitize_html(self, html: str) -> str:
        if not html:
            return ""
        text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = unescape(text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def prepare_document(self, data: dict) -> dict:
        body_html = data.get("body_html", "")
        body_text = data.get("body_text", "")

        if body_html and not body_text:
            body_text = self.sanitize_html(body_html)

        attachments = data.get("attachments", [])
        attachment_names = [a.get("filename", "") for a in attachments]

        return {
            "user_id": data.get("user_id"),
            "subject": data.get("subject", ""),
            "sender": data.get("sender", ""),
            "recipients": data.get("recipients", []),
            "cc": data.get("cc", []),
            "bcc": data.get("bcc", []),
            "body_text": body_text,
            "body_html": body_html,
            "date": data.get("date", datetime.now(timezone.utc).isoformat()),
            "message_id": data.get("message_id", ""),
            "folder": data.get("folder", ""),
            "labels": data.get("labels", []),
            "tags": data.get("tags", []),
            "attachments": attachments,
            "attachment_names": attachment_names,
            "has_attachments": len(attachments) > 0,
            "attachment_count": len(attachments),
            "size_bytes": data.get("size_bytes", 0),
            "conversion_status": data.get("conversion_status"),
            "metadata": data.get("metadata", {}),
        }

    async def index_document(self, document_data: dict) -> dict:
        doc_id = document_data.get("document_id")
        if not doc_id:
            return {"success": False, "error": "No document_id provided"}

        if not self.es.is_available:
            return {"success": False, "error": "Search engine not available"}

        try:
            prepared = self.prepare_document(document_data)
            result = await self.es.index_document(prepared, doc_id=doc_id)
            logger.info("document_indexed", extra={"doc_id": doc_id})
            return {"success": True, "doc_id": doc_id, "result": result}
        except Exception as e:
            logger.error("index_document_failed", extra={"doc_id": doc_id, "error": str(e)})
            return {"success": False, "error": str(e)}

    async def bulk_index_documents(self, documents: list[dict]) -> dict:
        if not self.es.is_available:
            return {"indexed": 0, "failed": len(documents), "errors": ["Search engine not available"]}

        try:
            prepared_docs = []
            for doc in documents:
                p = self.prepare_document(doc)
                p["id"] = doc.get("document_id")
                prepared_docs.append(p)

            result = await self.es.bulk_index(prepared_docs)

            logger.info(
                "bulk_index_completed",
                extra={"total": len(documents), "indexed": result["success"], "failed": result["failed"]},
            )

            return {
                "indexed": result["success"],
                "failed": result["failed"],
                "errors": result["errors"],
            }
        except Exception as e:
            logger.error("bulk_index_failed", extra={"error": str(e)})
            return {"indexed": 0, "failed": len(documents), "errors": [str(e)]}

    async def delete_document(self, doc_id: str) -> dict:
        if not self.es.is_available:
            return {"success": False, "error": "Search engine not available"}

        try:
            await self.es.delete_document(doc_id)
            logger.info("document_deleted", extra={"doc_id": doc_id})
            return {"success": True, "doc_id": doc_id}
        except Exception as e:
            logger.error("delete_document_failed", extra={"doc_id": doc_id, "error": str(e)})
            return {"success": False, "error": str(e)}

    async def create_reindex_job(
        self, job_type: str, user_id: str = None, total_documents: int = 0
    ) -> str:
        job = await self.job_repo.create_job(
            job_type=job_type,
            user_id=user_id,
            total_documents=total_documents,
        )
        return str(job.id)

    async def update_job_progress(
        self, job_id: str, indexed: int, failed: int = 0
    ):
        await self.job_repo.update_job_status(
            job_id,
            IndexJobStatus.RUNNING.value,
            indexed=indexed,
            failed=failed,
        )

    async def complete_job(self, job_id: str, success: bool = True, error: str = None):
        status = IndexJobStatus.COMPLETED.value if success else IndexJobStatus.FAILED.value
        await self.job_repo.update_job_status(
            job_id,
            status,
            error_message=error,
        )

    async def get_index_status(self) -> dict:
        stats = await self.es.get_index_stats()
        health = await self.es.health_check()

        size_bytes = stats.get("size_bytes", 0)
        if size_bytes >= 1024**3:
            size_human = f"{size_bytes / 1024**3:.2f} GB"
        elif size_bytes >= 1024**2:
            size_human = f"{size_bytes / 1024**2:.2f} MB"
        elif size_bytes >= 1024:
            size_human = f"{size_bytes / 1024:.2f} KB"
        else:
            size_human = f"{size_bytes} B"

        return {
            "index_name": self.es.index_name,
            "document_count": stats.get("doc_count", 0),
            "index_size_bytes": size_bytes,
            "index_size_human": size_human,
            "health": health.get("status", "unknown"),
            "backend": health.get("backend", "unknown"),
            "version": health.get("version"),
            "cluster_name": health.get("cluster_name"),
        }

    async def retry_failed_documents(self, job_id: str, documents: list[dict]) -> dict:
        job = await self.job_repo.get_by_id(job_id)
        if not job:
            return {"success": False, "error": "Job not found"}

        await self.job_repo.update_job_status(job_id, IndexJobStatus.RUNNING.value)

        result = await self.bulk_index_documents(documents)

        if result["failed"] == 0:
            await self.complete_job(job_id, success=True)
        else:
            await self.complete_job(
                job_id,
                success=False,
                error=f"Failed to index {result['failed']} documents",
            )

        return result
