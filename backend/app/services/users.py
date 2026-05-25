"""
Database-backed user service — replaces in-memory store.

All user CRUD operations go through PostgreSQL via SQLAlchemy.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.users import UserCreate, UserUpdate, UserResponse
from app.core.security import hash_password, verify_password


def _to_response(user: User) -> UserResponse:
    """Convert a User ORM object to a UserResponse schema."""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        image=user.image,
        role=user.role or "",
        auth_provider=user.auth_provider or "google",
        has_password=bool(user.password_hash),
        created_at=user.created_at.isoformat() if user.created_at else None,
        username=user.username,
        age=user.age,
        gender=user.gender,
        next_checkup=user.next_checkup,
    )


def get_user_by_id(db: Session, user_id: str) -> Optional[UserResponse]:
    """Retrieve a user by their unique ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        return _to_response(user)
    return None


def get_user_by_email(db: Session, email: str) -> Optional[UserResponse]:
    """Retrieve a user by their email address."""
    user = db.query(User).filter(User.email == email).first()
    if user:
        return _to_response(user)
    return None


def get_raw_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get raw User ORM object (including password_hash) for auth verification."""
    return db.query(User).filter(User.email == email).first()


def get_raw_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """Get raw User ORM object by ID."""
    return db.query(User).filter(User.id == user_id).first()


def sync_user(db: Session, data: UserCreate) -> UserResponse:
    """Create a user if not exists, or update existing basic info (Google login sync)."""
    existing = db.query(User).filter(User.id == data.id).first()

    if existing:
        existing.name = data.name or existing.name
        existing.image = data.image or existing.image
        if data.role and existing.role == "":
            existing.role = data.role
        db.commit()
        db.refresh(existing)
        return _to_response(existing)

    # Create new user
    new_user = User(
        id=data.id,
        email=data.email,
        name=data.name,
        image=data.image,
        role=data.role or "",
        auth_provider=data.auth_provider or "google",
        password_hash=data.password_hash,
        username=data.username,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return _to_response(new_user)


def create_credentials_user(db: Session, name: str, email: str, password: str) -> UserResponse:
    """Create a new user with email/password credentials."""
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        name=name,
        role="",
        auth_provider="credentials",
        password_hash=hash_password(password),
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_response(user)


def change_password(db: Session, user_id: str, new_password: str) -> bool:
    """Update a user's password hash."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False
    user.password_hash = hash_password(new_password)
    db.commit()
    return True


def update_user(db: Session, user_id: str, data: UserUpdate) -> Optional[UserResponse]:
    """Update user profile details."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    if data.name is not None:
        user.name = data.name
    if data.role is not None:
        user.role = data.role
    if data.username is not None:
        # Check uniqueness
        if data.username != user.username:
            conflict = db.query(User).filter(
                User.username == data.username
            ).first()
            if conflict:
                raise ValueError("Username already taken")
        user.username = data.username
    if data.age is not None:
        user.age = data.age
    if data.gender is not None:
        user.gender = data.gender
    if data.next_checkup is not None:
        user.next_checkup = data.next_checkup

    db.commit()
    db.refresh(user)
    return _to_response(user)


def get_doctors(db: Session) -> list[UserResponse]:
    """Retrieve all users with the 'doctor' role."""
    doctors = db.query(User).filter(User.role == "doctor").all()
    return [_to_response(doc) for doc in doctors]
