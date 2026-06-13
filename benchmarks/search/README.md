# Toin Search Benchmark

Offline benchmark for `PLAN_SEARCH_BENCH.md`. It authenticates against Toin, collects `Top-K` search results, samples a randomized baseline from visible posts in the local database, grades each query-post pair with an LLM, scores each pair with a reranker, and writes JSON/CSV artifacts.

## Run

```bash
uv run python benchmarks/search/search_benchmark.py
```

By default this uses `benchmarks/search/queries.json`, `Top-K = 5`, `https://api.toin.dev` for post/search routes, and `/api/auth/sign-in/email` for Better Auth. The demo account comes from the benchmark plan.

Configuration is centralized in `benchmarks/utils/settings.py` with `pydantic-settings`. CLI flags override environment variables. Preferred env vars use the `TOIN_BENCH_` prefix, for example `TOIN_BENCH_BASE_URL`, `TOIN_BENCH_EMAIL`, `TOIN_BENCH_PASSWORD`, `TOIN_BENCH_DATABASE_URL`, `TOIN_BENCH_QUERIES`, `TOIN_BENCH_TOP_K`, `TOIN_BENCH_SEARCH_WORKERS`, `TOIN_BENCH_LLM_WORKERS`, `TOIN_BENCH_RERANK_WORKERS`, `TOIN_BENCH_OPENAI_API_KEY`, `TOIN_BENCH_CLOUDFLARE_ACCOUNT_ID`, and `TOIN_BENCH_CLOUDFLARE_AUTH_TOKEN`. Compatibility aliases are also supported for `TOIN_API_BASE_URL`, `TOIN_EMAIL`, `TOIN_PASSWORD`, `DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_EVAL_MODEL`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AUTH_TOKEN`, and `CLOUDFLARE_RERANK_MODEL`.

The randomized baseline reads visible posts directly from the local ParadeDB/Postgres database configured by `thesis/docker-compose.yaml`: `postgresql://username:password@localhost:5432/database`. Override with `TOIN_BENCH_DATABASE_URL`, `DATABASE_URL`, or `--database-url`. Use `--random-source api` to sample through `GET /posts` instead.

## Evaluators

LLM grading is required. Set `TOIN_BENCH_OPENAI_API_KEY` or `OPENAI_API_KEY` before running the benchmark.

Rerank scoring is required and uses Cloudflare Workers AI model `@cf/baai/bge-reranker-base` by default. Set `TOIN_BENCH_CLOUDFLARE_ACCOUNT_ID` and `TOIN_BENCH_CLOUDFLARE_AUTH_TOKEN`, or the compatibility aliases `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AUTH_TOKEN`. Override the model with `TOIN_BENCH_CLOUDFLARE_RERANK_MODEL` or `--cloudflare-rerank-model`.

Settings, evaluator, rerank, and post-text helpers live under `benchmarks/utils/`. Benchmark rows, config, metrics, and final output are validated with Pydantic models before writing artifacts.

Search calls, LLM grading, and Cloudflare rerank calls run in parallel using `tqdm.contrib.concurrent.process_map`. Tune concurrency with `--search-workers`, `--llm-workers`, and `--rerank-workers` or their matching `TOIN_BENCH_*` environment variables.

## Baselines

The checked REST contract exposes production hybrid search at `GET /posts/search?q=...` and the visible post pool at `GET /posts`. BM25-only and vector-only baselines need separate backend endpoints or query parameters. Add them with `--method` when available, for example:

```bash
uv run python benchmarks/search/search_benchmark.py \
  --method 'bm25=/posts/search?mode=bm25' \
  --method 'vector=/posts/search?mode=vector'
```

Results are written to `benchmarks/search/results/search_benchmark_results.json` and `benchmarks/search/results/search_benchmark_rows.csv`.
