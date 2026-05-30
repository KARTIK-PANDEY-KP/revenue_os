"""Database access layer.

Two interchangeable backends behind one postgrest-style query API:

* ``SupabaseRepo`` — real Supabase (service-role) via supabase-py's async client.
* ``MemoryRepo``  — an in-memory store seeded with the demo dataset, so the whole
  product runs with zero infrastructure before any key is provisioned.

Services only ever touch ``db.table(name).select(...).eq(...).execute()`` and never
need to know which backend is active.
"""
from __future__ import annotations

import asyncio
import copy
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger
from app.core.seed_data import build_seed

log = get_logger("db")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


class Resp:
    """Mimics the postgrest response object (``.data``)."""

    def __init__(self, data: Any):
        self.data = data


# ---------------------------------------------------------------------------
# In-memory backend
# ---------------------------------------------------------------------------
class _MemoryQuery:
    """A tiny, chainable, postgrest-compatible query builder over a list[dict]."""

    def __init__(self, store: dict[str, list[dict]], table: str):
        self._store = store
        self._table = table
        self._rows = store.setdefault(table, [])
        self._filters: list = []
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None
        self._single = False
        self._op = "select"
        self._payload: Any = None
        self._lock = _MEMORY_LOCK

    # --- read ---
    def select(self, *_columns: str) -> "_MemoryQuery":
        self._op = "select"
        return self

    def eq(self, col: str, val: Any) -> "_MemoryQuery":
        self._filters.append(lambda r: r.get(col) == val)
        return self

    def neq(self, col: str, val: Any) -> "_MemoryQuery":
        self._filters.append(lambda r: r.get(col) != val)
        return self

    def in_(self, col: str, vals: list) -> "_MemoryQuery":
        s = set(vals)
        self._filters.append(lambda r: r.get(col) in s)
        return self

    def gte(self, col: str, val: Any) -> "_MemoryQuery":
        self._filters.append(lambda r: r.get(col) is not None and r.get(col) >= val)
        return self

    def lte(self, col: str, val: Any) -> "_MemoryQuery":
        self._filters.append(lambda r: r.get(col) is not None and r.get(col) <= val)
        return self

    def ilike(self, col: str, pattern: str) -> "_MemoryQuery":
        needle = pattern.replace("%", "").lower()
        self._filters.append(lambda r: needle in str(r.get(col, "")).lower())
        return self

    def order(self, col: str, desc: bool = False) -> "_MemoryQuery":
        self._order = (col, desc)
        return self

    def limit(self, n: int) -> "_MemoryQuery":
        self._limit = n
        return self

    def single(self) -> "_MemoryQuery":
        self._single = True
        return self

    def maybe_single(self) -> "_MemoryQuery":
        self._single = True
        return self

    # --- write ---
    def insert(self, payload: dict | list[dict]) -> "_MemoryQuery":
        self._op = "insert"
        self._payload = payload
        return self

    def update(self, payload: dict) -> "_MemoryQuery":
        self._op = "update"
        self._payload = payload
        return self

    def upsert(self, payload: dict | list[dict], on_conflict: str | None = None) -> "_MemoryQuery":
        self._op = "upsert"
        self._payload = payload
        self._on_conflict = on_conflict
        return self

    def delete(self) -> "_MemoryQuery":
        self._op = "delete"
        return self

    def _match(self, row: dict) -> bool:
        return all(f(row) for f in self._filters)

    async def execute(self) -> Resp:
        async with self._lock:
            return self._execute_sync()

    def _execute_sync(self) -> Resp:
        if self._op == "select":
            rows = [copy.deepcopy(r) for r in self._rows if self._match(r)]
            if self._order:
                col, desc = self._order
                rows.sort(key=lambda r: (r.get(col) is None, r.get(col)), reverse=desc)
            if self._limit is not None:
                rows = rows[: self._limit]
            if self._single:
                return Resp(rows[0] if rows else None)
            return Resp(rows)

        if self._op in ("insert", "upsert"):
            items = self._payload if isinstance(self._payload, list) else [self._payload]
            out = []
            for item in items:
                item = dict(item)
                item.setdefault("id", new_id())
                item.setdefault("created_at", now_iso())
                item.setdefault("updated_at", now_iso())
                if self._op == "upsert":
                    existing = next((r for r in self._rows if r.get("id") == item["id"]), None)
                    if existing:
                        existing.update(item)
                        out.append(copy.deepcopy(existing))
                        continue
                self._rows.append(item)
                out.append(copy.deepcopy(item))
            return Resp(out if isinstance(self._payload, list) else out[0])

        if self._op == "update":
            out = []
            for r in self._rows:
                if self._match(r):
                    r.update(self._payload)
                    r["updated_at"] = now_iso()
                    out.append(copy.deepcopy(r))
            return Resp(out)

        if self._op == "delete":
            removed = [r for r in self._rows if self._match(r)]
            self._store[self._table] = [r for r in self._rows if not self._match(r)]
            return Resp([copy.deepcopy(r) for r in removed])

        return Resp(None)


