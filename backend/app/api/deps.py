"""API authentication and authorization dependencies."""

from typing import Any, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from sqlmodel import Session, select

from app.core import security
from app.db.session import get_session
from app.domain.models import User

# HTTP Bearer scheme (auto_error=False to allow clean custom 401 exceptions)
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> User:
    """Validate Bearer JWT and return the authenticated User."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = security.decode_access_token(token)
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing subject claim",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    statement = select(User).where(User.username == username)
    user = session.exec(statement).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_role(*allowed_roles: Any) -> Callable[[User], User]:
    """Dependency enforcing that the authenticated user possesses one of the allowed roles."""
    flat_roles: set[str] = set()
    for r in allowed_roles:
        if isinstance(r, (list, tuple, set)):
            flat_roles.update(str(item) for item in r)
        else:
            flat_roles.add(str(r))

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in flat_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: role '{current_user.role}' is not authorized for this resource",
            )
        return current_user

    return role_checker
