from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SEARCH_QUERY_FILE = REPO_ROOT / "benchmarks" / "search" / "queries.json"
DEFAULT_SEARCH_OUT_DIR = REPO_ROOT / "benchmarks" / "search" / "results"
DEFAULT_RECOMMENDATION_PROFILE_FILE = (
    REPO_ROOT / "benchmarks" / "recommendation" / "profiles.json"
)
DEFAULT_RECOMMENDATION_OUT_DIR = REPO_ROOT / "benchmarks" / "recommendation" / "results"


class BenchmarkSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="TOIN_BENCH_",
        env_file=(REPO_ROOT / ".env", REPO_ROOT / ".env.benchmark"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    base_url: str = Field(
        default="https://api.toin.dev",
        validation_alias=AliasChoices("TOIN_BENCH_BASE_URL", "TOIN_API_BASE_URL"),
    )
    auth_path: str = "/api/auth/sign-in/email"
    email: str = Field(
        default="demo@gmail.com",
        validation_alias=AliasChoices("TOIN_BENCH_EMAIL", "TOIN_EMAIL"),
    )
    password: str = Field(
        default="Demo@123",
        validation_alias=AliasChoices("TOIN_BENCH_PASSWORD", "TOIN_PASSWORD"),
    )
    database_url: str = Field(
        default="postgresql://username:password@localhost:5432/database",
        validation_alias=AliasChoices("TOIN_BENCH_DATABASE_URL", "DATABASE_URL"),
    )
    random_source: Literal["database", "api"] = "database"
    queries: Path = DEFAULT_SEARCH_QUERY_FILE
    recommendation_profiles: Path = DEFAULT_RECOMMENDATION_PROFILE_FILE
    top_k: int = 5
    recommendation_top_k: int = 20
    recommendation_pages: int = 3
    recommendation_batch_sample_posts: int = 300
    recommendation_max_batches: int = 10
    seed: int = 2026
    timeout: float = 60.0
    out_dir: Path = DEFAULT_SEARCH_OUT_DIR
    recommendation_out_dir: Path = DEFAULT_RECOMMENDATION_OUT_DIR
    search_workers: int = 8
    llm_workers: int = 4
    rerank_workers: int = 4
    openai_model: str = Field(
        default="gpt-4.1-mini",
        validation_alias=AliasChoices("TOIN_BENCH_OPENAI_MODEL", "OPENAI_EVAL_MODEL"),
    )
    cloudflare_rerank_model: str = Field(
        default="@cf/baai/bge-reranker-base",
        validation_alias=AliasChoices(
            "TOIN_BENCH_CLOUDFLARE_RERANK_MODEL", "CLOUDFLARE_RERANK_MODEL"
        ),
    )
    openai_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("TOIN_BENCH_OPENAI_API_KEY", "OPENAI_API_KEY"),
    )
    cloudflare_account_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "TOIN_BENCH_CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"
        ),
    )
    cloudflare_auth_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "TOIN_BENCH_CLOUDFLARE_AUTH_TOKEN", "CLOUDFLARE_AUTH_TOKEN"
        ),
    )


def load_settings() -> BenchmarkSettings:
    # pydantic-settings reads environment and env files; this wrapper keeps the
    # call site decoupled from the concrete settings implementation.
    return BenchmarkSettings()


def settings_env_help() -> str:
    keys = [
        "TOIN_BENCH_BASE_URL",
        "TOIN_BENCH_AUTH_PATH",
        "TOIN_BENCH_EMAIL",
        "TOIN_BENCH_PASSWORD",
        "TOIN_BENCH_DATABASE_URL",
        "TOIN_BENCH_RANDOM_SOURCE",
        "TOIN_BENCH_QUERIES",
        "TOIN_BENCH_RECOMMENDATION_PROFILES",
        "TOIN_BENCH_TOP_K",
        "TOIN_BENCH_RECOMMENDATION_TOP_K",
        "TOIN_BENCH_RECOMMENDATION_PAGES",
        "TOIN_BENCH_RECOMMENDATION_BATCH_SAMPLE_POSTS",
        "TOIN_BENCH_RECOMMENDATION_MAX_BATCHES",
        "TOIN_BENCH_SEED",
        "TOIN_BENCH_TIMEOUT",
        "TOIN_BENCH_OUT_DIR",
        "TOIN_BENCH_RECOMMENDATION_OUT_DIR",
        "TOIN_BENCH_SEARCH_WORKERS",
        "TOIN_BENCH_LLM_WORKERS",
        "TOIN_BENCH_RERANK_WORKERS",
        "TOIN_BENCH_OPENAI_MODEL",
        "TOIN_BENCH_OPENAI_API_KEY",
        "TOIN_BENCH_CLOUDFLARE_ACCOUNT_ID",
        "TOIN_BENCH_CLOUDFLARE_AUTH_TOKEN",
        "TOIN_BENCH_CLOUDFLARE_RERANK_MODEL",
    ]
    aliases = [
        "TOIN_API_BASE_URL",
        "TOIN_EMAIL",
        "TOIN_PASSWORD",
        "DATABASE_URL",
        "OPENAI_API_KEY",
        "OPENAI_EVAL_MODEL",
        "CLOUDFLARE_ACCOUNT_ID",
        "CLOUDFLARE_AUTH_TOKEN",
        "CLOUDFLARE_RERANK_MODEL",
    ]
    return "Environment variables: " + ", ".join(keys + aliases)
