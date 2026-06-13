from __future__ import annotations

import json
import urllib.request
from typing import Any

from benchmarks.utils.posts import post_metadata, post_text


RECOMMENDATION_MATCH_TYPES = {
    "direct",
    "adjacent",
    "community",
    "explore",
    "unrelated",
}


def openai_llm_grade(
    query: str,
    post: dict[str, Any],
    *,
    api_key: str,
    model: str,
    timeout: float,
) -> tuple[float, str]:
    prompt = {
        "query": query,
        "postContent": post_text(post)[:4000],
        "metadata": post_metadata(post),
        "rubric": {
            "1-20": "Irrelevant result",
            "21-40": "Weakly related result",
            "41-60": "Partially relevant result",
            "61-80": "Relevant result",
            "81-100": "Highly relevant result",
        },
        "instruction": "Score relevance only. Ignore popularity and writing quality. Return JSON with score and reason.",
    }
    body = {
        "model": model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": "You are a strict search relevance evaluator. Return only valid JSON.",
            },
            {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
        ],
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        data = json.loads(response.read().decode("utf-8"))
    content = data["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    score = max(1.0, min(100.0, float(parsed["score"])))
    reason = str(parsed.get("reason", ""))
    return score, reason


def openai_recommendation_grade(
    preferences: str,
    post: dict[str, Any],
    *,
    api_key: str,
    model: str,
    timeout: float,
) -> tuple[float, str, str]:
    prompt = {
        "userPreferences": preferences,
        "postContent": post_text(post)[:8000],
        "metadata": post_metadata(post),
        "matchTypes": {
            "direct": "Clearly about a stated or core interest.",
            "adjacent": "A related practical topic the user may reasonably like.",
            "community": "General developer/social content that fits the user's broader community, such as AI discussion, programmer life, workplace stories, jokes, memes, tooling debates, or software culture.",
            "explore": "A broader discovery item outside the core profile but still plausible for the feed.",
            "unrelated": "Unlikely to belong in this user's feed.",
        },
        "rubric": {
            "1-20": "Unrelated or noisy feed item.",
            "21-40": "Poor feed item; barely related, low value, or unlikely to interest the user.",
            "41-60": "Acceptable but weak feed item; somewhat related, generic, mildly interesting, or low-context community content.",
            "61-80": "Good feed item; useful, interesting, relatable, funny, or plausibly engaging.",
            "81-100": "Excellent feed item; direct deep match, highly useful adjacent post, or very strong community/social item.",
        },
        "instruction": (
            "Evaluate whether this post is a good item in this user's social feed. "
            "Do not require exact topic matching. A good social feed should include "
            "direct matches, adjacent useful topics, general community content, and "
            "some exploratory or discussion-worthy posts. Reward direct matches, "
            "adjacent technical topics, broadly useful posts for the user's "
            "professional/community context, AI discussions, programmer life, "
            "workplace stories, jokes, memes, tooling debates, and general software "
            "culture when they are plausible feed content. Penalize completely "
            "unrelated posts, spam, very low-effort posts, posts with no clear "
            "entertainment/information value, keyword-only matches that are not "
            "actually useful, and excessive repetition of the exact same narrow "
            "topic. Return JSON with score, match_type, and reason."
        ),
    }
    body = {
        "model": model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a fair social-feed evaluator. Judge whether a post is "
                    "useful, interesting, relatable, funny, or plausibly engaging "
                    "for the user. Do not demand exact keyword matches. Return only "
                    "valid JSON."
                ),
            },
            {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
        ],
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        data = json.loads(response.read().decode("utf-8"))
    content = data["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    score = max(1.0, min(100.0, float(parsed["score"])))
    reason = str(parsed.get("reason", ""))
    match_type = normalize_recommendation_match_type(parsed.get("match_type"))
    return score, reason, match_type


def normalize_recommendation_match_type(value: Any) -> str:
    match_type = str(value or "unrelated").strip().lower().replace("-", "_")
    return match_type if match_type in RECOMMENDATION_MATCH_TYPES else "unrelated"
