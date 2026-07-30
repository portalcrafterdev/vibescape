import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.user import User
from app.services import rate_limit

settings = get_settings()
PREFIX = settings.API_V1_PREFIX

# Fields that must never appear in any response body, at any nesting depth.
FORBIDDEN_FIELDS = ("password", "password_hash", "hash", "failed_login_count", "locked_until")


def assert_no_secrets(node, path="body"):
    """Walk a response body asserting nothing sensitive is present."""
    if isinstance(node, dict):
        for key, value in node.items():
            assert key not in FORBIDDEN_FIELDS, f"{path}.{key} leaked a private field"
            assert_no_secrets(value, f"{path}.{key}")
    elif isinstance(node, list):
        for i, item in enumerate(node):
            assert_no_secrets(item, f"{path}[{i}]")


class TestNoHashLeakage:
    async def test_register_response_has_no_secrets(self, client, credentials):
        body = (await client.post(f"{PREFIX}/auth/register", json=credentials)).json()

        assert_no_secrets(body)
        assert "$argon2" not in str(body), "a raw Argon2 hash reached the client"

    async def test_login_response_has_no_secrets(self, client, registered):
        body = (
            await client.post(
                f"{PREFIX}/auth/login",
                json={
                    "identifier": registered["credentials"]["username"],
                    "password": registered["credentials"]["password"],
                },
            )
        ).json()

        assert_no_secrets(body)
        assert "$argon2" not in str(body)

    async def test_me_response_has_no_secrets(self, client, auth_headers):
        body = (await client.get(f"{PREFIX}/auth/me", headers=auth_headers)).json()

        assert_no_secrets(body)

    async def test_password_is_stored_hashed(self, credentials, client):
        await client.post(f"{PREFIX}/auth/register", json=credentials)

        async with SessionLocal() as session:
            user = await session.scalar(
                select(User).where(User.username == credentials["username"])
            )
            assert user is not None
            assert user.password_hash != credentials["password"]
            assert user.password_hash.startswith("$argon2id$"), "not Argon2id"


class TestAccountEnumeration:
    async def test_login_identical_for_unknown_and_wrong_password(self, client, registered):
        """Distinct responses would let anyone test which accounts exist."""
        unknown = await client.post(
            f"{PREFIX}/auth/login",
            json={"identifier": "definitely_not_registered", "password": "whatever12345"},
        )
        wrong = await client.post(
            f"{PREFIX}/auth/login",
            json={
                "identifier": registered["credentials"]["username"],
                "password": "wrong password entirely",
            },
        )

        assert unknown.status_code == wrong.status_code == 401
        assert unknown.json() == wrong.json(), "responses differ — accounts are enumerable"

    async def test_forgot_password_identical_for_unknown_and_known(self, client, registered):
        known = await client.post(
            f"{PREFIX}/auth/forgot-password",
            json={"email": registered["credentials"]["email"]},
        )
        unknown = await client.post(
            f"{PREFIX}/auth/forgot-password",
            json={"email": "nobody-here@example.com"},
        )

        assert known.status_code == unknown.status_code == 200
        assert known.json() == unknown.json(), "responses differ — emails are enumerable"


class TestAccountLockout:
    async def test_repeated_failures_lock_the_account(self, client, registered):
        identifier = registered["credentials"]["username"]

        for _ in range(settings.MAX_FAILED_LOGINS):
            await client.post(
                f"{PREFIX}/auth/login",
                json={"identifier": identifier, "password": "wrong"},
            )

        # Even the correct password is refused while locked.
        resp = await client.post(
            f"{PREFIX}/auth/login",
            json={"identifier": identifier, "password": registered["credentials"]["password"]},
        )

        assert resp.status_code == 423
        assert resp.json()["error"]["code"] == "account_locked"

    async def test_successful_login_clears_the_counter(self, client, registered):
        identifier = registered["credentials"]["username"]
        password = registered["credentials"]["password"]

        for _ in range(settings.MAX_FAILED_LOGINS - 1):
            await client.post(
                f"{PREFIX}/auth/login", json={"identifier": identifier, "password": "wrong"}
            )

        assert (
            await client.post(
                f"{PREFIX}/auth/login", json={"identifier": identifier, "password": password}
            )
        ).status_code == 200

        async with SessionLocal() as session:
            user = await session.scalar(select(User).where(User.username == identifier))
            assert user.failed_login_count == 0
            assert user.locked_until is None


class TestRateLimiting:
    async def test_limit_trips_on_auth_endpoints(self, client, monkeypatch):
        monkeypatch.setattr(settings, "RATE_LIMIT_AUTH_PER_IP", 5)
        await rate_limit.reset("auth", "127.0.0.1")

        statuses = []
        for i in range(8):
            resp = await client.post(
                f"{PREFIX}/auth/login",
                json={"identifier": f"nobody{i}", "password": "irrelevant123"},
            )
            statuses.append(resp.status_code)

        assert 429 in statuses, f"rate limit never tripped: {statuses}"
        limited = [s for s in statuses if s == 429]
        assert len(limited) >= 1
        assert statuses.index(429) >= 5, "tripped earlier than the configured limit"

    async def test_rate_limited_response_uses_the_error_envelope(self, client, monkeypatch):
        monkeypatch.setattr(settings, "RATE_LIMIT_AUTH_PER_IP", 2)
        await rate_limit.reset("auth", "127.0.0.1")

        last = None
        for i in range(5):
            last = await client.post(
                f"{PREFIX}/auth/login",
                json={"identifier": f"nobody{i}", "password": "irrelevant123"},
            )

        assert last.status_code == 429
        assert last.json()["error"]["code"] == "rate_limited"


