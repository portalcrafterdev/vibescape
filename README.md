# Vibescape

Social mobile app — React Native client with a FastAPI backend.

```
mobile/     React Native 0.86 app (iOS + Android)
backend/    FastAPI service (Python 3.12, Postgres, Redis)
```

Each has its own README with setup instructions:

- [mobile/README.md](mobile/README.md)
- [backend/README.md](backend/README.md)

## Quick start

**Backend**

```bash
cd backend
cp .env.example .env
uv sync --extra dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

**Mobile**

```bash
cd mobile
npm install
npm start              # Metro
npm run android        # or: npm run ios
```

**Docker** (backend + Postgres + Redis)

```bash
docker compose up -d
docker compose exec api alembic upgrade head
```

Compose maps Postgres to `5433` and Redis to `6380` to avoid colliding with local
Homebrew instances.

## Status

The mobile app is built and navigable but still renders mock data from `mobile/src/data/`.
The backend is being added to replace it, starting with authentication. Each mock module is
removed only once every screen consuming it has migrated, so the app stays runnable
throughout.
