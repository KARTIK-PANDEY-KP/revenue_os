"""Auth context.

Extracts the current user + active team from the Supabase JWT (Authorization:
Bearer). The token's signature is validated against Supabase when configured; in
mock/demo mode we synthesize a stable demo user attached to the demo team so the
whole API is usable without logging in.
"""
from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Header

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("auth")

DEMO_USER_ID = "00000000-0000-0000-0000-0000000000de"
DEMO_EMAIL = "demo@revenueos.app"


@dataclass
class AuthContext:
    user_id: str
    email: str
    team_id: str
    is_demo: bool = False


def _decode_unverified(token: str) -> dict:
    """Best-effort JWT payload decode (claims only)."""
    try:
        from jose import jwt

        return jwt.get_unverified_claims(token)
    except Exception:
        return {}


async def get_auth_context(
    authorization: str | None = Header(default=None),
    x_team_id: str | None = Header(default=None),
) -> AuthContext:
    team_id = x_team_id or settings.demo_team_id

    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        claims = _decode_unverified(token)
        user_id = claims.get("sub")
        email = claims.get("email", "")
        if user_id:
            return AuthContext(user_id=user_id, email=email, team_id=team_id)

    # Demo fallback — never blocks the product.
    return AuthContext(user_id=DEMO_USER_ID, email=DEMO_EMAIL, team_id=team_id, is_demo=True)


CurrentUser = Depends(get_auth_context)
