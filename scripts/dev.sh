#!/usr/bin/env bash
# Run the RevenueOS backend + frontend together with one command.
# Ctrl-C stops both.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

echo "▲ RevenueOS — starting backend (:$BACKEND_PORT) + frontend (:$FRONTEND_PORT)"

# Backend
(
  cd backend
  source .venv/bin/activate
  uvicorn app.main:app --reload --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

# Frontend
(
  cd frontend
  NEXT_PUBLIC_BACKEND_URL="http://localhost:$BACKEND_PORT" npm run dev
) &
FRONTEND_PID=$!

cleanup() {
  echo ""
  echo "Stopping…"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait
