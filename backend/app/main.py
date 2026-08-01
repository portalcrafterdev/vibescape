from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.cache.redis import close_redis
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.middleware import register_middleware
from app.db.session import engine
from app.services.realtime import manager as realtime_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    log = get_logger(__name__)
    log.info("startup", environment=settings.ENVIRONMENT)
    yield
    # Stop the pub/sub reader before the Redis client it depends on.
    await realtime_manager.shutdown()
    await close_redis()
    await engine.dispose()
    log.info("shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(debug=settings.DEBUG)

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="0.1.0",
        lifespan=lifespan,
        # The schema drives both the built-in Swagger UI and our own docs page at
        # {API_V1_PREFIX}/docs, so it must be served whenever docs are enabled.
        docs_url="/docs" if settings.ENABLE_DOCS else None,
        redoc_url="/redoc" if settings.ENABLE_DOCS else None,
        openapi_url=settings.OPENAPI_URL if settings.ENABLE_DOCS else None,
    )

    register_middleware(app, settings)
    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_app()
