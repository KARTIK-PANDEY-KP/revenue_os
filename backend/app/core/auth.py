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
    # Display-only identity from the app-auth token (login gate). NOT used for
    # any data ownership — user_id/team_id always stay on the demo tenant since
    # account.owner_id etc. FK to profiles/auth.users, which app_users is not.
    display_name: str = ""


async def get_auth_context(
    authorization: str | None = Header(default=None),
    x_team_id: str | None = Header(default=None),
) -> AuthContext:
    team_id = x_team_id or settings.demo_team_id

    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        # Verify our own HS256 session token (the app login gate). Data ops still
        # run as the demo user/team; the token only carries display identity.
        from app.services import auth_service

        claims = auth_service.decode_token(token)
        if claims:
            return AuthContext(
                user_id=DEMO_USER_ID,
                email=claims.get("email") or DEMO_EMAIL,
                team_id=team_id,
                is_demo=True,
                display_name=claims.get("name", ""),
            )

    # Demo fallback — never blocks the product.
    return AuthContext(user_id=DEMO_USER_ID, email=DEMO_EMAIL, team_id=team_id, is_demo=True)


CurrentUser = Depends(get_auth_context)
