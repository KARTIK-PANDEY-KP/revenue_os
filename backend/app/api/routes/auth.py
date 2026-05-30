"""App auth routes — email/password signup, login, and identity lookup.

This is a login gate over ``public.app_users`` (see app.services.auth_service).
It is independent of the team data model: tokens carry identity only, while all
data operations run against the demo user/team.
"""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, EmailStr

from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupBody(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None
    company: str | None = None


class LoginBody(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup")
async def signup(body: SignupBody):
    try:
        return await auth_service.signup(
            email=str(body.email),
            password=body.password,
            full_name=body.name,
            company=body.company,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/login")
async def login(body: LoginBody):
    try:
        return await auth_service.login(email=str(body.email), password=body.password)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.get("/me")
async def me(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1].strip()
    claims = auth_service.decode_token(token)
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"user": {"email": claims.get("email", ""), "name": claims.get("name", "")}}
