#!/usr/bin/env bash
# =============================================================================
# RevenueOS — one-command local launcher
#
#   ./start.sh
#
# Installs anything missing (backend venv + deps, frontend deps), then starts
# the backend (FastAPI) and frontend (Next.js) together. Ctrl-C stops both.
#
# Optional:
#   WITH_TRIGGER=1 ./start.sh   also starts the Trigger.dev dev server
#   BACKEND_PORT=8000 FRONTEND_PORT=3000 ./start.sh   override ports
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
WITH_TRIGGER="${WITH_TRIGGER:-0}"

# ---- pretty output ----------------------------------------------------------
bold() { printf "\033[1m%s\033[0m\n" "$1"; }
info() { printf "\033[36m▸\033[0m %s\n" "$1"; }
ok()   { printf "\033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "\033[33m!\033[0m %s\n" "$1"; }
die()  { printf "\033[31m✗ %s\033[0m\n" "$1"; exit 1; }

PIDS=()
cleanup() {
  echo ""
  info "Shutting down…"
  for pid in "${PIDS[@]:-}"; do kill "$pid" 2>/dev/null; done
  wait 2>/dev/null
  ok "Stopped."
}
trap cleanup EXIT INT TERM

port_busy() { lsof -ti "tcp:$1" >/dev/null 2>&1; }

bold "RevenueOS — local launcher"
echo "-----------------------------------------------"

# ---- prerequisites ----------------------------------------------------------
command -v uv   >/dev/null 2>&1 || die "uv not found. Install: https://docs.astral.sh/uv/"
command -v node >/dev/null 2>&1 || die "node not found. Install Node 20+."
command -v npm  >/dev/null 2>&1 || die "npm not found."

# ---- env files --------------------------------------------------------------
[ -f backend/.env ]        || { cp .env.example backend/.env;             warn "Created backend/.env from template — add your keys."; }
[ -f frontend/.env.local ] || { cp frontend/.env.local.example frontend/.env.local; info "Created frontend/.env.local from template."; }

# ---- backend setup ----------------------------------------------------------
if [ ! -d backend/.venv ]; then
  info "Creating backend venv (Python 3.12) + installing deps…"
  ( cd backend && uv venv --python 3.12 .venv >/dev/null 2>&1 && \
    source .venv/bin/activate && uv pip install -q -e ".[dev]" ) || die "backend install failed"
  ok "Backend deps installed."
else
  ok "Backend venv present."
fi

# ---- frontend setup ---------------------------------------------------------
if [ ! -d frontend/node_modules ]; then
  info "Installing frontend deps…"
  ( cd frontend && npm install --no-audit --no-fund >/dev/null 2>&1 ) || die "frontend install failed"
  ok "Frontend deps installed."
else
  ok "Frontend deps present."
fi

# ---- port checks ------------------------------------------------------------
port_busy "$BACKEND_PORT"  && die "Port $BACKEND_PORT (backend) is in use. Set BACKEND_PORT=… to override."
port_busy "$FRONTEND_PORT" && die "Port $FRONTEND_PORT (frontend) is in use. Set FRONTEND_PORT=… to override."

# ---- start backend ----------------------------------------------------------
info "Starting backend on :$BACKEND_PORT …"
( cd backend && source .venv/bin/activate && \
  exec uvicorn app.main:app --reload --port "$BACKEND_PORT" --log-level info ) &
PIDS+=($!)

# ---- start frontend ---------------------------------------------------------
info "Starting frontend on :$FRONTEND_PORT …"
( cd frontend && NEXT_PUBLIC_BACKEND_URL="http://localhost:$BACKEND_PORT" \
  exec npm run dev -- -p "$FRONTEND_PORT" ) &
PIDS+=($!)

# ---- optional Trigger.dev dev server ---------------------------------------
if [ "$WITH_TRIGGER" = "1" ]; then
  if [ -d trigger/node_modules ]; then
    info "Starting Trigger.dev dev server (requires prior `npx trigger.dev login`)…"
    ( cd trigger && exec npx trigger.dev@latest dev ) &
    PIDS+=($!)
  else
    warn "WITH_TRIGGER=1 but trigger/node_modules missing — run: (cd trigger && npm install)"
  fi
fi

echo "-----------------------------------------------"
ok "Backend:  http://localhost:$BACKEND_PORT  (docs at /docs, status at /health)"
ok "Frontend: http://localhost:$FRONTEND_PORT"
bold "Press Ctrl-C to stop everything."
echo ""

wait
