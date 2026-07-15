from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from src.core.config import settings


class Base(DeclarativeBase):
    """
    Declarative base for all ORM models.

    SQLAlchemy's `Column(default=...)` is only applied when a row is flushed
    to the database, so a freshly-constructed (unflushed) instance normally
    has `None` for any column relying on its `default=`. That surprises a lot
    of code -- tests, and any service logic -- that reads an attribute right
    after construction. This override applies scalar and no-arg-callable
    column defaults immediately, so `MyModel().some_column_with_default`
    behaves the same whether or not the instance has been flushed yet.
    Explicitly-passed kwargs always win; defaults that require SQL context
    (e.g. `server_default`) are left to the database as before.
    """

    def __init__(self, **kwargs):
        for column in self.__table__.columns:
            if column.name in kwargs or column.key in kwargs:
                continue
            default = column.default
            if default is None:
                continue
            if default.is_scalar:
                kwargs[column.key] = default.arg
            elif default.is_callable:
                # SQLAlchemy wraps callables to optionally accept an
                # ExecutionContext; call with no context for the common case.
                try:
                    kwargs[column.key] = default.arg({})
                except TypeError:
                    continue
        for key, value in kwargs.items():
            setattr(self, key, value)


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


def get_engine():
    return engine


async def get_session_dependency() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
