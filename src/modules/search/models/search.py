import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, DateTime, Boolean, Integer, Float, Text, JSON, Index
)
from src.models.base import Base, BaseModelMixin


class IndexJobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class IndexJobType(str, enum.Enum):
    FULL_REINDEX = "full_reindex"
    INCREMENTAL = "incremental"
    DELETE_STALE = "delete_stale"
    SINGLE_DOCUMENT = "single_document"


class SearchHistory(Base, BaseModelMixin):
    __tablename__ = "search_history"

    user_id = Column(String(36), nullable=False, index=True)
    query = Column(Text, nullable=False)
    filters = Column(JSON, default=dict)
    results_count = Column(Integer, default=0)
    latency_ms = Column(Float, default=0)
    page = Column(Integer, default=1)
    page_size = Column(Integer, default=20)
    sort_by = Column(String(50), default="relevance")
    clicked_result_id = Column(String(36))
    ip_address = Column(String(45))

    __table_args__ = (
        Index("ix_search_history_user_created", "user_id", "created_at"),
    )


class SavedSearch(Base, BaseModelMixin):
    __tablename__ = "search_saved"

    user_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    query = Column(Text, nullable=False)
    filters = Column(JSON, default=dict)
    sort_by = Column(String(50), default="relevance")
    notify_on_match = Column(Boolean, default=False)
    last_run_at = Column(DateTime(timezone=True))
    match_count = Column(Integer, default=0)

    __table_args__ = (
        Index("ix_search_saved_user_name", "user_id", "name", unique=True),
    )


class SearchAnalytics(Base, BaseModelMixin):
    __tablename__ = "search_analytics"

    date = Column(DateTime(timezone=True), nullable=False)
    total_queries = Column(Integer, default=0)
    unique_users = Column(Integer, default=0)
    avg_latency_ms = Column(Float, default=0)
    p95_latency_ms = Column(Float, default=0)
    p99_latency_ms = Column(Float, default=0)
    zero_result_queries = Column(Integer, default=0)
    cached_queries = Column(Integer, default=0)
    top_queries = Column(JSON, default=list)
    top_filters = Column(JSON, default=list)
    index_size_bytes = Column(Integer, default=0)
    index_doc_count = Column(Integer, default=0)

    __table_args__ = (
        Index("ix_search_analytics_date", "date", unique=True),
    )


class IndexJob(Base, BaseModelMixin):
    __tablename__ = "search_index_jobs"

    job_type = Column(String(50), nullable=False)
    status = Column(String(20), default=IndexJobStatus.PENDING.value, nullable=False)
    user_id = Column(String(36), index=True)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    total_documents = Column(Integer, default=0)
    indexed_documents = Column(Integer, default=0)
    failed_documents = Column(Integer, default=0)
    error_message = Column(Text)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("ix_search_index_jobs_status", "status"),
        Index("ix_search_index_jobs_type_status", "job_type", "status"),
    )


class QuerySuggestion(Base, BaseModelMixin):
    __tablename__ = "search_suggestions"

    query_text = Column(String(500), nullable=False, index=True)
    frequency = Column(Integer, default=1)
    user_id = Column(String(36), index=True)
    last_used_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_search_suggestions_text_freq", "query_text", "frequency"),
    )
