import asyncio
from datetime import datetime, timezone

from src.core.celery_app import celery_app
from src.core.database import async_session_factory
from src.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="gateway.cleanup_expired_invitations",
    max_retries=2,
)
def cleanup_expired_invitations_task(self):
    asyncio.run(_cleanup_expired_invitations_async())


async def _cleanup_expired_invitations_async():
    async with async_session_factory() as session:
        from datetime import timedelta
        from sqlalchemy import update
        from src.modules.gateway.models.gateway import Invitation

        result = await session.execute(
            update(Invitation)
            .where(
                Invitation.status == "pending",
                Invitation.expires_at < datetime.now(timezone.utc),
            )
            .values(status="expired")
        )
        await session.commit()

        logger.info("expired_invitations_cleaned", extra={"count": result.rowcount})
        return {"cleaned": result.rowcount}


@celery_app.task(
    bind=True,
    name="gateway.collect_tenant_usage",
    max_retries=2,
)
def collect_tenant_usage_task(self):
    asyncio.run(_collect_tenant_usage_async())


async def _collect_tenant_usage_async():
    async with async_session_factory() as session:
        from sqlalchemy import text

        result = await session.execute(
            text("""
                SELECT tenant_id,
                       SUM(api_calls) as api_calls,
                       SUM(conversions) as conversions,
                       MAX(storage_bytes) as storage_bytes
                FROM gateway_tenant_usage
                WHERE date >= :start
                GROUP BY tenant_id
            """),
            {"start": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)},
        )
        rows = result.fetchall()

        for row in rows:
            logger.info(
                "tenant_usage_collected",
                extra={
                    "tenant_id": str(row[0]),
                    "api_calls": row[1],
                    "conversions": row[2],
                    "storage_bytes": row[3],
                },
            )

        return {"tenants_processed": len(rows)}


@celery_app.task(
    bind=True,
    name="gateway.cleanup_old_audit_logs",
    max_retries=2,
)
def cleanup_old_audit_logs_task(self, days: int = 90):
    asyncio.run(_cleanup_old_audit_logs_async(days))


async def _cleanup_old_audit_logs_async(days: int):
    async with async_session_factory() as session:
        from datetime import timedelta
        from sqlalchemy import delete
        from src.modules.gateway.models.gateway import TenantAuditLog

        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        result = await session.execute(
            delete(TenantAuditLog).where(TenantAuditLog.created_at < cutoff)
        )
        await session.commit()

        logger.info("old_audit_logs_cleaned", extra={"days": days, "deleted": result.rowcount})
        return {"deleted": result.rowcount}
