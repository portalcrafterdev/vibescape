"""Single import point for every SQLAlchemy model.

Alembic autogenerate only sees models that have been imported. Add each new model
module here when it is created, or its table will be silently missing from migrations.

Phase 2 adds: User, RefreshToken.
"""

from app.db.base import Base  # noqa: F401

__all__ = ["Base"]