_MEMORY_LOCK = asyncio.Lock()


class MemoryRepo:
    def __init__(self) -> None:
        # Dev-only store. Seeded so the offline dev mode has something to render;
        # never used when Supabase is configured.
        seed = settings.load_demo_data or settings.mock_allowed
        self._store: dict[str, list[dict]] = build_seed() if seed else {}
        log.warning("Using in-memory dev database (REVENUEOS_ALLOW_MOCK). %d tables seeded.", len(self._store))

    def table(self, name: str) -> _MemoryQuery:
        return _MemoryQuery(self._store, name)

    async def rpc(self, fn: str, params: dict) -> Resp:  # noqa: ARG002
        return Resp(None)


# ---------------------------------------------------------------------------
# Supabase backend
# ---------------------------------------------------------------------------
class SupabaseRepo:
    def __init__(self, client: Any) -> None:
        self._client = client
        log.info("Using Supabase database (service role).")

    def table(self, name: str):  # returns the live postgrest builder
        return self._client.table(name)

    async def rpc(self, fn: str, params: dict):
        return await self._client.rpc(fn, params).execute()


# ---------------------------------------------------------------------------
# Direct Postgres backend (asyncpg) — used when DATABASE_URL is set.
# Implements the same postgrest-style chainable API as MemoryRepo so services
# are backend-agnostic.
# ---------------------------------------------------------------------------
class _PostgresQuery:
    def __init__(self, pool: Any, table: str):
        self._pool = pool
        self._table = table
        self._cols = "*"
        self._wheres: list[tuple[str, Any]] = []
        self._order: tuple[str, bool] | None = None
        self._limit_n: int | None = None
        self._single = False
        self._op = "select"
        self._payload: Any = None
        self._on_conflict = "id"

    # read
    def select(self, *cols: str) -> "_PostgresQuery":
        self._op = "select"
        if cols and cols != ("*",):
            self._cols = ", ".join(cols)
        return self

    def eq(self, c, v): self._wheres.append((f"{c} = {{}}", v)); return self
    def neq(self, c, v): self._wheres.append((f"{c} <> {{}}", v)); return self
    def in_(self, c, v): self._wheres.append((f"{c} = ANY({{}})", list(v))); return self
    def gte(self, c, v): self._wheres.append((f"{c} >= {{}}", v)); return self
    def lte(self, c, v): self._wheres.append((f"{c} <= {{}}", v)); return self
    def ilike(self, c, v): self._wheres.append((f"{c} ILIKE {{}}", v)); return self

    def order(self, c, desc=False): self._order = (c, desc); return self
    def limit(self, n): self._limit_n = n; return self
    def single(self): self._single = True; return self
    def maybe_single(self): self._single = True; return self

    # write
    def insert(self, payload): self._op = "insert"; self._payload = payload; return self
    def update(self, payload): self._op = "update"; self._payload = payload; return self
    def upsert(self, payload, on_conflict="id"):
        self._op = "upsert"; self._payload = payload; self._on_conflict = on_conflict; return self
    def delete(self): self._op = "delete"; return self

    def _where_sql(self, start: int) -> tuple[str, list]:
        if not self._wheres:
            return "", []
        clauses, params = [], []
        i = start
        for frag, val in self._wheres:
            clauses.append(frag.format(f"${i}"))
            params.append(val)
            i += 1
        return " WHERE " + " AND ".join(clauses), params

    async def execute(self) -> Resp:
        async with self._pool.acquire() as conn:
            if self._op == "select":
                where, params = self._where_sql(1)
                sql = f"SELECT {self._cols} FROM {self._table}{where}"
                if self._order:
                    sql += f" ORDER BY {self._order[0]} {'DESC' if self._order[1] else 'ASC'} NULLS LAST"
                if self._limit_n is not None:
                    sql += f" LIMIT {int(self._limit_n)}"
                rows = [dict(r) for r in await conn.fetch(sql, *params)]
                return Resp((rows[0] if rows else None) if self._single else rows)

            if self._op in ("insert", "upsert"):
                items = self._payload if isinstance(self._payload, list) else [self._payload]
                out = []
                for item in items:
                    cols = list(item.keys())
                    placeholders = ", ".join(f"${i+1}" for i in range(len(cols)))
                    sql = f"INSERT INTO {self._table} ({', '.join(cols)}) VALUES ({placeholders})"
                    if self._op == "upsert":
                        updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in cols if c != self._on_conflict)
                        sql += f" ON CONFLICT ({self._on_conflict}) DO UPDATE SET {updates}"
                    sql += " RETURNING *"
                    row = await conn.fetchrow(sql, *[item[c] for c in cols])
                    out.append(dict(row) if row else item)
                return Resp(out if isinstance(self._payload, list) else out[0])

            if self._op == "update":
                cols = list(self._payload.keys())
                set_sql = ", ".join(f"{c} = ${i+1}" for i, c in enumerate(cols))
                where, wparams = self._where_sql(len(cols) + 1)
                sql = f"UPDATE {self._table} SET {set_sql}{where} RETURNING *"
                rows = await conn.fetch(sql, *[self._payload[c] for c in cols], *wparams)
                return Resp([dict(r) for r in rows])

            if self._op == "delete":
                where, params = self._where_sql(1)
                sql = f"DELETE FROM {self._table}{where} RETURNING *"
                rows = await conn.fetch(sql, *params)
                return Resp([dict(r) for r in rows])

        return Resp(None)


