#!/usr/bin/env python3
"""Offline benchmark runner for Toin recommendations."""

from __future__ import annotations

import argparse
import csv
import json
import math
import random
import statistics
import sys
import time
import urllib.parse
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

from tqdm.contrib.concurrent import process_map

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from benchmarks.search.search_benchmark import (  # noqa: E402
    HttpClient,
    HttpError,
    bucket_llm,
    fetch_visible_pool,
    fetch_visible_pool_from_database,
    summarize,
)
from benchmarks.utils.llm import openai_recommendation_grade  # noqa: E402
from benchmarks.utils.models import (  # noqa: E402
    MethodEndpoint,
    RecommendationBenchmarkConfig,
    RecommendationBenchmarkOutput,
    RecommendationMethodMetrics,
    RecommendationProfile,
    RecommendationRankingMetrics,
    RecommendationRow,
)
from benchmarks.utils.posts import post_metadata, post_text  # noqa: E402
from benchmarks.utils.rerank import cloudflare_rerank_scores  # noqa: E402
from benchmarks.utils.settings import load_settings, settings_env_help  # noqa: E402


DEFAULT_RELEVANT_THRESHOLD = 61.0
DEFAULT_HIGHLY_RELEVANT_THRESHOLD = 81.0


@dataclass(frozen=True)
class RecommendationBatch:
    username: str
    preferences: str
    method: str
    batch_index: int
    posts: list[dict[str, Any]]
    latency_ms: float


@dataclass(frozen=True)
class CollectedRecommendationBatch:
    profile_index: int
    method_index: int
    batch_index: int
    posts: list[dict[str, Any]]
    latency_ms: float


def batch_to_cache_entry(batch: RecommendationBatch) -> dict[str, Any]:
    return {
        "username": batch.username,
        "preferences": batch.preferences,
        "method": batch.method,
        "batch_index": batch.batch_index,
        "latency_ms": batch.latency_ms,
        "posts": batch.posts,
    }


def write_collection_cache(path: Path, batches: list[RecommendationBatch]) -> None:
    payload = {
        "version": 1,
        "batches": [batch_to_cache_entry(batch) for batch in batches],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, default=json_default),
        encoding="utf-8",
    )


def json_default(value: Any) -> str:
    if isinstance(value, datetime | date):
        return value.isoformat()
    return str(value)


def load_collection_cache(path: Path) -> list[RecommendationBatch]:
    if not path.exists():
        raise FileNotFoundError(
            f"Collection cache does not exist: {path}. Run once without "
            "--skip-collect to create it."
        )
    payload = json.loads(path.read_text(encoding="utf-8"))
    data = payload.get("batches") if isinstance(payload, dict) else None
    if not isinstance(data, list):
        raise ValueError(f"Collection cache has invalid format: {path}")

    batches: list[RecommendationBatch] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        posts = item.get("posts")
        if not isinstance(posts, list):
            posts = []
        batches.append(
            RecommendationBatch(
                username=str(item.get("username") or ""),
                preferences=str(item.get("preferences") or ""),
                method=str(item.get("method") or ""),
                batch_index=int(item.get("batch_index") or 0),
                latency_ms=float(item.get("latency_ms") or 0.0),
                posts=[post for post in posts if isinstance(post, dict)],
            )
        )
    if not batches:
        raise ValueError(f"Collection cache has no usable batches: {path}")
    return batches


def batch_method_names(batches: list[RecommendationBatch]) -> list[str]:
    methods: list[str] = []
    seen: set[str] = set()
    for batch in batches:
        if batch.method and batch.method not in seen:
            seen.add(batch.method)
            methods.append(batch.method)
    return methods


def load_profiles(path: Path | None) -> list[RecommendationProfile]:
    if path is None:
        raise ValueError("Profile file path is required")
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and isinstance(data.get("users"), list):
        data = data["users"]
    if not isinstance(data, list):
        raise ValueError('Profile file must be a JSON array or {"users": [...]} object')
    return [RecommendationProfile.model_validate(item) for item in data]


def parse_method(value: str) -> MethodEndpoint:
    name, sep, spec = value.partition("=")
    if not sep or not name or not spec:
        raise argparse.ArgumentTypeError(
            "Method must use name=path format, for example following=/posts/following"
        )
    parsed = urllib.parse.urlparse(spec)
    extra = dict(urllib.parse.parse_qsl(parsed.query))
    path = parsed.path or spec
    return MethodEndpoint(name=name, path=path, extra_params=extra)


