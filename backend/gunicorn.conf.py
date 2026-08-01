"""Gunicorn configuration for production.

    gunicorn app.main:app -c gunicorn.conf.py

Uvicorn's own runner is a single process — fine for development, but it leaves
every core but one idle and gives no worker supervision. Gunicorn supervises
uvicorn workers, which is what makes a crashed worker a blip rather than an outage.
"""

import multiprocessing
import os

# --- binding ---------------------------------------------------------------
bind = os.getenv("BIND", "0.0.0.0:8000")

# --- workers ---------------------------------------------------------------
worker_class = "uvicorn.workers.UvicornWorker"

# Async workers hold many connections each, so the usual (2 * cores + 1) rule for
# blocking workers does not apply — that would just multiply memory for no gain.
workers = int(os.getenv("WEB_CONCURRENCY", multiprocessing.cpu_count()))

# WebSockets are long-lived. A short keepalive would cut idle sockets that are
# working exactly as intended.
timeout = int(os.getenv("WORKER_TIMEOUT", "120"))
graceful_timeout = 30
keepalive = 65

# Bounded lifetime so a slow leak in any dependency is recycled rather than
# accumulating. Jitter stops every worker restarting at once.
max_requests = int(os.getenv("MAX_REQUESTS", "10000"))
max_requests_jitter = 1000

# --- logging ---------------------------------------------------------------
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")

# The query string is omitted deliberately: the WebSocket handshake carries its
# access token there, and access logs are exactly the place a credential should
# not end up.
access_log_format = '%(h)s "%(m)s %(U)s" %(s)s %(b)s %(D)sµs'

# --- process ---------------------------------------------------------------
preload_app = False  # each worker builds its own connection pools
forwarded_allow_ips = os.getenv("FORWARDED_ALLOW_IPS", "127.0.0.1")
proxy_protocol = False


def on_starting(server) -> None:  # pragma: no cover - process hook
    server.log.info("vibescape api starting with %s workers", workers)
