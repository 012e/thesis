# AGENTS.md

- This folder is a Python 3.12 offline benchmark package inside the thesis repo; root Typst commands do not verify benchmark code.
- Run benchmark commands from the repo root so imports resolve through the `benchmarks` package.
- Dependencies are managed by root `pyproject.toml`/`uv.lock`; use `uv run ...`, not ad-hoc `pip install`.

## Search Benchmark
- Main entrypoint: `uv run python benchmarks/search/search_benchmark.py`.
- The runner authenticates to Toin, collects `GET /posts/search?q=...`, adds a randomized baseline, grades pairs with OpenAI, reranks with Cloudflare Workers AI, then writes JSON/CSV results.
- Default inputs/results are `benchmarks/search/queries.json` and `benchmarks/search/results/`.
- Required secrets are read from root `.env` then `.env.benchmark` via `pydantic-settings`; do not read or print those files.
- Preferred env vars use `TOIN_BENCH_`; compatibility aliases include `OPENAI_API_KEY`, `DATABASE_URL`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_AUTH_TOKEN`.
- `--random-source database` is the default and expects the local ParadeDB/Postgres URL `postgresql://username:password@localhost:5432/database`; use `--random-source api` to sample through `GET /posts` instead.
- BM25/vector baselines are not built in; add them only when backend endpoints exist, e.g. `--method 'bm25=/posts/search?mode=bm25'`.

## Verification
- Typecheck benchmark code with `uv run pyrefly check -c benchmarks/pyrefly.toml benchmarks`; the current code reports an existing `int(index_value)` narrowing error in `benchmarks/utils/rerank.py`.
- For a cheap runner check that avoids external API/database calls, use `uv run python benchmarks/search/search_benchmark.py --help`.