def fetch_method_results(
    client: HttpClient,
    endpoint: MethodEndpoint,
    top_k: int,
    pages: int,
) -> list[dict[str, Any]]:
    posts: list[dict[str, Any]] = []
    cursor: str | None = None
    for _ in range(max(1, pages)):
        params: dict[str, Any] = {"limit": top_k, "cursor": cursor}
        if endpoint.extra_params:
            params.update(endpoint.extra_params)
        data = client.get_json(endpoint.path, params=params)
        next_cursor = None
        if isinstance(data, dict) and isinstance(data.get("items"), list):
            page_posts = data["items"]
            next_cursor_value = data.get("nextCursor")
            if isinstance(next_cursor_value, str) and next_cursor_value:
                next_cursor = next_cursor_value
        elif isinstance(data, list):
            page_posts = data
        else:
            raise HttpError(
                f"Method {endpoint.name} returned neither a list nor an items page"
            )

        posts.extend(p for p in page_posts[:top_k] if isinstance(p, dict))
        if not next_cursor:
            break
        cursor = next_cursor
    return posts


def fetch_method_results_with_token(
    base_url: str,
    timeout: float,
    token: str | None,
    endpoint: MethodEndpoint,
    top_k: int,
    pages: int,
) -> list[dict[str, Any]]:
    client = HttpClient(base_url, timeout)
    client.token = token
    return fetch_method_results(client, endpoint, top_k, pages)


def post_dedupe_key(post: dict[str, Any]) -> str:
    post_id = post.get("id")
    if post_id:
        return f"id:{post_id}"
    return f"text:{post_text(post)[:1000]}"


def collect_recommendation_worker(
    item: tuple[int, int, MethodEndpoint, str, float, str | None, int, int, int, int],
) -> tuple[int, int, list[CollectedRecommendationBatch]]:
    (
        profile_index,
        method_index,
        method,
        base_url,
        timeout,
        token,
        top_k,
        pages,
        batch_sample_posts,
        max_batches,
    ) = item

    batches: list[CollectedRecommendationBatch] = []
    seen_posts: set[str] = set()
    batch_limit = max(1, max_batches)
    for batch_index in range(batch_limit):
        started = time.perf_counter()
        posts = fetch_method_results_with_token(
            base_url, timeout, token, method, top_k, pages
        )
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        if not posts:
            break

        unique_posts: list[dict[str, Any]] = []
        for post in posts:
            key = post_dedupe_key(post)
            if key in seen_posts:
                continue
            seen_posts.add(key)
            unique_posts.append(post)

        if not unique_posts:
            break

        batches.append(
            CollectedRecommendationBatch(
                profile_index=profile_index,
                method_index=method_index,
                batch_index=batch_index,
                posts=unique_posts,
                latency_ms=latency_ms,
            )
        )
        if len(seen_posts) > batch_sample_posts:
            break

    return profile_index, method_index, batches


def authenticate_worker(
    item: tuple[int, str, str, str, str, float],
) -> tuple[int, str, str]:
    profile_index, base_url, auth_path, username, password, timeout = item
    client = HttpClient(base_url, timeout)
    token = client.authenticate(auth_path, username, password)
    return profile_index, username, token


def llm_grade_worker(
    item: tuple[str, str, str, int, int, dict[str, Any], str, str, float],
) -> tuple[str, str, int, int, float, str, str]:
    username, preferences, method, batch_index, rank, post, api_key, model, timeout = (
        item
    )
    score, reason, match_type = openai_recommendation_grade(
        preferences,
        post,
        api_key=api_key,
        model=model,
        timeout=timeout,
    )
    return username, method, batch_index, rank, score, reason, match_type


def cloudflare_rerank_worker(
    item: tuple[str, str, str, int, list[dict[str, Any]], str, str, str, float],
) -> tuple[str, str, int, list[float]]:
    (
        username,
        preferences,
        method,
        batch_index,
        posts,
        account_id,
        auth_token,
        model,
        timeout,
    ) = item
    if not posts:
        return username, method, batch_index, []
    scores = cloudflare_rerank_scores(
        preferences,
        posts,
        account_id=account_id,
        auth_token=auth_token,
        model=model,
        timeout=timeout,
    )
    return username, method, batch_index, scores


