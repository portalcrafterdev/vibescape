from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base. Alembic autogenerate reads metadata from here.

    Import every model module in app/db/models_registry.py so autogenerate sees them —
    a model that is never imported is invisible to Alembic and silently skipped.
    """
