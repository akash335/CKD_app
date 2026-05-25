"""
Database engine, session factory, and dependency injection.

Usage in FastAPI endpoints:
    from app.database.session import get_db
    @router.get("/example")
    def example(db: Session = Depends(get_db)):
        ...
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,          # verify connections before checkout
    pool_recycle=3600,           # recycle connections every hour
    echo=settings.DEBUG,         # log SQL in debug mode
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
