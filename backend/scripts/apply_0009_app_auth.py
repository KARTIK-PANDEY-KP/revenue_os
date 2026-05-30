"""Apply migration 0009_app_auth.sql to the live Supabase Postgres.

Reads settings.database_url, ensures sslmode=require, runs the migration SQL,
and confirms public.app_users exists. Idempotent (uses IF NOT EXISTS).

Run from backend/ with the venv active:
    python scripts/apply_0009_app_auth.py
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import asyncpg

from app.core.config import settings

MIGRATION = (
    Path(__file__).resolve().parents[2] / "supabase" / "migrations" / "0009_app_auth.sql"
)


async def main() -> None:
    dsn = settings.database_url
    if not dsn:
        raise SystemExit("DATABASE_URL is not set in backend/.env")
    if "sslmode=" not in dsn:
        dsn = dsn + ("&" if "?" in dsn else "?") + "sslmode=require"

    sql = MIGRATION.read_text()
    conn = await asyncpg.connect(dsn=dsn, statement_cache_size=0)
    try:
        await conn.execute(sql)
        exists = await conn.fetchval(
            "select to_regclass('public.app_users') is not null"
        )
        print(f"app_users exists: {exists}")
        if not exists:
            raise SystemExit("Migration ran but public.app_users not found")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
