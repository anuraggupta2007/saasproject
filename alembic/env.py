from logging.config import fileConfig
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from src.core.config import settings
from src.db.session import Base

# ---------------------------------------------------------------------------
# Import ALL models so Alembic's metadata knows about every table. See
# src/models/registry.py for why this must happen in one shared place.
import src.models.registry  # noqa: F401
# ---------------------------------------------------------------------------

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _clean_url(url: str) -> tuple[str, bool]:
    """Strip sslmode param (asyncpg doesn't accept it) and return whether SSL is needed."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    needs_ssl = params.pop("sslmode", None) == ["require"]
    clean = urlunparse(parsed._replace(query=urlencode(params, doseq=True)))
    return clean, needs_ssl


DATABASE_URL, USE_SSL = _clean_url(settings.DATABASE_URL)
config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connect_args = {"ssl": "require"} if USE_SSL else {}
    connectable = create_async_engine(
        DATABASE_URL,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    import asyncio
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
