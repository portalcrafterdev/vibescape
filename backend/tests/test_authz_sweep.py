"""Authorisation sweep across the whole API surface.

These tests enumerate the OpenAPI document rather than a hand-written list, so an
endpoint added later is covered automatically. A checklist someone has to remember
to update is exactly what stops catching things.
"""

import uuid

import pytest

from app.core.config import get_settings

settings = get_settings()
PREFIX = settings.API_V1_PREFIX

# Endpoints that are public by design. Everything else must reject an
# unauthenticated caller.
PUBLIC_PATHS = {
    f"{PREFIX}/health",
    f"{PREFIX}/docs",
    f"{PREFIX}/auth/register",
    f"{PREFIX}/auth/login",
    f"{PREFIX}/auth/refresh",
    f"{PREFIX}/auth/forgot-password",
    f"{PREFIX}/auth/reset-password",
    f"{PREFIX}/ws",
}

PLACEHOLDER = str(uuid.uuid4())


def _fill(path: str) -> str:
    """Substitute path params with a syntactically valid but nonexistent id.

    The response should be 401 for an anonymous caller regardless of whether the
    resource exists — authentication is checked before lookup. A 404 here would
    mean the endpoint reveals existence before authenticating.
    """
    out = []
    for segment in path.split("/"):
        if segment.startswith("{") and segment.endswith("}"):
            out.append("someone" if "username" in segment else PLACEHOLDER)
        else:
            out.append(segment)
    return "/".join(out)


async def _spec(client) -> dict:
    return (await client.get(settings.OPENAPI_URL)).json()


def _operations(spec: dict) -> list[tuple[str, str]]:
    ops = []
    for path, methods in spec["paths"].items():
        for method in methods:
            if method.lower() in {"get", "post", "patch", "put", "delete"}:
                ops.append((method.lower(), path))
    return ops


class TestEveryEndpointRequiresAuth:
    async def test_sweep(self, client):
        spec = await _spec(client)
        operations = _operations(spec)
        assert operations, "no operations found — the sweep would pass vacuously"

        failures: list[str] = []
        checked = 0

        for method, path in operations:
            if path in PUBLIC_PATHS:
                continue

            checked += 1
            resp = await client.request(method.upper(), _fill(path), json={})

            # 401 is correct. 422 is acceptable only when validation runs first on a
            # body-carrying method; anything 2xx or a 404 that reveals existence is not.
            if resp.status_code not in {401, 422}:
                failures.append(f"{method.upper()} {path} -> {resp.status_code}")

        assert checked > 10, f"only swept {checked} endpoints — the filter is too broad"
        assert not failures, "endpoints reachable without authentication:\n" + "\n".join(failures)

    async def test_public_endpoints_are_deliberate(self, client):
        """Guards the allowlist itself: if a path stops existing, the entry is stale
        and would silently excuse a future endpoint that reuses the name."""
        spec = await _spec(client)
        known = {p for p in spec["paths"]}

        # /ws is a websocket and absent from the HTTP schema.
        # /ws is a websocket and /docs is include_in_schema=False; neither appears
        # in the HTTP document by design.
        invisible = {f"{PREFIX}/ws", f"{PREFIX}/docs"}
        stale = {p for p in PUBLIC_PATHS if p not in known} - invisible

        assert not stale, f"public allowlist references paths that no longer exist: {stale}"


class TestNoResponseLeaksPrivateFields:
    FORBIDDEN = (
        "password_hash",
        "failed_login_count",
        "locked_until",
        "token_hash",
        "dm_key",
        "storage_key",
        "media_asset_id",
    )

    async def test_no_response_schema_exposes_internals(self, client):
        """Walks every response schema in the document, resolving refs."""
        spec = await _spec(client)
        components = spec.get("components", {}).get("schemas", {})

        def resolve(node):
            ref = node.get("$ref") if isinstance(node, dict) else None
            if ref and ref.startswith("#/components/schemas/"):
                return components.get(ref.rsplit("/", 1)[1], {})
            return node if isinstance(node, dict) else {}

        def walk(node, name, seen):
            node = resolve(node)
            key = id(node)
            if key in seen:
                return
            seen.add(key)

            for field, prop in node.get("properties", {}).items():
                assert field not in self.FORBIDDEN, f"{name}.{field} is exposed in a response"
                walk(prop, f"{name}.{field}", seen)

            for composite in ("anyOf", "oneOf", "allOf"):
                for sub in node.get(composite, []):
                    walk(sub, name, seen)
            if "items" in node:
                walk(node["items"], f"{name}[]", seen)

        checked = 0
        for path, methods in spec["paths"].items():
            for method, op in methods.items():
                for code, response in op.get("responses", {}).items():
                    for content in response.get("content", {}).values():
                        if "schema" in content:
                            walk(content["schema"], f"{method.upper()} {path} {code}", set())
                            checked += 1

        assert checked > 20, f"only inspected {checked} response schemas"


class TestErrorEnvelope:
    async def test_unhandled_error_leaks_no_internals(
        self, client_passthrough, auth_headers, monkeypatch
    ):
        """A 500 must carry a generic message — no exception text, no traceback,
        no module paths."""
        from app.services import users as user_service

        async def boom(*args, **kwargs):
            raise RuntimeError("psycopg connection string user=admin password=hunter2")

        monkeypatch.setattr(user_service, "search", boom)

        resp = await client_passthrough.get(
            f"{PREFIX}/users/search?q=anything", headers=auth_headers
        )

        assert resp.status_code == 500
        body = resp.text
        assert "hunter2" not in body, "exception text reached the client"
        assert "Traceback" not in body
        assert "app/services" not in body
        assert resp.json()["error"]["code"] == "internal_error"

    @pytest.mark.parametrize(
        "path,method",
        [
            (f"{PREFIX}/users/not-a-uuid", "get"),
            (f"{PREFIX}/posts/not-a-uuid", "get"),
            (f"{PREFIX}/conversations/not-a-uuid/messages", "get"),
        ],
    )
    async def test_malformed_ids_return_the_envelope(self, client, auth_headers, path, method):
        resp = await client.request(method.upper(), path, headers=auth_headers)

        assert resp.status_code == 422
        assert "error" in resp.json()

    async def test_404_does_not_echo_the_requested_path(self, client, auth_headers):
        """Reflecting input invites content injection into whatever renders it."""
        resp = await client.get(f"{PREFIX}/<script>alert(1)</script>", headers=auth_headers)

        assert "<script>" not in resp.text