def write_csv(path: Path, rows: list[RecommendationRow]) -> None:
    columns = [
        "username",
        "method",
        "rank",
        "post_id",
        "latency_ms",
        "llm_score",
        "rerank_score",
        "match_type",
        "text",
        "tags",
        "llm_reason",
        "preferences",
    ]
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            dumped = row.model_dump()
            writer.writerow({key: dumped.get(key) for key in columns})


def create_rows_for_batch(batch: RecommendationBatch) -> list[RecommendationRow]:
    return [
        RecommendationRow(
            username=batch.username,
            preferences=batch.preferences,
            method=batch.method,
            rank=rank,
            post_id=str(post.get("id")) if post.get("id") else None,
            latency_ms=batch.latency_ms,
            text=post_text(post)[:500],
            tags=post_metadata(post),
        )
        for rank, post in enumerate(batch.posts, start=1)
    ]


def batch_average_llm(rows: list[RecommendationRow]) -> float:
    scores = [float(row.llm_score) for row in rows if row.llm_score is not None]
    return statistics.fmean(scores) if scores else float("-inf")


def selected_output_rows(
    batches: list[RecommendationBatch],
    batch_rows: dict[tuple[str, str, int], list[RecommendationRow]],
    *,
    batch_sample_posts: int,
) -> list[RecommendationRow]:
    by_group: dict[tuple[str, str], list[RecommendationBatch]] = {}
    for batch in batches:
        by_group.setdefault((batch.username, batch.method), []).append(batch)

    selected_rows: list[RecommendationRow] = []
    for group_batches in by_group.values():
        ranked_batches = sorted(
            group_batches,
            key=lambda batch: (
                batch_average_llm(
                    batch_rows[(batch.username, batch.method, batch.batch_index)]
                ),
                -batch.batch_index,
            ),
            reverse=True,
        )

        selected_for_group: list[RecommendationRow] = []
        for batch in ranked_batches:
            selected_for_group.extend(
                batch_rows[(batch.username, batch.method, batch.batch_index)]
            )
            if len(selected_for_group) >= batch_sample_posts:
                break

        for output_rank, row in enumerate(selected_for_group, start=1):
            row.rank = output_rank
            selected_rows.append(row)

    return selected_rows


def ndcg(scores: list[float], relevant_threshold: float) -> float | None:
    if not scores:
        return None
    gains = [max(0.0, score - relevant_threshold + 1.0) for score in scores]
    dcg = sum(gain / math.log2(index + 2) for index, gain in enumerate(gains))
    ideal = sorted(gains, reverse=True)
    idcg = sum(gain / math.log2(index + 2) for index, gain in enumerate(ideal))
    return None if idcg == 0 else dcg / idcg


