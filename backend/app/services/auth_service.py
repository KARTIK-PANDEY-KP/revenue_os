"""App-level email/password auth service.

A self-contained identity store backed by ``public.app_users``. This is a login
gate ONLY — it is intentionally decoupled from the team data model. Passwords are
salted + hashed with PBKDF2-HMAC-SHA256 (stdlib, no bcrypt); sessions are signed
HS256 JWTs created with ``settings.auth_jwt_secret``.
"""
from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from app.core.config import settings
from app.core.db import get_db

_PBKDF2_ITERATIONS = 240_000
_TOKEN_TTL = timedelta(days=7)
_JWT_ALG = "HS256"


# ---------------------------------------------------------------------------
# Password hashing — PBKDF2-HMAC-SHA256, salted.
# Stored format: "pbkdf2_sha256$<iters>$<salt_hex>$<hash_hex>"
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters_s, salt_hex, hash_hex = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        iters = int(iters_s)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
    except (ValueError, AttributeError):
        return False
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iters)
    return hmac.compare_digest(dk, expected)


# ---------------------------------------------------------------------------
# Tokens — HS256 JWT, 7-day expiry.
# ---------------------------------------------------------------------------
def create_token(user: dict[str, Any]) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user["id"]),
        "email": user["email"],
        "name": user.get("full_name") or "",
        "iat": int(now.timestamp()),
        "exp": int((now + _TOKEN_TTL).timestamp()),
    }
    return jwt.encode(claims, settings.auth_jwt_secret, algorithm=_JWT_ALG)


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.auth_jwt_secret, algorithms=[_JWT_ALG])
    except JWTError:
        return None


def _public_user(row: dict[str, Any]) -> dict[str, str]:
    return {"email": row["email"], "name": row.get("full_name") or ""}


# ---------------------------------------------------------------------------
# Signup / login.
# ---------------------------------------------------------------------------
async def signup(
    email: str,
    password: str,
    full_name: str | None = None,
    company: str | None = None,
) -> dict[str, Any]:
    email = email.strip().lower()
    db = get_db()

    existing = (await db.table("app_users").select("id").eq("email", email).limit(1).execute()).data
    if existing:
        raise ValueError("An account with this email already exists")

    row = {
        "email": email,
        "password_hash": hash_password(password),
        "full_name": full_name,
        "company": company,
    }
    inserted = (await db.table("app_users").insert(row).execute()).data
    user = inserted[0] if isinstance(inserted, list) else inserted
    return {"token": create_token(user), "user": _public_user(user)}


async def login(email: str, password: str) -> dict[str, Any]:
    email = email.strip().lower()
    db = get_db()

    rows = (await db.table("app_users").select("*").eq("email", email).limit(1).execute()).data
    user = rows[0] if rows else None
    if not user or not verify_password(password, user.get("password_hash", "")):
        raise ValueError("Invalid email or password")
    return {"token": create_token(user), "user": _public_user(user)}
