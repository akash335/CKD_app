"""Pydantic schemas for authentication."""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class RegisterRequest(BaseModel):
    """Schema for email/password registration."""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    """Schema for email/password login."""
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    """Schema for changing password."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class AuthResponse(BaseModel):
    """Schema for authentication response."""
    id: str
    name: str
    email: str
    role: str
    image: Optional[str] = None
    auth_provider: str  # "google" | "credentials"
    has_password: bool
    message: str
