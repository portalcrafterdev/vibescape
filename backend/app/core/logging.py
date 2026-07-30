import logging
import re
from typing import Any

import structlog

# Keys whose values must never reach the logs.
_SENSITIVE_KEYS = frozenset(
    {
        "password",
        "current_password",
        "new_password",
        "password_hash",
        "token",
        "access_token",
        "refresh_token",
        "authorization",
        "secret",
        "secret_key",
        "api_key",
        "cookie",
        "set-cookie",
        "email",
    }
)

_BEARER_RE = re.compile(r"(Bearer\s+)[A-Za-z0-9._\-]+", re.IGNORECASE)
_REDACTED = "***REDACTED***"


def _redact(_logger: Any, _method: str, event_dict: dict) -> dict:
    """Strip credentials and PII from every log event."""
    for key in list(event_dict.keys()):
        if key.lower() in _SENSITIVE_KEYS:
            event_dict[key] = _REDACTED

    event = event_dict.get("event")
    if isinstance(event, str):
        event_dict["event"] = _BEARER_RE.sub(rf"\1{_REDACTED}", event)

    return event_dict


def configure_logging(*, debug: bool) -> None:
    logging.basicConfig(
        format="%(message)s",
        level=logging.DEBUG if debug else logging.INFO,
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            _redact,
            structlog.dev.ConsoleRenderer() if debug else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.DEBUG if debug else logging.INFO
        ),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> Any:
    return structlog.get_logger(name)
