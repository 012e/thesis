# Toin Recommendation Benchmark

Offline Top-K benchmark for the Toin personalized recommendation feed.

The benchmark authenticates once per configured user, fetches candidate batches from `GET /recommendations`, samples randomized visible-post baseline batches, grades each user-post pair with an LLM for social-feed suitability, scores each set with a reranker using the user's preference description as the query, summarizes the best-scoring batches, then writes JSON/CSV artifacts.

## Profiles

Edit `benchmarks/recommendation/profiles.json` with manually prepared profiles:

```json
[
  {
    "username": "user@example.com",
    "password": "password",
    "preferences": "Short description of topics this user prefers."
  }
]
```

The `preferences` field is the benchmark context used by the LLM and reranker. Keep it concise and focused on stable interests, but interpret the LLM score as feed suitability rather than exact search relevance. Good feed items may be direct matches, adjacent technical topics, community posts, or exploratory items that are plausibly useful, funny, relatable, or discussion-worthy.

## Run

```bash
uv run python benchmarks/recommendation/recommendation_benchmark.py
```

By default this uses `benchmarks/recommendation/profiles.json`, `Top-K = 20`, `pages = 3`, `batch_sample_posts = 300`, `max_batches = 10`, `https://api.toin.dev`, `/api/auth/sign-in/email`, and the local database visible-post pool for the random baseline. The runner treats each `Top-K * pages` fetch as one candidate batch, keeps collecting deduplicated batches until a user/method has more than 300 posts or reaches `max_batches`, saves the raw collected batches to `recommendation_benchmark_batches.json`, scores all candidate posts, then writes metrics from the best LLM-average batches until the selected sample has at least 300 posts.

Configuration is centralized in `benchmarks/utils/settings.py`. CLI flags override environment variables. Useful env vars include `TOIN_BENCH_BASE_URL`, `TOIN_BENCH_AUTH_PATH`, `TOIN_BENCH_RECOMMENDATION_PROFILES`, `TOIN_BENCH_RECOMMENDATION_OUT_DIR`, `TOIN_BENCH_DATABASE_URL`, `TOIN_BENCH_RECOMMENDATION_TOP_K`, `TOIN_BENCH_RECOMMENDATION_PAGES`, `TOIN_BENCH_RECOMMENDATION_BATCH_SAMPLE_POSTS`, `TOIN_BENCH_RECOMMENDATION_MAX_BATCHES`, `TOIN_BENCH_OPENAI_API_KEY`, `TOIN_BENCH_CLOUDFLARE_ACCOUNT_ID`, and `TOIN_BENCH_CLOUDFLARE_AUTH_TOKEN`.

Use `--top-k`, `--pages`, `--batch-sample-posts`, and `--max-batches` to control collection and summary size:

```bash
uv run python benchmarks/recommendation/recommendation_benchmark.py \
  --top-k 20 \
  --pages 3 \
  --batch-sample-posts 300 \
  --max-batches 10
```

`GET /recommendations` marks returned items as served, so larger `--pages`, `--batch-sample-posts`, or `--max-batches` values intentionally consume more of each benchmark user's recommendation queue.

Use `--skip-collect` to reuse the saved raw batch cache and avoid calling `GET /recommendations` or sampling the random pool again. This is useful when changing the LLM prompt or metrics and rerunning scoring over the same posts:

```bash
uv run python benchmarks/recommendation/recommendation_benchmark.py --skip-collect
```

The default cache path is `benchmarks/recommendation/results/recommendation_benchmark_batches.json`. Override it with `--collection-cache path/to/batches.json`. Run once without `--skip-collect` to create the cache before reusing it.

Authentication, per-user/method recommendation collection, LLM grading, and rerank scoring run in parallel using `tqdm.contrib.concurrent.process_map`. Tune concurrency with `--auth-workers`, `--recommendation-workers`, `--llm-workers`, and `--rerank-workers`. Pagination inside one user/method request remains sequential because each page depends on the previous page's `nextCursor`.

## Baselines And Methods

The built-in methods are:

- `recommendations`: production personalized feed at `GET /recommendations?limit=...`
- `random`: random visible posts sampled from the local database or `GET /posts`

Additional feed-like endpoints can be benchmarked with `--method name=path`, for example:

```bash
uv run python benchmarks/recommendation/recommendation_benchmark.py \
  --method 'following=/posts/following'
```

Each method is expected to return either a JSON array of posts or a page object with an `items` array.

## Metrics

The benchmark reports LLM feed-suitability score summaries, rerank score summaries, score distribution, match-type distribution (`direct`, `adjacent`, `community`, `explore`, `unrelated`), useful-feed rate, unrelated rate, `Precision@K`, `HitRate@K`, `NDCG@K`, highly useful rate, latency, and deltas versus the random baseline.

The LLM evaluator intentionally does not require exact topic matching. For example, a frontend developer's feed can score well for React, TypeScript, JavaScript, CSS, browser debugging, some Node.js/API topics, AI discussion, programmer life, workplace stories, tooling debates, jokes, memes, and broader software culture when the post is plausible feed content. Rerank scores are still useful as a secondary signal, but they are closer to query relevance than social-feed quality.

Results are written to `benchmarks/recommendation/results/recommendation_benchmark_results.json` and `benchmarks/recommendation/results/recommendation_benchmark_rows.csv`.
