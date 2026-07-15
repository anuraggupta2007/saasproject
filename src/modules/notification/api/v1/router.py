import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.notification.schemas.notification import (
    NotificationCreateRequest,
    NotificationBatchRequest,
    NotificationResponse,
    NotificationListResponse,
    NotificationMarkReadRequest,
    TemplateCreateRequest,
    TemplateUpdateRequest,
    TemplateResponse,
    TemplateListResponse,
    TemplatePreviewRequest,
    TemplatePreviewResponse,
    UserPreferencesResponse,
    UserPreferencesUpdateRequest,
    NotificationStatsResponse,
    BroadcastRequest,
)
from src.modules.notification.services.notification_service import NotificationService
from src.modules.notification.services.template_service import TemplateService, UserPreferencesService
from src.modules.notification.models.notification import NotificationChannel, NotificationPriority

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post(
    "/send",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a notification",
)
async def send_notification(
    request: NotificationCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)

    notification = await service.send_notification(
        user_id=request.user_id,
        channel=NotificationChannel(request.channel),
        content=request.content,
        subject=request.subject,
        html_content=request.html_content,
        recipient=request.recipient,
        priority=NotificationPriority(request.priority),
        template_name=request.template_name,
        variables=request.variables,
        scheduled_at=request.scheduled_at,
        metadata=request.metadata,
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notification could not be sent",
        )

    return NotificationResponse.model_validate(notification)


@router.post(
    "/batch",
    status_code=status.HTTP_201_CREATED,
    summary="Send batch notifications",
)
async def send_batch(
    request: NotificationBatchRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)

    notifications_data = [
        {
            "user_id": n.user_id,
            "channel": n.channel,
            "content": n.content,
            "subject": n.subject,
            "html_content": n.html_content,
            "recipient": n.recipient,
            "priority": n.priority,
            "template_name": n.template_name,
            "variables": n.variables,
            "scheduled_at": n.scheduled_at,
            "metadata": n.metadata,
        }
        for n in request.notifications
    ]

    created = await service.send_batch(notifications_data, request.send_immediately)

    return {"sent": len(created), "total": len(request.notifications)}


@router.get(
    "/",
    response_model=NotificationListResponse,
    summary="List user notifications",
)
async def list_notifications(
    channel: str = Query(None),
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)

    channel_enum = NotificationChannel(channel) if channel else None

    notifications, total, unread_count = await service.list_user_notifications(
        user_id=uuid.UUID(current_user["id"]),
        channel=channel_enum,
        unread_only=unread_only,
        page=page,
        page_size=page_size,
    )

    return NotificationListResponse(
        notifications=[NotificationResponse.model_validate(n) for n in notifications],
        total=total,
        unread_count=unread_count,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/stats",
    response_model=NotificationStatsResponse,
    summary="Get notification statistics",
)
async def get_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    stats = await service.get_notification_stats()
    return NotificationStatsResponse(**stats)


@router.post(
    "/read",
    summary="Mark notifications as read",
)
async def mark_as_read(
    request: NotificationMarkReadRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)

    count = await service.mark_as_read(
        user_id=uuid.UUID(current_user["id"]),
        notification_ids=request.notification_ids,
    )

    return {"marked": count}


@router.post(
    "/read-all",
    summary="Mark all notifications as read",
)
async def mark_all_as_read(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)

    count = await service.mark_all_as_read(uuid.UUID(current_user["id"]))

    return {"marked": count}


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a notification",
)
async def delete_notification(
    notification_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)

    success = await service.delete_notification(
        user_id=uuid.UUID(current_user["id"]),
        notification_id=notification_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )


@router.get(
    "/templates",
    response_model=TemplateListResponse,
    summary="List templates",
)
async def list_templates(
    template_type: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TemplateService(db)
    templates, total = await service.list_templates(template_type, page, page_size)

    return TemplateListResponse(
        templates=[TemplateResponse.model_validate(t) for t in templates],
        total=total,
    )


@router.post(
    "/templates",
    response_model=TemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a template",
)
async def create_template(
    request: TemplateCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TemplateService(db)

    template = await service.create_template(
        name=request.name,
        template_type=request.template_type,
        body_text=request.body_text,
        subject=request.subject,
        body_html=request.body_html,
        variables=request.variables,
        locale=request.locale,
        metadata=request.metadata,
    )

    return TemplateResponse.model_validate(template)


@router.put(
    "/templates/{template_id}",
    response_model=TemplateResponse,
    summary="Update a template",
)
async def update_template(
    template_id: uuid.UUID,
    request: TemplateUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TemplateService(db)

    template = await service.update_template(
        template_id,
        **request.model_dump(exclude_unset=True),
    )

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    return TemplateResponse.model_validate(template)


@router.post(
    "/templates/preview",
    response_model=TemplatePreviewResponse,
    summary="Preview a template",
)
async def preview_template(
    request: TemplatePreviewRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TemplateService(db)

    result = await service.preview_template(
        name=request.template_name,
        variables=request.variables,
        locale=request.locale,
    )

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["error"],
        )

    return TemplatePreviewResponse(**result)


@router.get(
    "/preferences",
    response_model=UserPreferencesResponse,
    summary="Get notification preferences",
)
async def get_preferences(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = UserPreferencesService(db)
    prefs = await service.get_preferences(uuid.UUID(current_user["id"]))
    return UserPreferencesResponse.model_validate(prefs)


@router.put(
    "/preferences",
    response_model=UserPreferencesResponse,
    summary="Update notification preferences",
)
async def update_preferences(
    request: UserPreferencesUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = UserPreferencesService(db)

    prefs = await service.update_preferences(
        user_id=uuid.UUID(current_user["id"]),
        **request.model_dump(exclude_unset=True),
    )

    return UserPreferencesResponse.model_validate(prefs)


@router.post(
    "/broadcast",
    summary="Broadcast notification",
)
async def broadcast_notification(
    request: BroadcastRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)

    if request.recipient_user_ids:
        notifications = []
        for user_id in request.recipient_user_ids:
            notifications.append({
                "user_id": user_id,
                "channel": request.channel,
                "content": request.content,
                "subject": request.subject,
                "html_content": request.html_content,
                "priority": request.priority,
                "scheduled_at": request.scheduled_at,
            })

        created = await service.send_batch(notifications)
        return {"sent": len(created)}
    else:
        return {"message": "Broadcast queued for all users"}
