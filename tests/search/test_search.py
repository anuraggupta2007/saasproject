import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.modules.search.models.search import (
    IndexJobStatus,
    IndexJobType,
)
from src.modules.search.schemas.search import (
    SearchQueryRequest,
    SearchFilters,
    SearchHit,
    SearchResponse,
    AutocompleteRequest,
    AutocompleteResponse,
    SavedSearchCreateRequest,
    IndexDocumentRequest,
    BulkIndexRequest,
    IndexStatusResponse,
    SearchAnalyticsSummaryResponse,
)
from src.modules.search.services.indexing_service import IndexingService
from src.modules.search.services.search_service import SearchService
from src.modules.search.services.cache_service import SearchCacheService


class TestModels:
    def test_index_job_status_values(self):
        assert IndexJobStatus.PENDING.value == "pending"
        assert IndexJobStatus.RUNNING.value == "running"
        assert IndexJobStatus.COMPLETED.value == "completed"
        assert IndexJobStatus.FAILED.value == "failed"

    def test_index_job_type_values(self):
        assert IndexJobType.FULL_REINDEX.value == "full_reindex"
        assert IndexJobType.INCREMENTAL.value == "incremental"
        assert IndexJobType.SINGLE_DOCUMENT.value == "single_document"


class TestSchemas:
    def test_search_query_request(self):
        request = SearchQueryRequest(query="test search")
        assert request.query == "test search"
        assert request.page == 1
        assert request.page_size == 20
        assert request.sort_by == "relevance"

    def test_search_filters(self):
        filters = SearchFilters(
            sender="test@example.com",
            folder="inbox",
            labels=["important"],
        )
        assert filters.sender == "test@example.com"
        assert filters.folder == "inbox"
        assert "important" in filters.labels

    def test_autocomplete_request(self):
        request = AutocompleteRequest(prefix="test", field="subject")
        assert request.prefix == "test"
        assert request.field == "subject"
        assert request.limit == 10

    def test_saved_search_create(self):
        request = SavedSearchCreateRequest(
            name="My Search",
            query="important emails",
            filters={"folder": "inbox"},
        )
        assert request.name == "My Search"
        assert request.query == "important emails"

    def test_index_document_request(self):
        request = IndexDocumentRequest(
            document_id="doc123",
            user_id="user123",
            subject="Test Email",
            sender="test@example.com",
        )
        assert request.document_id == "doc123"
        assert request.subject == "Test Email"

    def test_bulk_index_request(self):
        docs = [
            IndexDocumentRequest(document_id=f"doc{i}", user_id="user1", subject=f"Email {i}")
            for i in range(3)
        ]
        request = BulkIndexRequest(documents=docs)
        assert len(request.documents) == 3


class TestIndexingService:
    def test_sanitize_html(self):
        service = IndexingService.__new__(IndexingService)
        html = "<html><body><p>Hello World</p><script>alert('xss')</script></body></html>"
        result = service.sanitize_html(html)
        assert "Hello World" in result
        assert "<script>" not in result

    def test_sanitize_html_empty(self):
        service = IndexingService.__new__(IndexingService)
        assert service.sanitize_html("") == ""
        assert service.sanitize_html(None) == ""

    def test_prepare_document(self):
        service = IndexingService.__new__(IndexingService)
        data = {
            "document_id": "doc1",
            "user_id": "user1",
            "subject": "Test",
            "sender": "test@example.com",
            "body_html": "<p>Hello</p>",
            "attachments": [{"filename": "test.pdf", "mime_type": "application/pdf"}],
        }
        doc = service.prepare_document(data)
        assert doc["subject"] == "Test"
        assert doc["has_attachments"] is True
        assert doc["attachment_count"] == 1
        assert "test.pdf" in doc["attachment_names"]


class TestSearchService:
    def test_build_query_basic(self):
        service = SearchService.__new__(SearchService)
        query = service._build_query("test query", user_id="user1")
        assert "bool" in query
        assert len(query["bool"]["must"]) > 0

    def test_build_query_with_filters(self):
        service = SearchService.__new__(SearchService)
        filters = {
            "sender": "test@example.com",
            "folder": "inbox",
            "labels": ["important"],
        }
        query = service._build_query("test", filters=filters, user_id="user1")
        assert "filter" in query["bool"]

    def test_build_sort_relevance(self):
        service = SearchService.__new__(SearchService)
        sort = service._build_sort("relevance", "desc")
        assert sort == [{"_score": {"order": "desc"}}]

    def test_build_sort_date(self):
        service = SearchService.__new__(SearchService)
        sort = service._build_sort("date", "desc")
        assert sort == [{"date": {"order": "desc"}}]

    def test_build_highlight(self):
        service = SearchService.__new__(SearchService)
        highlight = service._build_highlight()
        assert "fields" in highlight
        assert "subject" in highlight["fields"]

    def test_parse_hit(self):
        service = SearchService.__new__(SearchService)
        hit = {
            "_id": "doc1",
            "_score": 1.5,
            "_source": {
                "subject": "Test Email",
                "sender": "test@example.com",
                "recipients": ["user@example.com"],
                "has_attachments": False,
            },
            "highlight": {
                "subject": ["<mark>Test</mark> Email"],
            },
        }
        parsed = service._parse_hit(hit)
        assert parsed["id"] == "doc1"
        assert parsed["score"] == 1.5
        assert parsed["subject"] == "Test Email"


class TestCacheService:
    def test_make_key(self):
        service = SearchCacheService.__new__(SearchCacheService)
        key = service._make_key("test query", "user1", {"folder": "inbox"}, 1)
        assert key.startswith("search:cache:")
        assert len(key) > 20

    def test_make_key_different_queries(self):
        service = SearchCacheService.__new__(SearchCacheService)
        key1 = service._make_key("query1", "user1")
        key2 = service._make_key("query2", "user1")
        assert key1 != key2