class PostgresRepo:
    def __init__(self, pool: Any) -> None:
        self._pool = pool
        log.info("Using Postgres database (asyncpg, direct connection).")

    def table(self, name: str) -> _PostgresQuery:
        return _PostgresQuery(self._pool, name)

    async def rpc(self, fn: str, params: dict) -> Resp:
        async with self._pool.acquire() as conn:
            keys = list(params.keys())
            arglist = ", ".join(f"{k} => ${i+1}" for i, k in enumerate(keys))
            rows = await conn.fetch(f"SELECT * FROM {fn}({arglist})", *[params[k] for k in keys])
            return Resp([dict(r) for r in rows])


async def _make_pg_pool(dsn: str):
    import json as _json

    import asyncpg

    async def init(conn):
        # Treat uuid/timestamps as text both ways so the app speaks ISO strings
        # everywhere (matching MemoryRepo + the frontend), and jsonb as dict/list.
        await conn.set_type_codec("uuid", encoder=str, decoder=str, schema="pg_catalog", format="text")
        for t in ("timestamptz", "timestamp", "date"):
            await conn.set_type_codec(t, encoder=str, decoder=str, schema="pg_catalog", format="text")
        for t in ("json", "jsonb"):
            await conn.set_type_codec(t, encoder=_json.dumps, decoder=_json.loads,
                                      schema="pg_catalog", format="text")
        await conn.set_type_codec("numeric", encoder=str, decoder=float, schema="pg_catalog", format="text")

    # Supabase requires TLS. Ensure sslmode=require unless already specified.
    if "sslmode=" not in dsn:
        dsn = dsn + ("&" if "?" in dsn else "?") + "sslmode=require"
    return await asyncpg.create_pool(dsn=dsn, min_size=1, max_size=8, init=init,
                                     statement_cache_size=0)


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------
_repo: "MemoryRepo | SupabaseRepo | PostgresRepo | None" = None


async def init_db() -> None:
    global _repo
    # 1) Direct Postgres (DATABASE_URL) — preferred for the backend.
    if settings.postgres_enabled:
        try:
            pool = await _make_pg_pool(settings.database_url)
            _repo = PostgresRepo(pool)
            return
        except Exception as exc:  # pragma: no cover
            log.error("Postgres init failed: %s", exc)
            if not settings.mock_allowed:
                _repo = None
                return
    # 2) Supabase REST (service role).
    if settings.supabase_rest_enabled:
        try:
            from supabase import acreate_client

            client = await acreate_client(settings.supabase_url, settings.supabase_service_role_key)
            _repo = SupabaseRepo(client)
            return
        except Exception as exc:  # pragma: no cover
            log.error("Supabase init failed: %s", exc)
            if not settings.mock_allowed:
                _repo = None
                return
    if settings.mock_allowed:
        _repo = MemoryRepo()
    else:
        # Boot anyway so /health + Settings can report the gap; data calls 503.
        _repo = None
        log.error("Supabase not configured — data endpoints will return 503 until keys are set.")


def get_db() -> MemoryRepo | SupabaseRepo:
    if _repo is None:
        from app.core.config import IntegrationNotConfigured

        raise IntegrationNotConfigured(
            "Supabase is not configured. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY "
            "in .env (apply supabase/migrations first), or REVENUEOS_ALLOW_MOCK=true for dev."
        )
    return _repo
