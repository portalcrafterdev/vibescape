from app.core.config import get_settings

settings = get_settings()
PREFIX = settings.API_V1_PREFIX


async def test_docs_page_is_served(client):
    resp = await client.get(f"{PREFIX}/docs")

    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/html")
    assert "Vibescape" in resp.text


async def test_docs_page_points_at_the_live_schema(client):
    """The page must fetch the schema, not embed a stale copy — that is what keeps it current."""
    resp = await client.get(f"{PREFIX}/docs")

    assert "__OPENAPI_URL__" not in resp.text, "placeholder was not substituted"
    assert settings.OPENAPI_URL in resp.text


async def test_docs_csp_allows_its_own_assets(client):
    """The strict API CSP would block the page's inline script; the route must override it."""
    resp = await client.get(f"{PREFIX}/docs")

    csp = resp.headers["content-security-policy"]
    assert "script-src 'unsafe-inline'" in csp
    assert "connect-src 'self'" in csp
    assert "frame-ancestors 'none'" in csp


async def test_schema_is_reachable_and_current(client):
    resp = await client.get(settings.OPENAPI_URL)

    assert resp.status_code == 200
    schema = resp.json()
    assert schema["info"]["title"] == settings.PROJECT_NAME
    # Health is registered; the docs page renders whatever is here.
    assert f"{PREFIX}/health" in schema["paths"]


async def test_docs_route_absent_from_schema(client):
    """The docs page is not part of the API surface."""
    schema = (await client.get(settings.OPENAPI_URL)).json()

    assert f"{PREFIX}/docs" not in schema["paths"]


async def test_vendor_swagger_csp_permits_its_cdn(client):
    """FastAPI's Swagger UI loads from jsDelivr; the strict API CSP renders it blank."""
    resp = await client.get("/docs")

    assert resp.status_code == 200
    csp = resp.headers["content-security-policy"]
    assert "https://cdn.jsdelivr.net" in csp, "Swagger UI assets would be blocked"
    assert "script-src" in csp


async def test_api_responses_keep_the_strict_csp(client):
    """Widening CSP for the docs pages must not leak onto API responses."""
    resp = await client.get(f"{PREFIX}/health")

    csp = resp.headers["content-security-policy"]
    assert csp == "default-src 'none'; frame-ancestors 'none'"
    assert "jsdelivr" not in csp
