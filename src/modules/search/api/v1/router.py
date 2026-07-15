import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.core.logging import get_logger
from src.modules.search.services.search_service import SearchService
from src.modules.search.services.indexing_service import IndexingService
from src.modules.search.services.autocomplete_service import AutocompleteService
from src.modules.search.services.cache_service import SearchCacheService
from src.modules.search.repositories.search import (
    SearchHistoryRepository,
    SavedSearchRepository,
    SearchAnalyticsRepository,
    IndexJobRepository,
)
from src.modules.search.models.search import IndexJobType
from src.modules.search.schemas.search import (
    SearchQueryRequest,
    SearchResponse,
    AutocompleteRequest,
    AutocompleteResponse,
    SearchHistoryListResponse,
    SearchHistoryResponse,
    SavedSearchCreateRequest,
    SavedSearchResponse,
    SavedSearchListResponse,
    IndexDocumentRequest,
    BulkIndexRequest,
    BulkIndexResponse,
    ReindexRequest,
    ReindexResponse,
    IndexStatusResponse,
    SearchAnalyticsResponse,
    SearchAnalyticsSummaryResponse,
    IndexJobResponse,
    IndexJobListResponse,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/search", tags=["Search"])

es_client = None
cache_client = None


def get_es_client():
    global es_client
    if es_client is None:
        from src.modules.search.services.elasticsearch_client import ElasticsearchClient
        es_client = ElasticsearchClient()
    return es_client


def get_cache_client():
    global cache_client
    if cache_client is None:
        from src.core.dependencies import get_redis_sync
        cache_client = get_redis_sync()
    return cache_client


@router.post(
    "/",
    response_model=SearchResponse,
    summary="Search emails",
)
async def search_emails(
    request: SearchQueryRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    es = get_es_client()
    cache = get_cache_client()

    if cache:
        cache_service = SearchCacheService(cache)
        cached = await cache_service.get_cached_search(
            request.query, current_user["id"], request.filters, request.page
        )
        if cached:
            return SearchResponse(**cached)

    search_service = SearchService(db, es)

    filters = request.filters.copy()
    if "user_id" not in filters:
        filters["user_id"] = current_user["id"]

    result = await search_service.search(
        query=request.query,
        user_id=current_user["id"],
        filters=filters,
        page=request.page,
        page_size=request.page_size,
        sort_by=request.sort_by,
        sort_order=request.sort_order,
        highlight=request.highlight,
    )

    if cache and not result.get("cached"):
        cache_service = SearchCacheService(cache)
        await cache_service.cache_search(
            request.query, current_user["id"], result, request.filters, request.page
        )

    return SearchResponse(**result)


@router.post(
    "/autocomplete",
    response_model=AutocompleteResponse,
    summary="Autocomplete search",
)
async def autocomplete(
    request: AutocompleteRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    es = get_es_client()
    service = AutocompleteService(db, es)

    result = await service.autocomplete(
        prefix=request.prefix,
        field=request.field,
        limit=request.limit,
        user_id=current_user["id"],
    )

    return AutocompleteResponse(**result)


@router.post(
    "/index",
    status_code=status.HTTP_201_CREATED,
    summary="Index a document",
)
async def index_document(
    request: IndexDocumentRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    es = get_es_client()
    service = IndexingService(db, es)

    document_data = request.model_dump()
    document_data["document_id"] = request.document_id
    document_data["user_id"] = current_user["id"]

    result = await service.index_document(document_data)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.post(
    "/index/bulk",
    response_model=BulkIndexResponse,
    summary="Bulk index documents",
)
async def bulk_index(
    request: BulkIndexRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    es = get_es_client()
    service = IndexingService(db, es)

    documents = []
    for doc in request.documents:
        doc_data = doc.model_dump()
        doc_data["document_id"] = doc.document_id
        doc_data["user_id"] = current_user["id"]
        documents.append(doc_data)

    result = await service.bulk_index_documents(documents)

    return BulkIndexResponse(
        total=len(request.documents),
        indexed=result["indexed"],
        failed=result["failed"],
        errors=result.get("errors", []),
        latency_ms=0,
    )


@router.post(
    "/index/delete/{doc_id}",
    summary="Delete indexed document",
)
async def delete_indexed_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    es = get_es_client()
    service = IndexingService(db, es)

    result = await service.delete_document(doc_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.post(
    "/reindex",
    response_model=ReindexResponse,
    summary="Reindex data",
)
async def reindex(
    request: ReindexRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.modules.search.tasks.celery_tasks import reindex_task

    es = get_es_client()
    service = IndexingService(db, es)

    job_type = IndexJobType.FULL_REINDEX.value if request.full else IndexJobType.INCREMENTAL.value
    job_id = await service.create_reindex_job(
        job_type=job_type,
        user_id=request.user_id or current_user["id"],
    )

    reindex_task.delay(
        job_id=job_id,
        user_id=request.user_id or current_user["id"],
        full=request.full,
    )

    return ReindexResponse(
        job_id=job_id,
        status="pending",
        message="Reindex job started",
    )


@router.get(
    "/status",
    response_model=IndexStatusResponse,
    summary="Get index status",
)
async def get_index_status(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    es = get_es_client()
    service = IndexingService(db, es)

    status_data = await service.get_index_status()
    return IndexStatusResponse(**status_data)


@router.get(
    "/history",
    response_model=SearchHistoryListResponse,
    summary="Get search history",
)
async def get_search_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SearchHistoryRepository(db)
    history, total = await repo.get_user_history(current_user["id"], page, page_size)

    return SearchHistoryListResponse(
        history=[SearchHistoryResponse.model_validate(h) for h in history],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/saved",
    response_model=SavedSearchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a search",
)
async def save_search(
    request: SavedSearchCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SavedSearchRepository(db)

    existing = await repo.get_by_name(current_user["id"], request.name)
    if existing:
        raise HTTPException(status_code=409, detail="Search with this name already exists")

    saved = await repo.create_saved_search(
        user_id=current_user["id"],
        name=request.name,
        query=request.query,
        filters=request.filters,
        sort_by=request.sort_by,
        notify_on_match=request.notify_on_match,
    )

    return SavedSearchResponse.model_validate(saved)


@router.get(
    "/saved",
    response_model=SavedSearchListResponse,
    summary="List saved searches",
)
async def list_saved_searches(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SavedSearchRepository(db)
    searches = await repo.get_user_saved_searches(current_user["id"])

    return SavedSearchListResponse(
        searches=[SavedSearchResponse.model_validate(s) for s in searches],
        total=len(searches),
    )


@router.delete(
    "/saved/{search_id}",
    summary="Delete saved search",
)
async def delete_saved_search(
    search_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SavedSearchRepository(db)
    deleted = await repo.delete_saved_search(search_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Saved search not found")
    return {"deleted": True}


@router.get(
    "/analytics",
    response_model=SearchAnalyticsSummaryResponse,
    summary="Get search analytics",
)
async def get_search_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SearchAnalyticsRepository(db)
    summary = await repo.get_summary(days)

    es = get_es_client()
    index_status = await IndexingService(db, es).get_index_status()

    return SearchAnalyticsSummaryResponse(
        period_days=days,
        total_queries=summary.get("total_queries", 0),
        avg_daily_queries=summary.get("total_queries", 0) // days if days > 0 else 0,
        avg_latency_ms=summary.get("avg_latency_ms", 0),
        cache_hit_ratio=summary.get("cache_hit_ratio", 0),
        zero_result_ratio=summary.get("zero_result_ratio", 0),
        index_health=index_status.get("health", "unknown"),
        document_count=index_status.get("document_count", 0),
    )


@router.get(
    "/jobs",
    response_model=IndexJobListResponse,
    summary="Get index jobs",
)
async def get_index_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = IndexJobRepository(db)

    if current_user.get("role") in ("super_admin", "admin"):
        jobs = await repo.get_recent_jobs(page_size)
    else:
        jobs = await repo.get_user_jobs(current_user["id"], page_size)

    return IndexJobListResponse(
        jobs=[IndexJobResponse.model_validate(j) for j in jobs],
        total=len(jobs),
    )


@router.get(
    "/popular",
    summary="Get popular searches",
)
async def get_popular_searches(
    limit: int = Query(10, ge=1, le=50),
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SearchHistoryRepository(db)
    queries = await repo.get_popular_queries(limit, days)
    return {"queries": queries}
