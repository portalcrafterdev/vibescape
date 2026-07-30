# Vibescape API

FastAPI backend for the Vibescape mobile app.

## Stack

Python 3.12 · FastAPI · Pydantic v2 · SQLAlchemy 2 (async) · asyncpg · Alembic · Redis · uv

## Local setup

Requires [uv](https://docs.astral.sh/uv/), PostgreSQL, and Redis.

```bash
cp .env.example .env      # then fill in DATABASE_URL
uv sync --extra dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

API at `http://127.0.0.1:8000/api/v1`, interactive docs at `/docs` (disabled unless `DEBUG=true`).

### Docker

```bash
docker compose up -d                              # from the repo root
docker compose exec api alembic upgrade head
```

Compose maps Postgres to **5433** and Redis to **6380** so it doesn't collide with a
Homebrew Postgres/Redis already running on the host.

## Commands

```bash
uv run pytest                        # tests
uv run ruff check . && uv run ruff format .
uv run alembic revision --autogenerate -m "message"
uv run alembic upgrade head
```

## Layout

```
app/
  main.py          app factory, middleware and router wiring
  core/            config, logging, middleware, exception handlers
  api/v1/          routers — health now; auth, users, posts, etc. to follow
  db/              declarative base, async session, model registry
  cache/           Redis client, key builders
  models/          SQLAlchemy models
  schemas/         Pydantic request/response models
  services/        business logic (routers stay thin)
alembic/           migrations
tests/
```

## Conventions

- `async def` throughout. One sync DB call blocks the whole event loop.
- Every endpoint declares a `response_model`. Never return an ORM object directly —
  that is how password hashes leak.
- Routers stay thin; logic goes in `services/`.
- A migration for every model change. No `create_all` outside tests.
- New models must be imported in `app/db/models_registry.py`, or Alembic autogenerate
  will silently skip them.

## Health

`GET /api/v1/health` reports each dependency:

```json
{ "status": "ok", "database": "up", "cache": "up" }
```

Postgres is required — losing it returns **503** with `"status": "down"`. Redis is a
cache, so losing it returns **200** with `"status": "degraded"` and the app serves from
Postgres. Cache helpers in `app/cache/redis.py` swallow connection errors and report a
miss, so a Redis outage makes the app slow rather than broken.

## Caching

Use `user_scoped_key()` for anything personalized. It requires a viewer id, because a
personalized response cached without one gets served across users.

## Configuration

All settings come from the environment via `app/core/config.py`. See `.env.example`.
`.env` is gitignored and must never be committed.

Production startup fails fast if `SECRET_KEY` is unset, `DEBUG` is true, or
`CORS_ORIGINS` contains `*`.
