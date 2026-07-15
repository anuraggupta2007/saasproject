import json
from datetime import datetime, timezone
from typing import Any

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)

EMAIL_INDEX_MAPPING = {
    "mappings": {
        "properties": {
            "user_id": {"type": "keyword"},
            "subject": {
                "type": "text",
                "analyzer": "standard",
                "fields": {
                    "keyword": {"type": "keyword"},
                    "autocomplete": {
                        "type": "text",
                        "analyzer": "standard",
                        "search_analyzer": "standard",
                    },
                },
            },
            "sender": {
                "type": "text",
                "fields": {
                    "keyword": {"type": "keyword"},
                    "autocomplete": {
                        "type": "text",
                        "analyzer": "standard",
                    },
                },
            },
            "recipients": {
                "type": "text",
                "fields": {
                    "keyword": {"type": "keyword"},
                },
            },
            "cc": {"type": "text"},
            "bcc": {"type": "text"},
            "body_text": {
                "type": "text",
                "analyzer": "standard",
            },
            "body_html": {
                "type": "text",
                "analyzer": "standard",
            },
            "date": {"type": "date"},
            "message_id": {"type": "keyword"},
            "folder": {
                "type": "keyword",
                "fields": {
                    "text": {"type": "text"},
                },
            },
            "labels": {"type": "keyword"},
            "tags": {"type": "keyword"},
            "attachments": {
                "type": "nested",
                "properties": {
                    "filename": {
                        "type": "text",
                        "fields": {
                            "keyword": {"type": "keyword"},
                        },
                    },
                    "mime_type": {"type": "keyword"},
                    "size_bytes": {"type": "long"},
                },
            },
            "attachment_names": {
                "type": "text",
                "fields": {
                    "keyword": {"type": "keyword"},
                },
            },
            "has_attachments": {"type": "boolean"},
            "attachment_count": {"type": "integer"},
            "size_bytes": {"type": "long"},
            "conversion_status": {"type": "keyword"},
            "metadata": {"type": "object", "enabled": False},
            "indexed_at": {"type": "date"},
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 1,
        "analysis": {
            "analyzer": {
                "email_analyzer": {
                    "type": "custom",
                    "tokenizer": "uax_url_email",
                    "filter": ["lowercase", "stop"],
                }
            }
        },
    },
}


class ElasticsearchClient:
    def __init__(self):
        self._client = None
        self._opensearch_client = None
        self.index_name = "email_converter"
        self._use_fallback = False

    async def connect(self):
        try:
            from opensearchpy import AsyncOpenSearch

            self._opensearch_client = AsyncOpenSearch(
                hosts=[{"host": "localhost", "port": 9200}],
                http_compress=True,
                use_ssl=False,
                verify_certs=False,
                ssl_assert_hostname=False,
                ssl_show_warn=False,
            )
            await self._opensearch_client.info()
            logger.info("opensearch_connected")
            return
        except Exception as e:
            logger.warning("opensearch_not_available", extra={"error": str(e)})

        try:
            from elasticsearch import AsyncElasticsearch

            self._client = AsyncElasticsearch(
                hosts=["http://localhost:9200"],
                request_timeout=30,
            )
            await self._client.info()
            logger.info("elasticsearch_connected")
        except Exception as e:
            logger.warning("elasticsearch_not_available", extra={"error": str(e)})
            self._use_fallback = True
            logger.info("using_postgresql_fts_fallback")

    async def close(self):
        if self._client:
            await self._client.close()
        if self._opensearch_client:
            await self._opensearch_client.close()

    @property
    def client(self):
        return self._opensearch_client or self._client

    @property
    def is_available(self) -> bool:
        return not self._use_fallback and self.client is not None

    async def create_index(self, index_name: str = None):
        index = index_name or self.index_name
        if not self.is_available:
            return False

        exists = await self.client.indices.exists(index=index)
        if not exists:
            await self.client.indices.create(
                index=index,
                body=EMAIL_INDEX_MAPPING,
            )
            logger.info("index_created", extra={"index": index})
        return True

    async def delete_index(self, index_name: str = None):
        index = index_name or self.index_name
        if not self.is_available:
            return False

        exists = await self.client.indices.exists(index=index)
        if exists:
            await self.client.indices.delete(index=index)
            logger.info("index_deleted", extra={"index": index})
        return True

    async def index_document(self, document: dict, doc_id: str = None, index_name: str = None):
        index = index_name or self.index_name
        if not self.is_available:
            return None

        document["indexed_at"] = datetime.now(timezone.utc).isoformat()

        result = await self.client.index(
            index=index,
            id=doc_id,
            body=document,
            refresh="wait_for",
        )
        return result

    async def bulk_index(self, documents: list[dict], index_name: str = None) -> dict:
        index = index_name or self.index_name
        if not self.is_available:
            return {"success": 0, "failed": 0, "errors": []}

        actions = []
        for doc in documents:
            doc_id = doc.pop("id", None)
            doc["indexed_at"] = datetime.now(timezone.utc).isoformat()
            actions.append({"index": {"_index": index, "_id": doc_id}})
            actions.append(doc)

        result = await self.client.bulk(body=actions, refresh="wait_for")

        errors = []
        if result.get("errors"):
            for item in result.get("items", []):
                if item.get("index", {}).get("error"):
                    errors.append(item["index"]["error"].get("reason", "unknown"))

        return {
            "success": len(documents) - len(errors),
            "failed": len(errors),
            "errors": errors,
        }

    async def delete_document(self, doc_id: str, index_name: str = None):
        index = index_name or self.index_name
        if not self.is_available:
            return False

        await self.client.delete(index=index, id=doc_id, refresh="wait_for")
        return True

    async def search(self, query: dict, index_name: str = None) -> dict:
        index = index_name or self.index_name
        if not self.is_available:
            return {"hits": {"hits": [], "total": {"value": 0}}}

        result = await self.client.search(index=index, body=query)
        return result

    async def get_index_stats(self, index_name: str = None) -> dict:
        index = index_name or self.index_name
        if not self.is_available:
            return {"doc_count": 0, "size_bytes": 0}

        try:
            stats = await self.client.indices.stats(index=index)
            index_stats = stats.get("indices", {}).get(index, {})
            primaries = index_stats.get("primaries", {})

            return {
                "doc_count": primaries.get("docs", {}).get("count", 0),
                "size_bytes": primaries.get("store", {}).get("size_in_bytes", 0),
                "search_total": primaries.get("search", {}).get("total", {}).get("queries", 0),
                "search_latency_avg": primaries.get("search", {}).get("total", {}).get("query_time_in_millis", 0),
            }
        except Exception as e:
            logger.error("index_stats_error", extra={"error": str(e)})
            return {"doc_count": 0, "size_bytes": 0}

    async def health_check(self) -> dict:
        if not self.is_available:
            return {"status": "fallback", "backend": "postgresql"}

        try:
            info = await self.client.info()
            return {
                "status": "healthy",
                "backend": "opensearch" if self._opensearch_client else "elasticsearch",
                "version": info.get("version", {}).get("number", "unknown"),
                "cluster_name": info.get("cluster_name", "unknown"),
            }
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
