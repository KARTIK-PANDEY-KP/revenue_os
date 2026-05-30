"""Cognee — persistent agent memory + knowledge graph.

Resolution order:
  1. Native ``cognee`` Python SDK (if installed + configured)
  2. Cognee REST API (cloud or self-hosted server)
  3. In-memory graph mock (keyword recall) so memory "works" offline

The memory layer stores company/contact/signal/call/email context and answers
"why is X a priority?" by recalling related nodes.
"""
from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("cognee")

# Cognee's local (LadybugDB) engine is single-writer; serialize all native ops
# through this lock so concurrent requests/background tasks queue instead of
# colliding on the on-disk lock file.
_NATIVE_LOCK = asyncio.Lock()


class _MemoryGraph:
    """Tiny in-memory stand-in for the knowledge graph."""

    def __init__(self) -> None:
        # dataset -> list of {text, meta}
        self._docs: dict[str, list[dict[str, Any]]] = {}
        # simple edge list for graph queries
        self._edges: list[dict[str, Any]] = []

    def add(self, text: str, dataset: str, meta: dict | None = None) -> None:
        self._docs.setdefault(dataset, []).append({"text": text, "meta": meta or {}})

    def add_edge(self, src: str, rel: str, dst: str) -> None:
        self._edges.append({"src": src, "rel": rel, "dst": dst})

    def search(self, query: str, dataset: str | None = None, limit: int = 8) -> list[dict[str, Any]]:
        terms = {t for t in query.lower().split() if len(t) > 2}
        pool: list[dict] = []
        datasets = [dataset] if dataset else list(self._docs.keys())
        for ds in datasets:
            pool.extend(self._docs.get(ds, []))
        scored = []
        for d in pool:
            score = sum(1 for t in terms if t in d["text"].lower())
            if score:
                scored.append((score, d))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [{"text": d["text"], "meta": d["meta"], "score": s} for s, d in scored[:limit]]

    def neighbors(self, node: str) -> list[dict[str, Any]]:
        return [e for e in self._edges if e["src"] == node or e["dst"] == node]


class CogneeClient:
    def __init__(self) -> None:
        self._mode = "mock"
        self._graph = _MemoryGraph()
        self._native = None
        if settings.cognee_enabled:
            prefer_native = settings.cognee_native or not settings.cognee_api_key
            if prefer_native:
                try:
                    import cognee  # type: ignore

                    self._native = cognee
                    self._mode = "native"
                    log.info("Cognee native SDK enabled (local engine).")
                except Exception as exc:
                    log.error("Cognee native import failed (%s); trying REST.", exc)
                    self._mode = "rest" if not settings.cognee_native else "mock"
            else:
                self._mode = "rest"
                log.info("Cognee REST mode (%s).", settings.cognee_api_url)
        elif settings.mock_allowed:
            log.warning("Cognee disabled — REVENUEOS_ALLOW_MOCK on, in-memory graph.")

    @property
    def mode(self) -> str:
        return self._mode

    def _headers(self) -> dict[str, str]:
        h = {"Content-Type": "application/json"}
        if settings.cognee_api_key:
            h["Authorization"] = f"Bearer {settings.cognee_api_key}"
        return h

    @property
    def enabled(self) -> bool:
        return self._mode in ("native", "rest")

    # --- write -----------------------------------------------------------------
    async def remember(self, text: str, *, dataset: str = "default", meta: dict | None = None) -> bool:
        settings.require("Cognee", self.enabled)
        """Persist a memory and (in real mode) cognify it into the graph."""
        if self._mode == "native":
            try:
                # Cognee's local engine is single-writer — serialize all native
                # ops so concurrent research/drafting don't collide on its file lock.
                async with _NATIVE_LOCK:
                    await self._native.add(text, dataset_name=dataset)
                    await self._native.cognify(datasets=[dataset])
                return True
            except Exception as exc:  # pragma: no cover
                log.error("cognee native add failed: %s", exc)
                return False
        if self._mode == "rest":
            try:
                async with httpx.AsyncClient(timeout=60) as c:
                    await c.post(f"{settings.cognee_api_url}/add",
                                 json={"data": text, "dataset_name": dataset}, headers=self._headers())
                    await c.post(f"{settings.cognee_api_url}/cognify",
                                 json={"datasets": [dataset]}, headers=self._headers())
                return True
            except Exception as exc:  # pragma: no cover
                log.error("cognee REST add failed (%s); buffering in memory.", exc)
        self._graph.add(text, dataset, meta)
        return True

    async def relate(self, src: str, rel: str, dst: str) -> None:
        """Record a typed relationship (Company HAS_SIGNAL Signal, etc.)."""
        self._graph.add_edge(src, rel, dst)

    # --- read ------------------------------------------------------------------
    async def search(self, query: str, *, dataset: str | None = None, limit: int = 8) -> list[dict[str, Any]]:
        settings.require("Cognee", self.enabled)
        if self._mode == "native":
            try:
                from cognee.api.v1.search import SearchType  # type: ignore

                # GRAPH_COMPLETION returns a graph-grounded natural-language answer.
                async with _NATIVE_LOCK:
                    res = await self._native.search(query_type=SearchType.GRAPH_COMPLETION, query_text=query)
                items = res if isinstance(res, list) else [res]
                out: list[dict[str, Any]] = []
                for r in items:
                    if isinstance(r, dict) and "search_result" in r:
                        for ans in (r["search_result"] or []):
                            out.append({"text": str(ans), "meta": {"dataset": r.get("dataset_name")},
                                        "score": 1.0})
                    elif r:
                        out.append({"text": str(r), "meta": {}, "score": 1.0})
                return out[:limit]
            except Exception as exc:  # pragma: no cover
                log.error("cognee native search failed: %s", exc)
        if self._mode == "rest":
            try:
                async with httpx.AsyncClient(timeout=60) as c:
                    r = await c.post(f"{settings.cognee_api_url}/search",
                                     json={"query": query, "search_type": "INSIGHTS"},
                                     headers=self._headers())
                    r.raise_for_status()
                    data = r.json()
                    items = data if isinstance(data, list) else data.get("results", [])
                    return [{"text": str(i), "meta": {}, "score": 1.0} for i in items][:limit]
            except Exception as exc:  # pragma: no cover
                log.error("cognee REST search failed (%s); using memory.", exc)
        return self._graph.search(query, dataset, limit)

    async def graph_neighbors(self, node_id: str) -> list[dict[str, Any]]:
        return self._graph.neighbors(node_id)


cognee_client = CogneeClient()
