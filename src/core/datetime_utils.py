"""Small shared datetime helpers."""

from datetime import datetime, timezone


def ensure_utc(dt: datetime) -> datetime:
    """
    Return `dt` as a timezone-aware UTC datetime.

    Columns declared as `DateTime(timezone=True)` come back timezone-aware
    from PostgreSQL (the production database), but SQLite -- used by the
    test suite and any local/dev sqlite fallback -- has no native timezone
    support and always returns naive datetimes. Comparing a naive and an
    aware datetime raises `TypeError`, so any code comparing a stored
    timestamp against `datetime.now(timezone.utc)` should pass the stored
    value through this helper first. Values that are already aware are
    returned unchanged (assumed already UTC, which is this app's
    convention).
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
