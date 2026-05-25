"""
Declarative base for all SQLAlchemy models.

Every model file imports Base from here so Alembic can auto-detect
all tables through a single metadata object.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass
