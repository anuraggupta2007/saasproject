from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class SearchQueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="relevance", pattern="^(relevance|date|subject|sender|size)$")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")
    filters: dict[str, Any] = Field(default_factory=dict)
    highlight: bool = True
    include_attachments: bool = True


class SearchFilters(BaseModel):
    date_from: datetime | None = None
    date_to: datetime | None = None
    sender: str | None = None
    recipient: str | None = None
    subject: str | None = None
    attachment_type: str | None = None
    attachment_min_size: int | None = None
    attachment_max_size: int | None = None
    email_min_size: int | None = None
    email_max_size: int | None = None
    folder: str | None = None
    labels: list[str] | None = None
    tags: list[str] | None = None
    conversion_status: str | None = None
    user_id: str | None = None
    has_attachments: bool | None = None
    is_read: bool | None = None
    message_id: str | None = None


class SearchHit(BaseModel):
    id: str
    score: float
    subject: str | None = None
    sender: str | None = None
    recipients: list[str] = Field(default_factory=list)
    date: datetime | None = None
    snippet: str | None = None
    highlights: dict[str, list[str]] = Field(default_factory=dict)
    folder: str | None = None
    labels: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    has_attachments: bool = False
    attachment_count: int = 0
    attachment_names: list[str] = Field(default_factory=list)
    size_bytes: int = 0
    conversion_status: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SearchResponse(BaseModel):
    query: str
    total_hits: int
    page: int
    page_size: int
    total_pages: int
    hits: list[SearchHit]
    latency_ms: float
    max_score: float
    query_id: str | None = None
    cached: bool = False
    suggestions: list[str] = Field(default_factory=list)


class AutocompleteRequest(BaseModel):
    prefix: str = Field(min_length=1, max_length=100)
    field: str = Field(default="all", pattern="^(all|subject|sender|recipient|attachment)$")
    limit: int = Field(default=10, ge=1, le=50)
    user_id: str | None = None


class AutocompleteResponse(BaseModel):
    suggestions: list[str]
    field: str
    latency_ms: float


class SearchHistoryResponse(BaseModel):
    id: str
    query: str
    filters: dict[str, Any] = Field(default_factory=dict)
    results_count: int
    latency_ms: float
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchHistoryListResponse(BaseModel):
    history: list[SearchHistoryResponse]
    total: int
    page: int
    page_size: int


class SavedSearchCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    query: str
    filters: dict[str, Any] = Field(default_factory=dict)
    sort_by: str = "relevance"
    notify_on_match: bool = False


class SavedSearchResponse(BaseModel):
    id: str
    name: str
    query: str
    filters: dict[str, Any] = Field(default_factory=dict)
    sort_by: str
    notify_on_match: bool
    last_run_at: datetime | None = None
    match_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SavedSearchListResponse(BaseModel):
    searches: list[SavedSearchResponse]
    total: int


class IndexDocumentRequest(BaseModel):
    document_id: str
    user_id: str
    subject: str | None = None
    sender: str | None = None
    recipients: list[str] = Field(default_factory=list)
    cc: list[str] = Field(default_factory=list)
    bcc: list[str] = Field(default_factory=list)
    body_text: str | None = None
    body_html: str | None = None
    date: datetime | None = None
    message_id: str | None = None
    folder: str | None = None
    labels: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    attachments: list[dict[str, Any]] = Field(default_factory=list)
    size_bytes: int = 0
    conversion_status: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class BulkIndexRequest(BaseModel):
    documents: list[IndexDocumentRequest] = Field(min_length=1, max_length=1000)


class BulkIndexResponse(BaseModel):
    total: int
    indexed: int
    failed: int
    errors: list[str] = Field(default_factory=list)
    latency_ms: float


class ReindexRequest(BaseModel):
    user_id: str | None = None
    full: bool = True
    from_date: datetime | None = None
    to_date: datetime | None = None


class ReindexResponse(BaseModel):
    job_id: str
    status: str
    message: str


class IndexStatusResponse(BaseModel):
    index_name: str
    document_count: int
    index_size_bytes: int
    index_size_human: str
    health: str
    shards: dict[str, Any] = Field(default_factory=dict)
    last_updated: datetime | None = None


class SearchAnalyticsResponse(BaseModel):
    date: datetime
    total_queries: int
    unique_users: int
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    zero_result_queries: int
    cached_queries: int
    top_queries: list[dict[str, Any]] = Field(default_factory=list)
    top_filters: list[dict[str, Any]] = Field(default_factory=list)
    index_size_bytes: int
    index_doc_count: int


class SearchAnalyticsSummaryResponse(BaseModel):
    period_days: int
    total_queries: int
    avg_daily_queries: int
    avg_latency_ms: float
    cache_hit_ratio: float
    zero_result_ratio: float
    index_health: str
    document_count: int


class IndexJobResponse(BaseModel):
    id: str
    job_type: str
    status: str
    total_documents: int
    indexed_documents: int
    failed_documents: int
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class IndexJobListResponse(BaseModel):
    jobs: list[IndexJobResponse]
    total: int