def build_metrics(
    rows: list[RecommendationRow],
    *,
    relevant_threshold: float,
    highly_relevant_threshold: float,
) -> dict[str, RecommendationMethodMetrics]:
    by_method: dict[str, list[RecommendationRow]] = {}
    for row in rows:
        by_method.setdefault(row.method, []).append(row)

    metrics: dict[str, RecommendationMethodMetrics] = {}
    for method, method_rows in by_method.items():
        llm_values = [r.llm_score for r in method_rows if r.llm_score is not None]
        rerank_values = [
            r.rerank_score for r in method_rows if r.rerank_score is not None
        ]
        distribution: dict[str, int] = {}
        for score in llm_values:
            distribution[bucket_llm(float(score))] = (
                distribution.get(bucket_llm(float(score)), 0) + 1
            )
        match_type_distribution: dict[str, int] = {}
        for row in method_rows:
            match_type = row.match_type or "unrelated"
            match_type_distribution[match_type] = (
                match_type_distribution.get(match_type, 0) + 1
            )
        useful_match_types = {"direct", "adjacent", "community", "explore"}
        useful_count = sum(
            count
            for match_type, count in match_type_distribution.items()
            if match_type in useful_match_types
        )
        unrelated_count = match_type_distribution.get("unrelated", 0)
        method_row_count = len(method_rows)

        per_user_scores: dict[str, list[float]] = {}
        for row in method_rows:
            if row.llm_score is not None:
                per_user_scores.setdefault(row.username, []).append(
                    float(row.llm_score)
                )

        precision_values = []
        hit_values = []
        ndcg_values = []
        highly_relevant_values = []
        for scores in per_user_scores.values():
            relevant_count = sum(score >= relevant_threshold for score in scores)
            highly_relevant_count = sum(
                score >= highly_relevant_threshold for score in scores
            )
            precision_values.append(relevant_count / len(scores))
            hit_values.append(1.0 if relevant_count > 0 else 0.0)
            highly_relevant_values.append(highly_relevant_count / len(scores))
            value = ndcg(scores, relevant_threshold)
            if value is not None:
                ndcg_values.append(value)

        metrics[method] = RecommendationMethodMetrics(
            llm=summarize([float(v) for v in llm_values]),
            rerank=summarize([float(v) for v in rerank_values]),
            ranking=RecommendationRankingMetrics(
                precision_at_k=statistics.fmean(precision_values)
                if precision_values
                else None,
                hit_rate_at_k=statistics.fmean(hit_values) if hit_values else None,
                ndcg_at_k=statistics.fmean(ndcg_values) if ndcg_values else None,
                highly_relevant_rate_at_k=statistics.fmean(highly_relevant_values)
                if highly_relevant_values
                else None,
                useful_feed_rate=useful_count / method_row_count
                if method_row_count
                else None,
                unrelated_rate=unrelated_count / method_row_count
                if method_row_count
                else None,
                match_type_distribution=match_type_distribution,
            ),
            llm_distribution=distribution,
        )

    random_metrics = metrics.get("random")
    if random_metrics:
        for method, method_metrics in metrics.items():
            if method == "random":
                continue
            method_metrics.llm_average_minus_random = delta(
                method_metrics.llm.average, random_metrics.llm.average
            )
            method_metrics.rerank_average_minus_random = delta(
                method_metrics.rerank.average, random_metrics.rerank.average
            )
            method_metrics.precision_at_k_minus_random = delta(
                method_metrics.ranking.precision_at_k,
                random_metrics.ranking.precision_at_k,
            )
            method_metrics.ndcg_at_k_minus_random = delta(
                method_metrics.ranking.ndcg_at_k,
                random_metrics.ranking.ndcg_at_k,
            )

    return metrics


def delta(current: float | None, baseline: float | None) -> float | None:
    return None if current is None or baseline is None else current - baseline


