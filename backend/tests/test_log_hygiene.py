"""Log hygiene.

Logs are copied into aggregators, retained far longer than any request, and read
by more people than the database is. A token or password reaching them is a
credential leak with a long tail, so this asserts on actual emitted output rather
than trusting the redaction processor to have been wired up.
"""

import json

import pytest
import structlog

from app.core.config import get_settings
from app.core.logging import configure_logging

settings = get_settings()
PREFIX = settings.API_V1_PREFIX

SECRET_PASSWORD = "correct horse battery staple"


@pytest.fixture
def captured_logs():
    """Capture structlog output as parsed events."""
    entries: list[dict] = []

    def sink(logger, method_name, event_dict):
        entries.append(dict(event_dict))
        raise structlog.DropEvent

    original = structlog.get_config()
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            *[p for p in original["processors"] if getattr(p, "__name__", "") == "_redact"],
            sink,
        ],
        wrapper_class=original["wrapper_class"],
        cache_logger_on_first_use=False,
    )
    yield entries
    structlog.configure(**original)
    configure_logging(debug=settings.DEBUG)


class TestRedactionProcessor:
    def test_sensitive_keys_are_redacted(self, captured_logs):
        log = structlog.get_logger("test")
        log.info(
            "attempt",
            password=SECRET_PASSWORD,
            access_token="secret-access",
            refresh_token="secret-refresh",
            password_hash="$argon2id$v=19$abc",
            email="someone@example.com",
            authorization="Bearer abcdefg",
        )

        entry = captured_logs[-1]
        blob = json.dumps(entry)

        assert SECRET_PASSWORD not in blob
        assert "secret-access" not in blob
        assert "secret-refresh" not in blob
        assert "$argon2id$" not in blob
        assert "someone@example.com" not in blob
        assert "abcdefg" not in blob

    def test_bearer_tokens_in_free_text_are_scrubbed(self, captured_logs):
        """A token can arrive inside a message body, not only as a field."""
        structlog.get_logger("test").info(
            "upstream rejected Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig"
        )

        assert "eyJhbGciOiJIUzI1NiJ9" not in json.dumps(captured_logs[-1])

    def test_ordinary_fields_survive(self, captured_logs):
        """Redaction must not be so blunt that logs stop being useful."""
        structlog.get_logger("test").info(
            "request_completed", method="GET", path="/api/v1/health", status_code=200
        )

        entry = captured_logs[-1]
        assert entry["method"] == "GET"
        assert entry["status_code"] == 200


class TestRequestLoggingLeaksNothing:
    async def test_registration_never_logs_the_password(self, client, credentials, captured_logs):
        await client.post(f"{PREFIX}/auth/register", json=credentials)

        blob = json.dumps(captured_logs)
        assert credentials["password"] not in blob, "a password reached the logs"
        assert credentials["email"] not in blob, "an email address reached the logs"

    async def test_login_failure_never_logs_the_attempt(self, client, registered, captured_logs):
        await client.post(
            f"{PREFIX}/auth/login",
            json={"identifier": registered["credentials"]["username"], "password": "guess-me-123"},
        )

        assert "guess-me-123" not in json.dumps(captured_logs)

    async def test_issued_tokens_are_not_logged(self, client, credentials, captured_logs):
        body = (await client.post(f"{PREFIX}/auth/register", json=credentials)).json()
        access = body["tokens"]["access_token"]
        refresh = body["tokens"]["refresh_token"]

        blob = json.dumps(captured_logs)
        assert access not in blob
        assert refresh not in blob

    async def test_authorization_header_is_not_logged(
        self, client, registered, auth_headers, captured_logs
    ):
        await client.get(f"{PREFIX}/users/me", headers=auth_headers)

        assert registered["access_token"] not in json.dumps(captured_logs)

    async def test_message_bodies_are_not_logged(
        self, client, auth_headers, other_user, captured_logs
    ):
        """Private conversation content must not end up in operational logs."""
        other, _ = other_user
        convo = (
            await client.post(
                f"{PREFIX}/conversations",
                headers=auth_headers,
                json={"user_id": other["user"]["id"]},
            )
        ).json()

        secret = "meet me at the usual place"
        await client.post(
            f"{PREFIX}/conversations/{convo['id']}/messages",
            headers=auth_headers,
            json={"body": secret},
        )

        assert secret not in json.dumps(captured_logs), "message content reached the logs"
