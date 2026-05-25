"""Authentication API — register, login, change password (database-backed)."""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, ChangePasswordRequest, AuthResponse
from app.core.security import verify_password
from app.services.users import (
    get_raw_user_by_email,
    get_raw_user_by_id,
    create_credentials_user,
    change_password,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user with email and password."""
    existing = get_raw_user_by_email(db, data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Try signing in instead.",
        )

    user = create_credentials_user(
        db, name=data.name, email=data.email, password=data.password,
    )
    return AuthResponse(
        id=user.id,
        name=user.name or data.name,
        email=user.email,
        role=user.role,
        image=user.image,
        auth_provider="credentials",
        has_password=True,
        message="Account created successfully",
    )


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user with email and password."""
    raw_user = get_raw_user_by_email(db, data.email)
    if not raw_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Google-only users cannot login with credentials
    if not raw_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account uses Google Sign-In. Please use the Google button to sign in.",
        )

    if not verify_password(data.password, raw_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return AuthResponse(
        id=raw_user.id,
        name=raw_user.name or "",
        email=raw_user.email,
        role=raw_user.role or "",
        image=raw_user.image,
        auth_provider=raw_user.auth_provider or "credentials",
        has_password=True,
        message="Login successful",
    )


@router.post("/change-password")
async def change_user_password(
    data: ChangePasswordRequest,
    user_id: str = "",
    db: Session = Depends(get_db),
):
    """Change a user's password. Requires current password verification."""
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id query parameter is required",
        )

    raw_user = get_raw_user_by_id(db, user_id)
    if not raw_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # If user has a password, verify the current one
    if raw_user.password_hash:
        if not verify_password(data.current_password, raw_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect",
            )

    success = change_password(db, user_id, data.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password",
        )

    return {"message": "Password updated successfully"}