def main() -> int:
    settings = load_settings()
    parser = argparse.ArgumentParser(
        description="Benchmark Toin recommendation suitability",
        epilog=settings_env_help(),
    )
    parser.add_argument("--base-url", default=settings.base_url)
    parser.add_argument("--auth-path", default=settings.auth_path)
    parser.add_argument("--database-url", default=settings.database_url)
    parser.add_argument(
        "--random-source",
        choices=("database", "api"),
        default=settings.random_source,
    )
    parser.add_argument(
        "--profiles",
        type=Path,
        default=settings.recommendation_profiles,
        help="JSON profile file. Defaults to benchmarks/recommendation/profiles.json.",
    )
    parser.add_argument("--top-k", type=int, default=settings.recommendation_top_k)
    parser.add_argument(
        "--pages",
        type=int,
        default=settings.recommendation_pages,
        help="Number of paginated result pages to fetch per candidate batch.",
    )
    parser.add_argument(
        "--batch-sample-posts",
        type=int,
        default=settings.recommendation_batch_sample_posts,
        help=(
            "Collect candidate batches until each user/method has more than this "
            "many unique posts, then summarize the best-scoring batches up to "
            "this sample size."
        ),
    )
    parser.add_argument(
        "--max-batches",
        type=int,
        default=settings.recommendation_max_batches,
        help="Maximum candidate batches to collect per user and method.",
    )
    parser.add_argument("--seed", type=int, default=settings.seed)
    parser.add_argument("--timeout", type=float, default=settings.timeout)
    parser.add_argument("--out-dir", type=Path, default=settings.recommendation_out_dir)
    parser.add_argument(
        "--collection-cache",
        type=Path,
        default=None,
        help=(
            "Path for raw collected recommendation batches. Defaults to "
            "<out-dir>/recommendation_benchmark_batches.json."
        ),
    )
    parser.add_argument(
        "--skip-collect",
        action="store_true",
        help=(
            "Reuse --collection-cache instead of calling recommendation/random "
            "collection again. LLM and rerank scoring still run."
        ),
    )
    parser.add_argument(
        "--recommendation-workers", type=int, default=settings.search_workers
    )
    parser.add_argument("--auth-workers", type=int, default=settings.search_workers)
    parser.add_argument("--llm-workers", type=int, default=settings.llm_workers)
    parser.add_argument("--rerank-workers", type=int, default=settings.rerank_workers)
    parser.add_argument(
        "--method",
        action="append",
        type=parse_method,
        default=[],
        help="Additional feed endpoint in name=path format, e.g. following=/posts/following",
    )
    parser.add_argument("--openai-model", default=settings.openai_model)
    parser.add_argument(
        "--cloudflare-rerank-model", default=settings.cloudflare_rerank_model
    )
    parser.add_argument(
        "--relevant-threshold", type=float, default=DEFAULT_RELEVANT_THRESHOLD
    )
    parser.add_argument(
        "--highly-relevant-threshold",
        type=float,
        default=DEFAULT_HIGHLY_RELEVANT_THRESHOLD,
    )
    args = parser.parse_args()
    collection_cache = (
        args.collection_cache
        if args.collection_cache is not None
        else args.out_dir / "recommendation_benchmark_batches.json"
    )

    rng = random.Random(args.seed)
    profiles = load_profiles(args.profiles)
    methods = [
        MethodEndpoint(name="recommendations", path="/recommendations"),
        *args.method,
    ]
    openai_key = settings.openai_api_key
    if not openai_key:
        raise RuntimeError(
            "LLM grading is required. Set TOIN_BENCH_OPENAI_API_KEY or OPENAI_API_KEY."
        )
    if not settings.cloudflare_account_id or not settings.cloudflare_auth_token:
        raise RuntimeError(
            "Cloudflare rerank scoring is required. Set "
            "TOIN_BENCH_CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_ACCOUNT_ID and "
            "TOIN_BENCH_CLOUDFLARE_AUTH_TOKEN/CLOUDFLARE_AUTH_TOKEN."
        )

    if args.skip_collect:
        batches = load_collection_cache(collection_cache)
    else:
        tokens: dict[str, str] = {}
        auth_items = [
            (
                profile_index,
                args.base_url,
                args.auth_path,
                profile.username,
                profile.password,
                args.timeout,
            )
            for profile_index, profile in enumerate(profiles)
        ]
        for _profile_index, username, token in process_map(
            authenticate_worker,
            auth_items,
            max_workers=max(1, args.auth_workers),
            chunksize=1,
            desc="Authenticating users",
            unit="user",
        ):
            tokens[username] = token

        first_client = HttpClient(args.base_url, args.timeout)
        if profiles:
            first_client.token = tokens[profiles[0].username]
        if args.random_source == "database":
            visible_pool = fetch_visible_pool_from_database(args.database_url)
        else:
            visible_pool = fetch_visible_pool(first_client)
        if not visible_pool:
            raise HttpError(
                "Visible post pool is empty; random baseline cannot be sampled"
            )

        collect_items = [
            (
                profile_index,
                method_index,
                method,
                args.base_url,
                args.timeout,
                tokens[profile.username],
                args.top_k,
                args.pages,
                args.batch_sample_posts,
                args.max_batches,
            )
            for profile_index, profile in enumerate(profiles)
            for method_index, method in enumerate(methods)
        ]
        method_results: dict[tuple[int, int], list[CollectedRecommendationBatch]] = {}
        for profile_index, method_index, collected_batches in process_map(
            collect_recommendation_worker,
            collect_items,
            max_workers=max(1, args.recommendation_workers),
            chunksize=1,
            desc="Collecting recommendations",
            unit="request",
        ):
            method_results[(profile_index, method_index)] = collected_batches

        batches = []
        for profile_index, profile in enumerate(profiles):
            for method_index, method in enumerate(methods):
                for collected in method_results[(profile_index, method_index)]:
                    batches.append(
                        RecommendationBatch(
                            username=profile.username,
                            preferences=profile.preferences,
                            method=method.name,
                            batch_index=collected.batch_index,
                            posts=collected.posts,
                            latency_ms=collected.latency_ms,
                        )
                    )

            random_seen: set[str] = set()
            random_batch_size = args.top_k * max(1, args.pages)
            random_batch_limit = max(1, args.max_batches)
            for batch_index in range(random_batch_limit):
                remaining_pool = [
                    post
                    for post in visible_pool
                    if post_dedupe_key(post) not in random_seen
                ]
                if not remaining_pool:
                    break
                random_count = min(random_batch_size, len(remaining_pool))
                random_posts = rng.sample(remaining_pool, k=random_count)
                for post in random_posts:
                    random_seen.add(post_dedupe_key(post))
                batches.append(
                    RecommendationBatch(
                        username=profile.username,
                        preferences=profile.preferences,
                        method="random",
                        batch_index=batch_index,
                        latency_ms=0.0,
                        posts=random_posts,
                    )
                )
                if len(random_seen) > args.batch_sample_posts:
                    break

        write_collection_cache(collection_cache, batches)

    if not batches:
        raise RuntimeError("No recommendation batches available for scoring")

    batch_rows = {
        (batch.username, batch.method, batch.batch_index): create_rows_for_batch(batch)
        for batch in batches
    }

    row_lookup = {
        (row.username, row.method, batch_index, row.rank): row
        for (_username, _method, batch_index), rows_for_batch in batch_rows.items()
        for row in rows_for_batch
    }

    llm_items = [
        (
            username,
            preferences,
            method,
            batch_index,
            rank,
            post,
            openai_key,
            args.openai_model,
            args.timeout,
        )
        for username, preferences, method, batch_index, posts in (
            (
                batch.username,
                batch.preferences,
                batch.method,
                batch.batch_index,
                batch.posts,
            )
            for batch in batches
        )
        for rank, post in enumerate(posts, start=1)
    ]
    for username, method, batch_index, rank, score, reason, match_type in process_map(
        llm_grade_worker,
        llm_items,
        max_workers=max(1, args.llm_workers),
        chunksize=1,
        desc="LLM grading",
        unit="pair",
    ):
        row = row_lookup[(username, method, batch_index, rank)]
        row.llm_score = score
        row.llm_reason = reason
        row.match_type = match_type

    rerank_items = [
        (
            username,
            preferences,
            method,
            batch_index,
            posts,
            settings.cloudflare_account_id,
            settings.cloudflare_auth_token,
            args.cloudflare_rerank_model,
            args.timeout,
        )
        for username, preferences, method, batch_index, posts in (
            (
                batch.username,
                batch.preferences,
                batch.method,
                batch.batch_index,
                batch.posts,
            )
            for batch in batches
        )
    ]
    for username, method, batch_index, scores in process_map(
        cloudflare_rerank_worker,
        rerank_items,
        max_workers=max(1, args.rerank_workers),
        chunksize=1,
        desc="Rerank scoring",
        unit="result-set",
    ):
        for rank, score in enumerate(scores, start=1):
            row = row_lookup[(username, method, batch_index, rank)]
            row.rerank_score = score
            row.rerank_source = "cloudflare"

    rows = selected_output_rows(
        batches,
        batch_rows,
        batch_sample_posts=args.batch_sample_posts,
    )
    metrics = build_metrics(
        rows,
        relevant_threshold=args.relevant_threshold,
        highly_relevant_threshold=args.highly_relevant_threshold,
    )
    disagreements = [
        row
        for row in rows
        if row.llm_score is not None
        and row.rerank_score is not None
        and abs(float(row.llm_score) / 100.0 - float(row.rerank_score)) >= 0.5
    ]

    args.out_dir.mkdir(parents=True, exist_ok=True)
    payload = RecommendationBenchmarkOutput(
        config=RecommendationBenchmarkConfig(
            base_url=args.base_url,
            database_url=args.database_url
            if args.random_source == "database"
            else None,
            random_source=args.random_source,
            top_k=args.top_k,
            pages=args.pages,
            batch_sample_posts=args.batch_sample_posts,
            max_batches=args.max_batches,
            skip_collect=args.skip_collect,
            collection_cache=str(collection_cache),
            seed=args.seed,
            profiles=[profile.username for profile in profiles],
            methods=batch_method_names(batches),
            relevant_threshold=args.relevant_threshold,
            highly_relevant_threshold=args.highly_relevant_threshold,
        ),
        metrics=metrics,
        disagreements=disagreements[:50],
        rows=rows,
    )
    json_path = args.out_dir / "recommendation_benchmark_results.json"
    csv_path = args.out_dir / "recommendation_benchmark_rows.csv"
    json_path.write_text(payload.model_dump_json(indent=2), encoding="utf-8")
    write_csv(csv_path, rows)
    print(
        json.dumps(
            {k: v.model_dump() for k, v in metrics.items()},
            ensure_ascii=False,
            indent=2,
        )
    )
    print(f"Wrote {json_path} and {csv_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
