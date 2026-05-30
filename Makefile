# ============================================================================
# RevenueOS — developer convenience targets
# ============================================================================
.DEFAULT_GOAL := help
SHELL := /bin/bash

BACKEND_DIR := backend
FRONTEND_DIR := frontend
TRIGGER_DIR := trigger
VENV := $(BACKEND_DIR)/.venv

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[1m%-18s\033[0m %s\n", $$1, $$2}'

# ---- Setup ----------------------------------------------------------------
.PHONY: setup
setup: setup-backend setup-frontend ## Install everything (backend + frontend)

.PHONY: setup-backend
setup-backend: ## Create venv + install backend deps (Python 3.12)
	cd $(BACKEND_DIR) && uv venv --python 3.12 .venv && \
	  source .venv/bin/activate && uv pip install -e ".[dev]"

.PHONY: setup-frontend
setup-frontend: ## Install frontend deps
	cd $(FRONTEND_DIR) && npm install

.PHONY: setup-trigger
setup-trigger: ## Install Trigger.dev project deps
	cd $(TRIGGER_DIR) && npm install

# ---- Run ------------------------------------------------------------------
.PHONY: backend
backend: ## Run the FastAPI backend (:8000)
	cd $(BACKEND_DIR) && source .venv/bin/activate && \
	  uvicorn app.main:app --reload --port $${BACKEND_PORT:-8000}

.PHONY: frontend
frontend: ## Run the Next.js frontend (:3000)
	cd $(FRONTEND_DIR) && npm run dev

.PHONY: trigger
trigger: ## Run Trigger.dev dev server
	cd $(TRIGGER_DIR) && npx trigger.dev@latest dev

.PHONY: dev
dev: ## Run backend + frontend together
	@./scripts/dev.sh

# ---- Quality --------------------------------------------------------------
.PHONY: test
test: ## Run backend tests (forced mock, no keys needed)
	cd $(BACKEND_DIR) && source .venv/bin/activate && REVENUEOS_FORCE_MOCK=true python -m pytest -q

.PHONY: build
build: ## Production-build the frontend
	cd $(FRONTEND_DIR) && npm run build

.PHONY: lint
lint: ## Lint backend (ruff) + frontend typecheck
	cd $(BACKEND_DIR) && source .venv/bin/activate && ruff check app || true
	cd $(FRONTEND_DIR) && npx tsc --noEmit || true

# ---- Database -------------------------------------------------------------
.PHONY: db-migrate
db-migrate: ## Apply all Supabase migrations (needs $DATABASE_URL)
	@for f in supabase/migrations/*.sql; do echo "→ $$f"; psql "$$DATABASE_URL" -f "$$f"; done

.PHONY: db-seed
db-seed: ## Load demo seed data (needs $DATABASE_URL)
	psql "$$DATABASE_URL" -f supabase/seed/demo_seed.sql

# ---- Infra ----------------------------------------------------------------
.PHONY: cognee
cognee: ## Start a self-hosted Cognee server via docker
	docker compose up -d cognee

.PHONY: down
down: ## Stop docker services
	docker compose down
