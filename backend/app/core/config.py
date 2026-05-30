"""Central configuration.

Every integration is *optional*. When its key is missing (or REVENUEOS_FORCE_MOCK
is set), the corresponding client transparently returns high-quality mock data so
the entire product runs end-to-end before a single key is provisioned.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Populate os.environ from .env so third-party libs that read the environment
# directly (Cognee, LiteLLM) see the same config our Settings does.
try:
    from dotenv import load_dotenv

    load_dotenv(".env")
    load_dotenv("../.env")
except Exception:  # pragma: no cover
    pass


class IntegrationNotConfigured(RuntimeError):
    """Raised when a real sponsor integration is used without its key (and mocks
    are not explicitly enabled). Surfaced to the API as HTTP 503."""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- App ----
    backend_port: int = 8000
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:3000"
    # Real providers are the default and only path. `allow_mock` is an explicit,
    # OFF-by-default escape hatch for offline development ONLY — when false (the
    # default) a missing key raises a clear error instead of serving fake data.
    allow_mock: bool = Field(default=False, alias="REVENUEOS_ALLOW_MOCK")
    force_mock: bool = Field(default=False, alias="REVENUEOS_FORCE_MOCK")
    # Demo seed only loads when explicitly opted in (and never against Supabase).
    load_demo_data: bool = Field(default=False, alias="REVENUEOS_LOAD_DEMO_DATA")
    log_level: str = "INFO"

    # ---- LLM (Claude) ----
    anthropic_api_key: str = ""
    llm_model_deep: str = "claude-opus-4-8"
    llm_model_balanced: str = "claude-sonnet-4-6"
    llm_model_fast: str = "claude-haiku-4-5-20251001"

    # ---- Bright Data ----
    brightdata_api_token: str = ""
    brightdata_mcp_url: str = "https://mcp.brightdata.com/sse"
    brightdata_web_unlocker_zone: str = "web_unlocker"
    brightdata_serp_zone: str = "serp_api"
    brightdata_browser_zone: str = "scraping_browser"

    # ---- Cognee ----
    cognee_api_key: str = ""
    cognee_api_url: str = "https://api.cognee.ai"
    cognee_llm_provider: str = "anthropic"
    # Native/local engine (cognee Python SDK persists locally; no key needed).
    cognee_native: bool = Field(default=False, alias="COGNEE_NATIVE")

    # ---- Trigger.dev ----
    trigger_project_ref: str = ""
    trigger_secret_key: str = ""
    trigger_api_url: str = "https://api.trigger.dev"
    trigger_access_token: str = ""

    # ---- Speechmatics ----
    speechmatics_api_key: str = ""
    speechmatics_rt_url: str = "wss://eu2.rt.speechmatics.com/v2"

    # ---- LiveKit ----
    livekit_url: str = ""
    livekit_api_key: str = ""
    livekit_api_secret: str = ""

    # ---- Supabase ----
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_project_ref: str = ""
    database_url: str = ""

    # Fixed demo team id (matches supabase/seed/demo_seed.sql)
    demo_team_id: str = "00000000-0000-0000-0000-0000000000aa"

    # ---- Feature flags (derived) ----
    @property
    def llm_enabled(self) -> bool:
        return bool(self.anthropic_api_key) and not self.force_mock

    @property
    def brightdata_enabled(self) -> bool:
        return bool(self.brightdata_api_token) and not self.force_mock

    @property
    def brightdata_serp_enabled(self) -> bool:
        # SERP requires its own zone; when absent we fall back to Web-Unlocker-only
        # research (scrape derived company pages directly).
        return self.brightdata_enabled and bool(self.brightdata_serp_zone)

    @property
    def cognee_enabled(self) -> bool:
        # Live via: native local engine, a cloud key, OR a self-hosted URL.
        custom_url = bool(self.cognee_api_url) and self.cognee_api_url != "https://api.cognee.ai"
        return (self.cognee_native or bool(self.cognee_api_key) or custom_url) and not self.force_mock

    @property
    def trigger_enabled(self) -> bool:
        return bool(self.trigger_access_token or self.trigger_secret_key) and not self.force_mock

    @property
    def speechmatics_enabled(self) -> bool:
        return bool(self.speechmatics_api_key) and not self.force_mock

    @property
    def livekit_enabled(self) -> bool:
        return bool(self.livekit_api_key and self.livekit_api_secret and self.livekit_url)

    @property
    def supabase_enabled(self) -> bool:
        # Either a service-role REST setup OR a direct Postgres connection works.
        return bool(self.database_url) or bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def postgres_enabled(self) -> bool:
        return bool(self.database_url) and not self.force_mock

    @property
    def supabase_rest_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key) and not self.force_mock

    @property
    def mock_allowed(self) -> bool:
        """Whether mock fallbacks may be used at all (dev-only opt-in)."""
        return self.allow_mock or self.force_mock

    def require(self, name: str, enabled: bool) -> None:
        """Guard a real integration. Raises if the provider isn't configured and
        mocks aren't explicitly allowed — so demo data is NEVER served by default."""
        if not enabled and not self.mock_allowed:
            raise IntegrationNotConfigured(
                f"{name} is not configured. Set its API key in .env, or set "
                f"REVENUEOS_ALLOW_MOCK=true for offline development only."
            )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def integration_status(self) -> dict[str, bool]:
        """Surface which integrations are live vs mock — shown in /health & Settings."""
        return {
            "llm": self.llm_enabled,
            "brightdata": self.brightdata_enabled,
            "cognee": self.cognee_enabled,
            "trigger": self.trigger_enabled,
            "speechmatics": self.speechmatics_enabled,
            "livekit": self.livekit_enabled,
            "supabase": self.supabase_enabled,
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
