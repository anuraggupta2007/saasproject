import time
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.core.config import settings
from src.modules.search.services.elasticsearch_client import ElasticsearchClient
from src.modules.search.repositories.search import (
    SearchHistoryRepository,
    QuerySuggestionRepository,
)

logger = get_logger(__name__)


class SearchService:
    def __init__(self, session: AsyncSession, es_client: ElasticsearchClient):
        self.session = session
        self.es = es_client
        self.history_repo = SearchHistoryRepository(session)
        self.suggestion_repo = QuerySuggestionRepository(session)

    def _build_query(
        self,
        query: str,
        filters: dict = None,
        user_id: str = None,
    ) -> dict:
        must = []
        filter_clauses = []

        if user_id:
            filter_clauses.append({"term": {"user_id": user_id}})

        if query:
            must.append({
                "multi_match": {
                    "query": query,
                    "fields": [
                        "subject^3",
                        "subject.autocomplete^2",
                        "sender^2",
                        "sender.autocomplete",
                        "recipients",
                        "body_text",
                        "attachment_names",
                        "tags",
                        "labels",
                        "folder.text",
                    ],
                    "type": "best_fields",
                    "fuzziness": "AUTO",
                    "prefix_length": 2,
                }
            })

        if filters:
            if filters.get("date_from") or filters.get("date_to"):
                range_clause = {}
                if filters.get("date_from"):
                    range_clause["gte"] = filters["date_from"]
                if filters.get("date_to"):
                    range_clause["lte"] = filters["date_to"]
                filter_clauses.append({"range": {"date": range_clause}})

            if filters.get("sender"):
                must.append({"match_phrase": {"sender": filters["sender"]}})

            if filters.get("recipient"):
                must.append({"match_phrase": {"recipients": filters["recipient"]}})

            if filters.get("subject"):
                must.append({"match_phrase": {"subject": filters["subject"]}})

            if filters.get("folder"):
                filter_clauses.append({"term": {"folder": filters["folder"]}})

            if filters.get("labels"):
                filter_clauses.append({"terms": {"labels": filters["labels"]}})

            if filters.get("tags"):
                filter_clauses.append({"terms": {"tags": filters["tags"]}})

            if filters.get("conversion_status"):
                filter_clauses.append({"term": {"conversion_status": filters["conversion_status"]}})

            if filters.get("has_attachments") is not None:
                filter_clauses.append({"term": {"has_attachments": filters["has_attachments"]}})

            if filters.get("attachment_type"):
                filter_clauses.append({
                    "nested": {
                        "path": "attachments",
                        "query": {"term": {"attachments.mime_type": filters["attachment_type"]}},
                    }
                })

            if filters.get("attachment_min_size") or filters.get("attachment_max_size"):
                size_range = {}
                if filters.get("attachment_min_size"):
                    size_range["gte"] = filters["attachment_min_size"]
                if filters.get("attachment_max_size"):
                    size_range["lte"] = filters["attachment_max_size"]
                filter_clauses.append({
                    "nested": {
                        "path": "attachments",
                        "query": {"range": {"attachments.size_bytes": size_range}},
                    }
                })

            if filters.get("email_min_size") or filters.get("email_max_size"):
                size_range = {}
                if filters.get("email_min_size"):
                    size_range["gte"] = filters["email_min_size"]
                if filters.get("email_max_size"):
                    size_range["lte"] = filters["email_max_size"]
                filter_clauses.append({"range": {"size_bytes": size_range}})

        bool_query = {"must": must if must else [{"match_all": {}}]}
        if filter_clauses:
            bool_query["filter"] = filter_clauses

        return {"bool": bool_query}

    def _build_sort(self, sort_by: str, sort_order: str) -> list:
        order = sort_order if sort_order in ("asc", "desc") else "desc"

        sort_map = {
            "relevance": "_score",
            "date": "date",
            "subject": "subject.keyword",
            "sender": "sender.keyword",
            "size": "size_bytes",
        }

        field = sort_map.get(sort_by, "_score")

        if field == "_score":
            return [{"_score": {"order": "desc"}}]
        return [{field: {"order": order}}]

    def _build_highlight(self) -> dict:
        return {
            "pre_tags": ["<mark>"],
            "post_tags": ["</mark>"],
            "fields": {
                "subject": {"number_of_fragments": 1},
                "body_text": {
                    "fragment_size": 200,
                    "number_of_fragments": 3,
                },
                "sender": {"number_of_fragments": 1},
                "attachment_names": {"number_of_fragments": 1},
            },
        }

    def _parse_hit(self, hit: dict) -> dict:
        source = hit.get("_source", {})
        highlights = hit.get("highlight", {})

        snippet = None
        if "body_text" in highlights:
            snippet = highlights["body_text"][0]
        elif "subject" in highlights:
            snippet = highlights["subject"][0]

        return {
            "id": hit.get("_id"),
            "score": hit.get("_score", 0),
            "subject": source.get("subject"),
            "sender": source.get("sender"),
            "recipients": source.get("recipients", []),
            "date": source.get("date"),
            "snippet": snippet,
            "highlights": highlights,
            "folder": source.get("folder"),
            "labels": source.get("labels", []),
            "tags": source.get("tags", []),
            "has_attachments": source.get("has_attachments", False),
            "attachment_count": source.get("attachment_count", 0),
            "attachment_names": source.get("attachment_names", []),
            "size_bytes": source.get("size_bytes", 0),
            "conversion_status": source.get("conversion_status"),
            "metadata": source.get("metadata", {}),
        }

    async def search(
        self,
        query: str,
        user_id: str,
        filters: dict = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "relevance",
        sort_order: str = "desc",
        highlight: bool = True,
    ) -> dict:
        start_time = time.time()

        if not self.es.is_available:
            return await self._fallback_search(
                query, user_id, filters, page, page_size, sort_by, sort_order
            )

        query_body = self._build_query(query, filters, user_id)
        sort = self._build_sort(sort_by, sort_order)
        from_offset = (page - 1) * page_size

        search_body = {
            "query": query_body,
            "sort": sort,
            "from": from_offset,
            "size": page_size,
        }

        if highlight:
            search_body["highlight"] = self._build_highlight()

        try:
            result = await self.es.search(search_body)
        except Exception as e:
            logger.error("search_failed", extra={"error": str(e)})
            return {
                "query": query,
                "total_hits": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
                "hits": [],
                "latency_ms": round((time.time() - start_time) * 1000, 2),
                "max_score": 0,
                "cached": False,
            }

        hits_data = result.get("hits", {})
        total_hits = hits_data.get("total", {}).get("value", 0)
        max_score = hits_data.get("max_score", 0) or 0
        raw_hits = hits_data.get("hits", [])

        hits = [self._parse_hit(h) for h in raw_hits]
        total_pages = (total_hits + page_size - 1) // page_size if total_hits > 0 else 0

        latency_ms = round((time.time() - start_time) * 1000, 2)

        query_id = str(uuid.uuid4())

        await self.history_repo.record_search(
            user_id=user_id,
            query=query,
            results_count=total_hits,
            latency_ms=latency_ms,
            filters=filters,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
        )

        await self.suggestion_repo.record_query(query, user_id)

        return {
            "query": query,
            "total_hits": total_hits,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "hits": hits,
            "latency_ms": latency_ms,
            "max_score": max_score,
            "query_id": query_id,
            "cached": False,
        }

    async def _fallback_search(
        self,
        query: str,
        user_id: str,
        filters: dict = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "relevance",
        sort_order: str = "desc",
    ) -> dict:
        from sqlalchemy import text

        start_time = time.time()

        search_query = f"%{query}%"
        sql = """
            SELECT id, subject, sender, recipients, date, body_text,
                   ts_rank(to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(body_text, '')),
                           plainto_tsquery('english', :query)) as rank
            FROM emails
            WHERE user_id = :user_id
              AND to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(body_text, ''))
                  @@ plainto_tsquery('english', :query)
            ORDER BY rank DESC
            LIMIT :limit OFFSET :offset
        """

        try:
            result = await self.session.execute(
                text(sql),
                {
                    "query": query,
                    "user_id": user_id,
                    "limit": page_size,
                    "offset": (page - 1) * page_size,
                },
            )
            rows = result.fetchall()

            count_sql = """
                SELECT COUNT(*)
                FROM emails
                WHERE user_id = :user_id
                  AND to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(body_text, ''))
                      @@ plainto_tsquery('english', :query)
            """
            count_result = await self.session.execute(
                text(count_sql), {"query": query, "user_id": user_id}
            )
            total_hits = count_result.scalar() or 0

            hits = []
            for row in rows:
                hits.append({
                    "id": str(row[0]),
                    "score": float(row[6]) if row[6] else 0,
                    "subject": row[1],
                    "sender": row[2],
                    "recipients": row[3] or [],
                    "date": row[4].isoformat() if row[4] else None,
                    "snippet": (row[5] or "")[:200],
                    "highlights": {},
                    "folder": None,
                    "labels": [],
                    "tags": [],
                    "has_attachments": False,
                    "attachment_count": 0,
                    "attachment_names": [],
                    "size_bytes": 0,
                    "conversion_status": None,
                    "metadata": {},
                })

            latency_ms = round((time.time() - start_time) * 1000, 2)
            total_pages = (total_hits + page_size - 1) // page_size if total_hits > 0 else 0

            return {
                "query": query,
                "total_hits": total_hits,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "hits": hits,
                "latency_ms": latency_ms,
                "max_score": max(h["score"] for h in hits) if hits else 0,
                "query_id": str(uuid.uuid4()),
                "cached": False,
                "fallback": True,
            }

        except Exception as e:
            logger.error("fallback_search_failed", extra={"error": str(e)})
            return {
                "query": query,
                "total_hits": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
                "hits": [],
                "latency_ms": round((time.time() - start_time) * 1000, 2),
                "max_score": 0,
                "cached": False,
                "error": str(e),
            }
