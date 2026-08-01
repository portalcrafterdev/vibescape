import sys
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

_settings = get_settings()

# Pooled asyncpg connections belong to the event loop that opened them. The suite
# runs most tests on one session-scoped loop but drives WebSockets through
# Starlette's TestClient, which starts its own — a pooled connection crossing that
# boundary raises "attached to a different loop". Disabling the pool under pytest
# makes every connection belong to whichever loop is current. Production keeps the
# pool; this is a test-only concession.
_UNDER_PYTEST = "pytest" in sys.modules

_pool_options = (
    {"poolclass": NullPool}
    if _UNDER_PYTEST
    else {"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20}
)

engine: AsyncEngine = create_async_engine(
    _settings.DATABASE_URL,
    echo=False,
    **_pool_options,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Request-scoped session. Rolls back on error, always closes."""
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
