#!/usr/bin/env python3
"""Offline benchmark runner for Toin post search.

The public REST contract exposes production search at GET /posts/search?q=...
and the local Docker Compose database exposes the visible post pool. Method-
specific baselines such as BM25-only or vector-only can be added through
--method when the backend exposes separate endpoints or query parameters.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path
from typing import Any

from tqdm.contrib.concurrent import process_map

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from benchmarks.utils.llm import openai_llm_grade
from benchmarks.utils.models import (
    BenchmarkConfig,
    BenchmarkOutput,
    BenchmarkRow,
    MethodEndpoint,
    MethodMetrics,
    ScoreSummary,
)
from benchmarks.utils.posts import post_metadata, post_text
from benchmarks.utils.rerank import cloudflare_rerank_scores
from benchmarks.utils.settings import load_settings, settings_env_help


class HttpError(RuntimeError):
    pass


class HttpClient:
    def __init__(self, base_url: str, timeout: float) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.token: str | None = None
        self.cookie_jar = CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookie_jar)
        )

    def authenticate(self, auth_path: str, email: str, password: str) -> str:
        body, headers = self.request(
            "POST",
            auth_path,
            json_body={"email": email, "password": password},
            include_auth=False,
            return_headers=True,
        )

        token = headers.get("set-auth-token") or headers.get("authorization")
        if token and token.lower().startswith("bearer "):
            token = token[7:]

        if not token and isinstance(body, dict):
            token = (
                body.get("token") or body.get("accessToken") or body.get("access_token")
            )

        if not isinstance(token, str) or not token:
            raise HttpError(
                "Authentication succeeded but no bearer token was found in "
                "set-auth-token/authorization headers or JSON body."
            )

        self.token = token
        return token

    def get_json(self, path: str, params: dict[str, Any] | None = None) -> Any:
        return self.request("GET", path, params=params)

    def request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
        include_auth: bool = True,
        return_headers: bool = False,
    ) -> Any:
        url = self._url(path, params)
        data = None
        headers = {
            "Accept": "application/json",
            "User-Agent": "toin-search-benchmark/1.0",
            "Origin": "https://toin.dev",
            "Referer": "https://toin.dev/",
        }
        if json_body is not None:
            data = json.dumps(json_body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if include_auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
                parsed = json.loads(raw) if raw else None
                response_headers = {k.lower(): v for k, v in response.headers.items()}
                return (parsed, response_headers) if return_headers else parsed
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise HttpError(f"HTTP {exc.code} for {method} {url}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise HttpError(f"Request failed for {method} {url}: {exc.reason}") from exc

    def _url(self, path: str, params: dict[str, Any] | None) -> str:
        if path.startswith("http://") or path.startswith("https://"):
            base = path
        else:
            base = f"{self.base_url}/{path.lstrip('/')}"
        if not params:
            return base
        clean = {k: v for k, v in params.items() if v is not None}
        return f"{base}?{urllib.parse.urlencode(clean)}"


def load_queries(path: Path | None) -> list[str]:
    if path is None:
        raise ValueError("Query file path is required")
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return [str(item) for item in data]
    if isinstance(data, dict) and isinstance(data.get("queries"), list):
        return [str(item) for item in data["queries"]]
    raise ValueError('Query file must be a JSON array or {"queries": [...]} object')


def parse_method(value: str) -> MethodEndpoint:
    name, sep, spec = value.partition("=")
    if not sep or not name or not spec:
        raise argparse.ArgumentTypeError(
            "Method must use name=path format, for example bm25=/posts/search?mode=bm25"
        )
    parsed = urllib.parse.urlparse(spec)
    extra = dict(urllib.parse.parse_qsl(parsed.query))
    path = parsed.path or spec
    return MethodEndpoint(name=name, path=path, extra_params=extra)


def fetch_method_results(
    client: HttpClient,
    endpoint: MethodEndpoint,
    query: str,
    top_k: int,
) -> list[dict[str, Any]]:
    params = {endpoint.query_param: query}
    if endpoint.extra_params:
        params.update(endpoint.extra_params)
    data = client.get_json(endpoint.path, params=params)
    if not isinstance(data, list):
        raise HttpError(f"Method {endpoint.name} returned non-list JSON")
    return [p for p in data[:top_k] if isinstance(p, dict)]


def fetch_method_results_with_token(
    base_url: str,
    timeout: float,
    token: str | None,
    endpoint: MethodEndpoint,
    query: str,
    top_k: int,
) -> list[dict[str, Any]]:
    client = HttpClient(base_url, timeout)
    client.token = token
    return fetch_method_results(client, endpoint, query, top_k)


def collect_search_worker(
    item: tuple[int, int, str, MethodEndpoint, str, float, str | None, int],
) -> tuple[int, int, list[dict[str, Any]], float]:
    query_index, method_index, query, method, base_url, timeout, token, top_k = item
    started = time.perf_counter()
    posts = fetch_method_results_with_token(
        base_url, timeout, token, method, query, top_k
    )
    return (
        query_index,
        method_index,
        posts,
        round((time.perf_counter() - started) * 1000, 2),
    )


def llm_grade_worker(
    item: tuple[str, str, int, dict[str, Any], str, str, float],
) -> tuple[str, str, int, float, str]:
    query, method, rank, post, api_key, model, timeout = item
    score, reason = openai_llm_grade(
        query,
        post,
        api_key=api_key,
        model=model,
        timeout=timeout,
    )
    return query, method, rank, score, reason


def cloudflare_rerank_worker(
    item: tuple[str, str, list[dict[str, Any]], str, str, str, float],
) -> tuple[str, str, list[float]]:
    query, method, posts, account_id, auth_token, model, timeout = item
    if not posts:
        return query, method, []
    scores = cloudflare_rerank_scores(
        query,
        posts,
        account_id=account_id,
        auth_token=auth_token,
        model=model,
        timeout=timeout,
    )
    return query, method, scores


def fetch_visible_pool(client: HttpClient) -> list[dict[str, Any]]:
    data = client.get_json("/posts")
    if not isinstance(data, list):
        raise HttpError("GET /posts returned non-list JSON")
    return [p for p in data if isinstance(p, dict)]


def fetch_visible_pool_from_database(database_url: str) -> list[dict[str, Any]]:
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError as exc:
        raise RuntimeError(
            "psycopg is required for --random-source database. Install with "
            "`uv add 'psycopg[binary]>=3.2'`."
        ) from exc

    query = """
        SELECT
          p.id::text AS id,
          p.author_id AS "authorId",
          p.content,
          p.created_at AS "createdAt",
          p.updated_at AS "updatedAt",
          COALESCE(
            jsonb_agg(
              DISTINCT jsonb_build_object(
                'id', t.id::text,
                'slug', t.slug,
                'displayName', t.display_name
              )
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'::jsonb
          ) AS tags
        FROM posts p
        LEFT JOIN post_tags pt ON pt.post_id = p.id
        LEFT JOIN tags t ON t.id = pt.tag_id
        WHERE p.hidden = false
        GROUP BY p.id, p.author_id, p.content, p.created_at, p.updated_at
    """

    with psycopg.connect(database_url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()

    return [dict(row) for row in rows]


def summarize(values: list[float]) -> ScoreSummary:
    if not values:
        return ScoreSummary(count=0, average=None, median=None, min=None, max=None)
    return ScoreSummary(
        count=len(values),
        average=statistics.fmean(values),
        median=statistics.median(values),
        min=min(values),
        max=max(values),
    )


def bucket_llm(score: float) -> str:
    if score <= 20:
        return "1-20 irrelevant"
    if score <= 40:
        return "21-40 weak"
    if score <= 60:
        return "41-60 partial"
    if score <= 80:
        return "61-80 relevant"
    return "81-100 highly_relevant"


def write_csv(path: Path, rows: list[BenchmarkRow]) -> None:
    columns = [
        "query",
        "method",
        "rank",
        "post_id",
        "llm_score",
        "rerank_score",
        "text",
        "tags",
        "llm_reason",
    ]
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            dumped = row.model_dump()
            writer.writerow({key: dumped.get(key) for key in columns})


def build_metrics(rows: list[BenchmarkRow]) -> dict[str, MethodMetrics]:
    by_method: dict[str, list[BenchmarkRow]] = {}
    for row in rows:
        by_method.setdefault(row.method, []).append(row)

    metrics: dict[str, MethodMetrics] = {}
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
        metrics[method] = MethodMetrics(
            llm=summarize([float(v) for v in llm_values]),
            rerank=summarize([float(v) for v in rerank_values]),
            llm_distribution=distribution,
        )

    for method, method_metrics in metrics.items():
        for baseline in ("random", "bm25", "vector"):
            if method == baseline or baseline not in metrics:
                continue
            for evaluator in ("llm", "rerank"):
                current = getattr(method_metrics, evaluator).average
                base = getattr(metrics[baseline], evaluator).average
                key = f"{evaluator}_average_minus_{baseline}"
                setattr(
                    method_metrics,
                    key,
                    None if current is None or base is None else current - base,
                )
    return metrics


def main() -> int:
    settings = load_settings()
    parser = argparse.ArgumentParser(
        description="Benchmark Toin search relevance",
        epilog=settings_env_help(),
    )
    parser.add_argument(
        "--base-url",
        default=settings.base_url,
        help="Search API base URL.",
    )
    parser.add_argument(
        "--database-url",
        default=settings.database_url,
        help="Local Postgres/ParadeDB URL used for the randomized visible-post pool.",
    )
    parser.add_argument(
        "--random-source",
        choices=("database", "api"),
        default=settings.random_source,
        help="Source for randomized baseline posts. Defaults to the local database from thesis/docker-compose.yaml.",
    )
    parser.add_argument("--auth-path", default=settings.auth_path)
    parser.add_argument("--email", default=settings.email)
    parser.add_argument("--password", default=settings.password)
    parser.add_argument(
        "--queries",
        type=Path,
        default=settings.queries,
        help="JSON query file. Defaults to benchmarks/search/queries.json.",
    )
    parser.add_argument("--top-k", type=int, default=settings.top_k)
    parser.add_argument("--seed", type=int, default=settings.seed)
    parser.add_argument("--timeout", type=float, default=settings.timeout)
    parser.add_argument("--out-dir", type=Path, default=settings.out_dir)
    parser.add_argument("--search-workers", type=int, default=settings.search_workers)
    parser.add_argument("--llm-workers", type=int, default=settings.llm_workers)
    parser.add_argument("--rerank-workers", type=int, default=settings.rerank_workers)
    parser.add_argument(
        "--method",
        action="append",
        type=parse_method,
        default=[],
        help="Additional method endpoint in name=path format, e.g. bm25=/posts/search?mode=bm25",
    )
    parser.add_argument("--openai-model", default=settings.openai_model)
    parser.add_argument(
        "--cloudflare-rerank-model", default=settings.cloudflare_rerank_model
    )
    args = parser.parse_args()

    rng = random.Random(args.seed)
    queries = load_queries(args.queries)
    methods = [MethodEndpoint(name="hybrid", path="/posts/search"), *args.method]
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

    client = HttpClient(args.base_url, args.timeout)
    client.authenticate(args.auth_path, args.email, args.password)
    if args.random_source == "database":
        visible_pool = fetch_visible_pool_from_database(args.database_url)
    else:
        visible_pool = fetch_visible_pool(client)
    if not visible_pool:
        raise HttpError("Visible post pool is empty; random baseline cannot be sampled")

    rows: list[BenchmarkRow] = []
    grouped_posts: list[tuple[str, str, list[dict[str, Any]]]] = []
    search_results: dict[tuple[int, int], tuple[list[dict[str, Any]], float]] = {}
    search_items = [
        (
            query_index,
            method_index,
            query,
            method,
            args.base_url,
            args.timeout,
            client.token,
            args.top_k,
        )
        for query_index, query in enumerate(queries)
        for method_index, method in enumerate(methods)
    ]
    for query_index, method_index, posts, latency_ms in process_map(
        collect_search_worker,
        search_items,
        max_workers=max(1, args.search_workers),
        chunksize=1,
        desc="Collecting search results",
        unit="request",
    ):
        search_results[(query_index, method_index)] = (posts, latency_ms)

    for query_index, query in enumerate(queries):
        for method_index, method in enumerate(methods):
            posts, latency_ms = search_results[(query_index, method_index)]
            grouped_posts.append((query, method.name, posts))
            for rank, post in enumerate(posts, start=1):
                rows.append(
                    BenchmarkRow(
                        query=query,
                        method=method.name,
                        rank=rank,
                        post_id=str(post.get("id")) if post.get("id") else None,
                        latency_ms=latency_ms,
                        text=post_text(post)[:500],
                        tags=post_metadata(post),
                    )
                )

        random_posts = rng.sample(visible_pool, k=min(args.top_k, len(visible_pool)))
        grouped_posts.append((query, "random", random_posts))
        for rank, post in enumerate(random_posts, start=1):
            rows.append(
                BenchmarkRow(
                    query=query,
                    method="random",
                    rank=rank,
                    post_id=str(post.get("id")) if post.get("id") else None,
                    latency_ms=0.0,
                    text=post_text(post)[:500],
                    tags=post_metadata(post),
                )
            )

    row_lookup = {(r.query, r.method, r.rank): r for r in rows}

    llm_items = [
        (query, method, rank, post, openai_key, args.openai_model, args.timeout)
        for query, method, posts in grouped_posts
        for rank, post in enumerate(posts, start=1)
    ]
    for query, method, rank, score, reason in process_map(
        llm_grade_worker,
        llm_items,
        max_workers=max(1, args.llm_workers),
        chunksize=1,
        desc="LLM grading",
        unit="pair",
    ):
        row = row_lookup[(query, method, rank)]
        row.llm_score = score
        row.llm_reason = reason

    rerank_items = [
        (
            query,
            method,
            posts,
            settings.cloudflare_account_id,
            settings.cloudflare_auth_token,
            args.cloudflare_rerank_model,
            args.timeout,
        )
        for query, method, posts in grouped_posts
    ]
    for query, method, scores in process_map(
        cloudflare_rerank_worker,
        rerank_items,
        max_workers=max(1, args.rerank_workers),
        chunksize=1,
        desc="Rerank scoring",
        unit="result-set",
    ):
        for rank, score in enumerate(scores, start=1):
            row = row_lookup[(query, method, rank)]
            row.rerank_score = score
            row.rerank_source = "cloudflare"

    metrics = build_metrics(rows)
    disagreements = [
        row
        for row in rows
        if row.llm_score is not None
        and row.rerank_score is not None
        and abs(float(row.llm_score) / 100.0 - float(row.rerank_score)) >= 0.5
    ]

    args.out_dir.mkdir(parents=True, exist_ok=True)
    payload = BenchmarkOutput(
        config=BenchmarkConfig(
            base_url=args.base_url,
            database_url=args.database_url
            if args.random_source == "database"
            else None,
            random_source=args.random_source,
            top_k=args.top_k,
            seed=args.seed,
            queries=queries,
            methods=[method.name for method in methods] + ["random"],
        ),
        metrics=metrics,
        disagreements=disagreements[:50],
        rows=rows,
    )
    json_path = args.out_dir / "search_benchmark_results.json"
    csv_path = args.out_dir / "search_benchmark_rows.csv"
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
