from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy import select, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.base import BaseRepository
from src.modules.monitoring.models.monitoring import (
    SystemEvent,
    AlertRule,
    AlertHistory,
    HealthSnapshot,
    EventSeverity,
)


class SystemEventRepository(BaseRepository[SystemEvent]):
    def __init__(self, session: AsyncSession):
        super().__init__(SystemEvent, session)

    async def create_event(
        self,
        event_type,
        severity,
        source,
        message,
        metadata=None,
        correlation_id=None,
    ) -> SystemEvent:
        event = SystemEvent(
            event_type=event_type,
            severity=severity,
            source=source,
            message=message,
            metadata_=metadata or {},
            correlation_id=correlation_id,
        )
        self.session.add(event)
        await self.session.commit()
        return event

    async def get_events(
        self,
        event_type=None,
        severity=None,
        start_date=None,
        end_date=None,
        page=1,
        page_size=20,
    ) -> tuple[list[SystemEvent], int]:
        query = select(SystemEvent)

        if event_type:
            query = query.where(SystemEvent.event_type == event_type)
        if severity:
            query = query.where(SystemEvent.severity == severity)
        if start_date:
            query = query.where(SystemEvent.created_at >= start_date)
        if end_date:
            query = query.where(SystemEvent.created_at <= end_date)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(SystemEvent.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        events = list(result.scalars().all())

        return events, total

    async def resolve_event(self, event_id: UUID, resolved_by: str) -> SystemEvent | None:
        event = await self.get_by_id(event_id)
        if event:
            event.resolved = True
            event.resolved_at = datetime.now(timezone.utc)
            event.resolved_by = resolved_by
            await self.session.commit()
        return event

    async def cleanup_old_events(self, days: int = 90) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        result = await self.session.execute(
            delete(SystemEvent).where(SystemEvent.created_at < cutoff)
        )
        await self.session.commit()
        return result.rowcount


class AlertRuleRepository(BaseRepository[AlertRule]):
    def __init__(self, session: AsyncSession):
        super().__init__(AlertRule, session)

    async def create_rule(
        self,
        name,
        metric_name,
        condition,
        threshold,
        severity,
        description=None,
        cooldown_seconds=300,
        notification_channels=None,
    ) -> AlertRule:
        rule = AlertRule(
            name=name,
            description=description,
            metric_name=metric_name,
            condition=condition,
            threshold=threshold,
            severity=severity,
            cooldown_seconds=cooldown_seconds,
            notification_channels=notification_channels or [],
        )
        self.session.add(rule)
        await self.session.commit()
        return rule

    async def get_enabled_rules(self) -> list[AlertRule]:
        result = await self.session.execute(
            select(AlertRule).where(AlertRule.enabled == True)
        )
        return list(result.scalars().all())

    async def get_by_name(self, name: str) -> AlertRule | None:
        result = await self.session.execute(
            select(AlertRule).where(AlertRule.name == name)
        )
        return result.scalar_one_or_none()

    async def toggle_rule(self, rule_id: UUID, enabled: bool) -> AlertRule | None:
        rule = await self.get_by_id(rule_id)
        if rule:
            rule.enabled = enabled
            await self.session.commit()
        return rule


class AlertHistoryRepository(BaseRepository[AlertHistory]):
    def __init__(self, session: AsyncSession):
        super().__init__(AlertHistory, session)

    async def record_alert(
        self,
        alert_rule_id,
        alert_rule_name,
        severity,
        value,
        threshold,
        message=None,
        metadata=None,
    ) -> AlertHistory:
        alert = AlertHistory(
            alert_rule_id=str(alert_rule_id),
            alert_rule_name=alert_rule_name,
            severity=severity,
            value=value,
            threshold=threshold,
            message=message,
            metadata_=metadata or {},
        )
        self.session.add(alert)
        await self.session.commit()
        return alert

    async def resolve_alert(self, alert_id: UUID) -> AlertHistory | None:
        alert = await self.get_by_id(alert_id)
        if alert:
            alert.resolved_at = datetime.now(timezone.utc)
            await self.session.commit()
        return alert

    async def get_recent_alerts(
        self, hours: int = 24, page: int = 1, page_size: int = 20
    ) -> tuple[list[AlertHistory], int]:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = select(AlertHistory).where(AlertHistory.triggered_at >= cutoff)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(AlertHistory.triggered_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        alerts = list(result.scalars().all())

        return alerts, total

    async def get_active_alerts(self) -> list[AlertHistory]:
        result = await self.session.execute(
            select(AlertHistory).where(AlertHistory.resolved_at.is_(None))
        )
        return list(result.scalars().all())

    async def get_alert_stats(self, hours: int = 24) -> dict:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        result = await self.session.execute(
            select(
                AlertHistory.severity,
                func.count(AlertHistory.id),
            )
            .where(AlertHistory.triggered_at >= cutoff)
            .group_by(AlertHistory.severity)
        )
        return {row[0].value: row[1] for row in result.all()}


class HealthSnapshotRepository(BaseRepository[HealthSnapshot]):
    def __init__(self, session: AsyncSession):
        super().__init__(HealthSnapshot, session)

    async def save_snapshot(
        self,
        overall_status,
        api_healthy,
        database_healthy,
        redis_healthy,
        celery_healthy,
        storage_healthy,
        disk_usage_percent,
        memory_usage_percent,
        cpu_usage_percent,
        active_connections=0,
        queue_depth=0,
        metadata=None,
    ) -> HealthSnapshot:
        snapshot = HealthSnapshot(
            overall_status=overall_status,
            api_healthy=api_healthy,
            database_healthy=database_healthy,
            redis_healthy=redis_healthy,
            celery_healthy=celery_healthy,
            storage_healthy=storage_healthy,
            disk_usage_percent=disk_usage_percent,
            memory_usage_percent=memory_usage_percent,
            cpu_usage_percent=cpu_usage_percent,
            active_connections=active_connections,
            queue_depth=queue_depth,
            metadata_=metadata or {},
        )
        self.session.add(snapshot)
        await self.session.commit()
        return snapshot

    async def get_latest(self) -> HealthSnapshot | None:
        result = await self.session.execute(
            select(HealthSnapshot).order_by(HealthSnapshot.created_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_history(
        self, hours: int = 24, page: int = 1, page_size: int = 20
    ) -> tuple[list[HealthSnapshot], int]:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = select(HealthSnapshot).where(HealthSnapshot.created_at >= cutoff)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(HealthSnapshot.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        snapshots = list(result.scalars().all())

        return snapshots, total

    async def cleanup_old_snapshots(self, days: int = 30) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        result = await self.session.execute(
            delete(HealthSnapshot).where(HealthSnapshot.created_at < cutoff)
        )
        await self.session.commit()
        return result.rowcount
