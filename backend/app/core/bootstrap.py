"""One-time, idempotent bootstrap of the tenant team.

This is *configuration*, not demo data: the app operates under a team that owns
all GTM records and carries the ICP used for scoring/prospecting. No accounts,
signals, or other content are created here — those only come from real provider
activity (Bright Data research, calls, etc.).
"""
from __future__ import annotations

from app.core.auth import DEMO_EMAIL, DEMO_USER_ID
from app.core.config import settings
from app.core.db import get_db
from app.core.logging import get_logger

log = get_logger("bootstrap")

DEFAULT_ICP = {
    "industries": ["AI Infrastructure", "Developer Tools", "Data", "Fintech", "SaaS"],
    "employee_range": {"min": 50, "max": 5000},
    "personas": ["VP Sales", "Head of Sales", "RevOps", "CRO"],
    "pains": ["scaling outbound", "prioritizing accounts", "rep ramp time"],
    "keywords": ["enterprise", "hiring", "funding", "launch"],
}
DEFAULT_SETTINGS = {
    "tone": "consultative",
    "signature": "— Sent via RevenueOS",
    "default_channels": ["email", "call", "linkedin"],
}


async def ensure_demo_user(db) -> None:
    """Ensure a profile exists for the unauthenticated demo context.

    Inserting into auth.users fires the on_auth_user_created trigger which creates
    the matching public.profiles row, so ownership FKs (owner_id/created_by/rep_id)
    resolve. When real Supabase Auth is used, real profiles exist and this is a
    harmless no-op. Best-effort: failures don't block startup.
    """
    try:
        existing = (await db.table("profiles").select("id").eq("id", DEMO_USER_ID)
                    .limit(1).execute()).data
        if existing:
            return
        # Insert directly into profiles first (works on any backend with the table).
        try:
            await db.table("profiles").upsert(
                {"id": DEMO_USER_ID, "email": DEMO_EMAIL, "full_name": "RevenueOS Demo"},
                on_conflict="id",
            ).execute()
            return
        except Exception:
            pass
        # Fall back to seeding auth.users (the trigger creates the profile).
        await db.table("auth.users").upsert({
            "id": DEMO_USER_ID,
            "instance_id": "00000000-0000-0000-0000-000000000000",
            "aud": "authenticated",
            "role": "authenticated",
            "email": DEMO_EMAIL,
        }, on_conflict="id").execute()
        log.info("Bootstrapped demo user profile.")
    except Exception as exc:  # pragma: no cover
        log.warning("ensure_demo_user skipped: %s", exc)


async def ensure_default_team() -> None:
    try:
        db = get_db()
    except Exception:
        return  # no DB configured — nothing to bootstrap

    await ensure_demo_user(db)

    try:
        existing = (await db.table("teams").select("id").eq("id", settings.demo_team_id)
                    .limit(1).execute()).data
        if existing:
            return
        await db.table("teams").upsert({
            "id": settings.demo_team_id,
            "name": "RevenueOS",
            "slug": "default",
            "icp": DEFAULT_ICP,
            "settings": DEFAULT_SETTINGS,
        }, on_conflict="id").execute()
        log.info("Bootstrapped default team %s", settings.demo_team_id)
    except Exception as exc:  # pragma: no cover
        log.warning("ensure_default_team skipped: %s", exc)

    # Link the demo user to the team (membership powers RLS for the frontend).
    try:
        member = (await db.table("team_members").select("team_id")
                  .eq("team_id", settings.demo_team_id).eq("user_id", DEMO_USER_ID)
                  .limit(1).execute()).data
        if not member:
            await db.table("team_members").insert({
                "team_id": settings.demo_team_id, "user_id": DEMO_USER_ID, "role": "owner",
            }).execute()
    except Exception as exc:  # pragma: no cover
        log.debug("team membership link skipped: %s", exc)