class TestPasswordReset:
    async def test_reset_flow_changes_the_password(self, client, registered):
        email = registered["credentials"]["email"]

        forgot = await client.post(f"{PREFIX}/auth/forgot-password", json={"email": email})
        token = forgot.headers.get("X-Debug-Reset-Token")
        assert token, "development builds expose the token so the flow is testable"

        new_password = "an entirely different passphrase"
        reset = await client.post(
            f"{PREFIX}/auth/reset-password", json={"token": token, "new_password": new_password}
        )
        assert reset.status_code == 200

        # Old password no longer works.
        old = await client.post(
            f"{PREFIX}/auth/login",
            json={
                "identifier": registered["credentials"]["username"],
                "password": registered["credentials"]["password"],
            },
        )
        assert old.status_code == 401

        new = await client.post(
            f"{PREFIX}/auth/login",
            json={
                "identifier": registered["credentials"]["username"],
                "password": new_password,
            },
        )
        assert new.status_code == 200

    async def test_reset_token_is_single_use(self, client, registered):
        email = registered["credentials"]["email"]
        token = (
            await client.post(f"{PREFIX}/auth/forgot-password", json={"email": email})
        ).headers["X-Debug-Reset-Token"]

        first = await client.post(
            f"{PREFIX}/auth/reset-password", json={"token": token, "new_password": "first change!"}
        )
        assert first.status_code == 200

        second = await client.post(
            f"{PREFIX}/auth/reset-password",
            json={"token": token, "new_password": "second change!"},
        )
        assert second.status_code == 401

    async def test_reset_revokes_existing_sessions(self, client, registered):
        """Changing a password must end sessions an attacker may already hold."""
        email = registered["credentials"]["email"]
        token = (
            await client.post(f"{PREFIX}/auth/forgot-password", json={"email": email})
        ).headers["X-Debug-Reset-Token"]

        await client.post(
            f"{PREFIX}/auth/reset-password",
            json={"token": token, "new_password": "brand new passphrase"},
        )

        resp = await client.post(
            f"{PREFIX}/auth/refresh", json={"refresh_token": registered["refresh_token"]}
        )
        assert resp.status_code == 401

    async def test_unknown_reset_token_rejected(self, client):
        resp = await client.post(
            f"{PREFIX}/auth/reset-password",
            json={"token": "made-up", "new_password": "does not matter"},
        )

        assert resp.status_code == 401


class TestSchemaSurface:
    @pytest.mark.parametrize(
        "path",
        [
            "/auth/register",
            "/auth/login",
            "/auth/refresh",
            "/auth/logout",
            "/auth/forgot-password",
            "/auth/reset-password",
            "/auth/me",
        ],
    )
    async def test_endpoint_is_documented(self, client, path):
        schema = (await client.get(settings.OPENAPI_URL)).json()

        assert f"{PREFIX}{path}" in schema["paths"]

    async def test_no_response_schema_exposes_a_hash(self, client):
        """Only response schemas are checked.

        Request bodies legitimately carry `password` — that is how a password gets to
        the server. What must never happen is a password or hash coming back out.
        """
        schema = (await client.get(settings.OPENAPI_URL)).json()
        components = schema.get("components", {}).get("schemas", {})

        def resolve(node):
            ref = node.get("$ref") if isinstance(node, dict) else None
            if ref and ref.startswith("#/components/schemas/"):
                return components.get(ref.rsplit("/", 1)[1], {})
            return node if isinstance(node, dict) else {}

        def assert_clean(node, name, seen):
            node = resolve(node)
            key = id(node)
            if key in seen:
                return
            seen.add(key)

            for field, prop in node.get("properties", {}).items():
                assert field not in FORBIDDEN_FIELDS, f"{name}.{field} is exposed in a response"
                assert_clean(prop, f"{name}.{field}", seen)

            for composite in ("anyOf", "oneOf", "allOf"):
                for sub in node.get(composite, []):
                    assert_clean(sub, name, seen)
            if "items" in node:
                assert_clean(node["items"], f"{name}[]", seen)

        checked = 0
        for path, methods in schema["paths"].items():
            for method, op in methods.items():
                for code, response in op.get("responses", {}).items():
                    for content in response.get("content", {}).values():
                        if "schema" in content:
                            assert_clean(
                                content["schema"], f"{method.upper()} {path} {code}", set()
                            )
                            checked += 1

        assert checked > 0, "no response schemas were inspected — the test proved nothing"
