"""
Database module - re-exports from the canonical location.
This module exists for backward compatibility with modules that import
from src.core.database. New code should import from src.db.session directly.
"""
from src.db.session import (
    Base,
    async_session_factory,
    get_engine,
    get_session_dependency,
)

__all__ = [
    "Base",
    "async_session_factory",
    "get_engine",
    "get_session_dependency",
]


async def get_db():
    """Dependency that provides a database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
