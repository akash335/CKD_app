"""Users API — sync, update, and fetch user profiles (database-backed)."""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database.session import get_db
from app.schemas.users import UserCreate, UserUpdate, UserResponse
from app.services.users import (
    sync_user,
    get_user_by_id,
    get_user_by_email,
    update_user,
    get_doctors,
)

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post("/sync", response_model=UserResponse)
async def sync_user_endpoint(data: UserCreate, db: Session = Depends(get_db)):
    """Create or update a user from auth provider (Google OAuth sync)."""
    return sync_user(db, data)


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    user_id: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get user by ID or email."""
    if user_id:
        user = get_user_by_id(db, user_id)
    elif email:
        user = get_user_by_email(db, email)
    else:
        raise HTTPException(status_code=400, detail="Provide user_id or email")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/doctors", response_model=list[UserResponse])
async def list_doctors(db: Session = Depends(get_db)):
    """Fetch all users with the 'doctor' role."""
    return get_doctors(db)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get user profile by ID."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user_endpoint(
    user_id: str,
    data: UserUpdate,
    db: Session = Depends(get_db),
):
    """Update user profile (role, name, username)."""
    try:
        user = update_user(db, user_id, data)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
