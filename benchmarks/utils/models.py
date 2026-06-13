from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class MethodEndpoint(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    path: str
    query_param: str = "q"
    extra_params: dict[str, str] | None = None


class BenchmarkRow(BaseModel):
    query: str
    method: str
    rank: int = Field(ge=1)
    post_id: str | None = None
    latency_ms: float
    text: str
    tags: str = ""
    llm_score: float | None = None
    llm_reason: str | None = None
    rerank_score: float | None = None
    rerank_source: str | None = None


class ScoreSummary(BaseModel):
    count: int
    average: float | None
    median: float | None
    min: float | None
    max: float | None


class MethodMetrics(BaseModel):
    llm: ScoreSummary
    rerank: ScoreSummary
    llm_distribution: dict[str, int]
    llm_average_minus_random: float | None = None
    rerank_average_minus_random: float | None = None
    llm_average_minus_bm25: float | None = None
    rerank_average_minus_bm25: float | None = None
    llm_average_minus_vector: float | None = None
    rerank_average_minus_vector: float | None = None


class BenchmarkConfig(BaseModel):
    base_url: str
    database_url: str | None
    random_source: Literal["database", "api"]
    top_k: int
    seed: int
    queries: list[str]
    methods: list[str]


class BenchmarkOutput(BaseModel):
    config: BenchmarkConfig
    metrics: dict[str, MethodMetrics]
    disagreements: list[BenchmarkRow]
    rows: list[BenchmarkRow]


class RecommendationProfile(BaseModel):
    username: str
    password: str
    preferences: str


class RecommendationRow(BaseModel):
    username: str
    preferences: str
    method: str
    rank: int = Field(ge=1)
    post_id: str | None = None
    latency_ms: float
    text: str
    tags: str = ""
    llm_score: float | None = None
    llm_reason: str | None = None
    match_type: str | None = None
    rerank_score: float | None = None
    rerank_source: str | None = None


class RecommendationRankingMetrics(BaseModel):
    precision_at_k: float | None
    hit_rate_at_k: float | None
    ndcg_at_k: float | None
    highly_relevant_rate_at_k: float | None
    useful_feed_rate: float | None = None
    unrelated_rate: float | None = None
    match_type_distribution: dict[str, int] = Field(default_factory=dict)


class RecommendationMethodMetrics(BaseModel):
    llm: ScoreSummary
    rerank: ScoreSummary
    ranking: RecommendationRankingMetrics
    llm_distribution: dict[str, int]
    llm_average_minus_random: float | None = None
    rerank_average_minus_random: float | None = None
    precision_at_k_minus_random: float | None = None
    ndcg_at_k_minus_random: float | None = None


class RecommendationBenchmarkConfig(BaseModel):
    base_url: str
    database_url: str | None
    random_source: Literal["database", "api"]
    top_k: int
    pages: int
    batch_sample_posts: int
    max_batches: int
    skip_collect: bool = False
    collection_cache: str | None = None
    seed: int
    profiles: list[str]
    methods: list[str]
    relevant_threshold: float
    highly_relevant_threshold: float


class RecommendationBenchmarkOutput(BaseModel):
    config: RecommendationBenchmarkConfig
    metrics: dict[str, RecommendationMethodMetrics]
    disagreements: list[RecommendationRow]
    rows: list[RecommendationRow]


JsonObject = dict[str, Any]
