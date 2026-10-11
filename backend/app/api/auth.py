"""Authentication endpoints for CareLens."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core import security
from app.db.session import get_session
from app.domain.models import User

router = APIRouter(prefix="", tags=["Auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_hours: int = 8
    role: str
    username: str
    full_name: str


class UserResponse(BaseModel):
    id: Optional[int] = None
    username: str
    role: str
    full_name: str


@router.post("/auth/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    session: Session = Depends(get_session),
) -> TokenResponse:
    """Authenticate user credentials using Argon2 and issue an 8-hour JWT with sub and role."""
    statement = select(User).where(User.username == payload.username)
    user = session.exec(statement).first()

    if not user or not security.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = security.create_access_token(
        subject=user.username,
        role=user.role,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_hours=8,
        role=user.role,
        username=user.username,
        full_name=user.full_name,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return profile details for the currently authenticated user."""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        full_name=current_user.full_name,
    )
