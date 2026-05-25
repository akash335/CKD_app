"""Pydantic schemas for user profiles and account management."""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    image: Optional[str] = None
    username: Optional[str] = None
    next_checkup: Optional[datetime] = None


class UserCreate(UserBase):
    """Schema for creating/syncing a user from auth provider."""
    id: str  # Google ID or Auth provider ID
    role: Optional[str] = ""
    auth_provider: Optional[str] = "google"
    password_hash: Optional[str] = None


class UserUpdate(BaseModel):
    """Schema for updating a user profile."""
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    role: Optional[str] = None
    username: Optional[str] = None
    next_checkup: Optional[datetime] = None


class UserResponse(UserBase):
    """Schema for returning user data."""
    id: str
    role: str
    auth_provider: str = "google"
    has_password: bool = False
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
