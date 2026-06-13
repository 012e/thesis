from __future__ import annotations

from typing import Any

import requests

from benchmarks.utils.posts import post_text


DEFAULT_CLOUDFLARE_RERANK_MODEL = "@cf/baai/bge-reranker-base"


def cloudflare_rerank_scores(
    query: str,
    posts: list[dict[str, Any]],
    *,
    account_id: str,
    auth_token: str,
    model: str = DEFAULT_CLOUDFLARE_RERANK_MODEL,
    timeout: float,
) -> list[float]:
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"
    response = requests.post(
        url,
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "query": query,
            "contexts": [{"text": post_text(post)[:8000]} for post in posts],
        },
        timeout=timeout,
    )
    response.raise_for_status()
    data = response.json()
    return _parse_cloudflare_scores(data, len(posts))


def _parse_cloudflare_scores(data: dict[str, Any], expected_count: int) -> list[float]:
    result = data.get("result")
    if isinstance(result, dict):
        candidates = (
            result.get("results")
            or result.get("response")
            or result.get("data")
            or result.get("scores")
        )
    else:
        candidates = result

    if not isinstance(candidates, list):
        raise RuntimeError(f"Unexpected Cloudflare rerank response shape: {data}")

    if all(isinstance(item, int | float) for item in candidates):
        if len(candidates) != expected_count:
            raise RuntimeError(
                "Cloudflare rerank returned a score list with unexpected length: "
                f"{len(candidates)} != {expected_count}"
            )
        return [float(score) for score in candidates]

    scores = [0.0] * expected_count
    seen = set()
    for position, item in enumerate(candidates):
        if not isinstance(item, dict):
            raise RuntimeError(f"Unexpected Cloudflare rerank item: {item}")
        index_value = item.get("index", item.get("id", position))
        score_value = item.get("score", item.get("relevance_score"))
        if score_value is None:
            raise RuntimeError(f"Cloudflare rerank item has no score: {item}")
        index = int(index_value)
        if index < 0 or index >= expected_count:
            raise RuntimeError(
                f"Cloudflare rerank returned out-of-range index: {index}"
            )
        scores[index] = float(score_value)
        seen.add(index)

    if len(seen) != expected_count:
        raise RuntimeError(
            "Cloudflare rerank did not return a score for every context: "
            f"{len(seen)} != {expected_count}"
        )
    return scores
