from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from app.core.config import get_settings

router = APIRouter(include_in_schema=False)

_TEMPLATE = Path(__file__).resolve().parent.parent.parent / "static" / "docs.html"

# The strict API CSP (default-src 'none') would block this page's own inline script and
# styles. SecurityHeadersMiddleware uses setdefault, so setting it here wins.
_DOCS_CSP = (
    "default-src 'none'; "
    "script-src 'unsafe-inline'; "
    "style-src 'unsafe-inline'; "
    "connect-src 'self'; "
    "frame-ancestors 'none'"
)


@lru_cache
def _template() -> str:
    return _TEMPLATE.read_text(encoding="utf-8")


@router.get("/docs", response_class=HTMLResponse)
async def docs(request: Request) -> HTMLResponse:
    """Self-hosted API reference.

    Renders whatever the live OpenAPI schema currently contains, so adding a route to
    the app makes it appear here on the next page load — nothing to regenerate.
    """
    settings = get_settings()
    openapi_url = request.scope.get("root_path", "") + (settings.OPENAPI_URL or "/openapi.json")
    html = _template().replace("__OPENAPI_URL__", openapi_url)

    return HTMLResponse(
        content=html,
        headers={
            "Content-Security-Policy": _DOCS_CSP,
            "Cache-Control": "no-store",
        },
    )
