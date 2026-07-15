import time
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.search.services.elasticsearch_client import ElasticsearchClient
from src.modules.search.repositories.search import QuerySuggestionRepository

logger = get_logger(__name__)


class AutocompleteService:
    def __init__(self, session: AsyncSession, es_client: ElasticsearchClient):
        self.session = session
        self.es = es_client
        self.suggestion_repo = QuerySuggestionRepository(session)

    async def autocomplete(
        self,
        prefix: str,
        field: str = "all",
        limit: int = 10,
        user_id: str = None,
    ) -> dict:
        start_time = time.time()

        if not self.es.is_available:
            return await self._fallback_autocomplete(prefix, field, limit, user_id)

        field_map = {
            "all": ["subject.autocomplete", "sender.autocomplete", "recipients"],
            "subject": ["subject.autocomplete"],
            "sender": ["sender.autocomplete"],
            "recipient": ["recipients"],
            "attachment": ["attachment_names.autocomplete"],
        }

        fields = field_map.get(field, field_map["all"])

        query_body = {
            "query": {
                "bool": {
                    "must": [
                        {"multi_match": {
                            "query": prefix,
                            "fields": fields,
                            "type": "bool_prefix",
                            "fuzziness": "AUTO",
                        }}
                    ],
                    "filter": [],
                }
            },
            "size": limit,
            "_source": False,
        }

        if user_id:
            query_body["query"]["bool"]["filter"].append({"term": {"user_id": user_id}})

        try:
            result = await self.es.search(query_body)
            suggestions = []
            seen = set()

            for hit in result.get("hits", {}).get("hits", []):
                source = hit.get("_source", {})
                for f in fields:
                    parts = f.split(".")
                    value = source
                    for part in parts:
                        value = value.get(part, {}) if isinstance(value, dict) else None
                    if value and isinstance(value, str) and value not in seen:
                        suggestions.append(value)
                        seen.add(value)
                    elif value and isinstance(value, list):
                        for v in value:
                            if v not in seen:
                                suggestions.append(v)
                                seen.add(v)

            db_suggestions = await self.suggestion_repo.get_suggestions(prefix, limit)
            for s in db_suggestions:
                if s not in seen:
                    suggestions.append(s)
                    seen.add(s)

            latency_ms = round((time.time() - start_time) * 1000, 2)

            return {
                "suggestions": suggestions[:limit],
                "field": field,
                "latency_ms": latency_ms,
            }

        except Exception as e:
            logger.error("autocomplete_failed", extra={"error": str(e)})
            return {
                "suggestions": [],
                "field": field,
                "latency_ms": round((time.time() - start_time) * 1000, 2),
            }

    async def _fallback_autocomplete(
        self, prefix: str, field: str, limit: int, user_id: str
    ) -> dict:
        from sqlalchemy import text

        start_time = time.time()

        try:
            sql = """
                SELECT DISTINCT subject
                FROM emails
                WHERE user_id = :user_id
                  AND subject ILIKE :prefix
                LIMIT :limit
            """
            result = await self.session.execute(
                text(sql),
                {"user_id": user_id or "", "prefix": f"%{prefix}%", "limit": limit},
            )
            suggestions = [row[0] for row in result.fetchall() if row[0]]

            latency_ms = round((time.time() - start_time) * 1000, 2)

            return {
                "suggestions": suggestions,
                "field": field,
                "latency_ms": latency_ms,
                "fallback": True,
            }

        except Exception as e:
            return {
                "suggestions": [],
                "field": field,
                "latency_ms": round((time.time() - start_time) * 1000, 2),
            }
