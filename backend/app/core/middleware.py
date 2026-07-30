import time
import uuid

import structlog
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from app.core.config import Settings
from app.core.logging import get_logger

log = get_logger(__name__)

_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
    # This is a JSON API — it should never execute or embed anything.
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, *, hsts: bool) -> None:
        super().__init__(app)
        self._hsts = hsts

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        for header, value in _SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
        if self._hsts:
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject oversized bodies up front.

    Content-Length is client-supplied, so this is a cheap early rejection, not a
    guarantee. Streaming uploads still need their own byte-counting limit.
    """

    def __init__(self, app: ASGIApp, *, max_bytes: int) -> None:
        super().__init__(app)
        self._max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > self._max_bytes:
                    return JSONResponse(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        content={
                            "error": {
                                "code": "payload_too_large",
                                "message": "Request body exceeds the maximum allowed size",
                            }
                        },
                    )
            except ValueError:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={
                        "error": {
                            "code": "invalid_content_length",
                            "message": "Malformed Content-Length header",
                        }
                    },
                )
        return await call_next(request)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Bind a request id to the log context and record timing."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        started = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - started) * 1000, 2)

        response.headers["X-Request-ID"] = request_id
        log.info(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        return response


def register_middleware(app: FastAPI, settings: Settings) -> None:
    # Registration order is reverse of execution order: the last added runs first.
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        SecurityHeadersMiddleware,
        hsts=settings.ENVIRONMENT != "development",
    )
    app.add_middleware(
        BodySizeLimitMiddleware,
        max_bytes=settings.MAX_REQUEST_BODY_BYTES,
    )

    if settings.CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.CORS_ORIGINS,  # exact origins only, never "*"
            allow_credentials=True,
            allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
            max_age=600,
        )
