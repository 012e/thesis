#!/usr/bin/env python3
"""Generate PNG charts for the Toin recommendation benchmark output."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from statistics import mean, median
from typing import Any, Callable

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


ROOT = Path(__file__).resolve().parent
DEFAULT_INPUT = ROOT / "results" / "recommendation_benchmark_results.json"
DEFAULT_OUTPUT_DIR = ROOT / "results" / "report"

METHOD_COLORS = {
    "recommendations": "#2563eb",
    "random": "#dc2626",
    "following": "#16a34a",
    "recent": "#f97316",
    "popular": "#9333ea",
}
BUCKET_ORDER = [
    "1-20 irrelevant",
    "21-40 weak",
    "41-60 partial",
    "61-80 relevant",
    "81-100 highly_relevant",
]
BUCKET_COLORS = {
    "1-20 irrelevant": "#ef4444",
    "21-40 weak": "#f97316",
    "41-60 partial": "#eab308",
    "61-80 relevant": "#22c55e",
    "81-100 highly_relevant": "#0f766e",
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()

    data = json.loads(args.input.read_text(encoding="utf-8"))
    rows = normalize_rerank_scores(
        [row for row in data.get("rows", []) if isinstance(row, dict)]
    )
    metrics = data.get("metrics", {})
    config = data.get("config", {})
    methods = [str(method) for method in config.get("methods", metrics.keys())]

    args.output_dir.mkdir(parents=True, exist_ok=True)
    paths = [
        metric_averages(args.output_dir, rows, metrics, methods),
        llm_distribution(args.output_dir, metrics, methods),
        per_user_llm_average(args.output_dir, rows, methods),
        llm_score_by_rank(args.output_dir, rows, methods),
        evaluator_agreement(args.output_dir, rows, methods),
        latency_summary(args.output_dir, rows, methods),
        baseline_deltas(args.output_dir, metrics, methods),
    ]

    for path in paths:
        print(f"Wrote chart: {path}")


def metric_averages(
    out_dir: Path,
    rows: list[dict[str, Any]],
    metrics: dict[str, Any],
    methods: list[str],
) -> Path:
    labels = [
        "LLM avg",
        "LLM median",
        "Precision@K",
        "HitRate@K",
        "NDCG@K",
        "Rerank avg\n(normalized)",
    ]
    values_by_method = {
        method: [
            safe_stat(scores_for(rows, method, "llm_score"), mean),
            safe_stat(scores_for(rows, method, "llm_score"), median),
            scale_ratio(
                nested_number(metrics.get(method, {}), "ranking.precision_at_k")
            ),
            scale_ratio(
                nested_number(metrics.get(method, {}), "ranking.hit_rate_at_k")
            ),
            scale_ratio(nested_number(metrics.get(method, {}), "ranking.ndcg_at_k")),
            safe_stat(scores_for(rows, method, "rerank_score_normalized"), mean),
        ]
        for method in methods
    }

    fig, ax = plt.subplots(figsize=(11, 5.5))
    grouped_bars(ax, labels, values_by_method)
    ax.set_title("Recommendation Quality Summary")
    ax.set_ylabel("Score, 0-100")
    ax.set_ylim(0, 100)
    ax.grid(axis="y", alpha=0.25)
    return save(fig, out_dir / "metric_averages.png")


def llm_distribution(
    out_dir: Path, metrics: dict[str, Any], methods: list[str]
) -> Path:
    fig, ax = plt.subplots(figsize=(11, 5.5))
    left = [0.0] * len(methods)

    for bucket in BUCKET_ORDER:
        counts = [
            float(metrics.get(method, {}).get("llm_distribution", {}).get(bucket, 0))
            for method in methods
        ]
        ax.barh(methods, counts, left=left, color=BUCKET_COLORS[bucket], label=bucket)
        left = [start + count for start, count in zip(left, counts)]

    ax.set_title("LLM Suitability Distribution")
    ax.set_xlabel("Number of recommendations")
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, -0.32), ncol=3)
    ax.grid(axis="x", alpha=0.25)
    return save(fig, out_dir / "llm_distribution.png")


def per_user_llm_average(
    out_dir: Path, rows: list[dict[str, Any]], methods: list[str]
) -> Path:
    by_user: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for row in rows:
        score = number(row.get("llm_score"))
        if score is not None:
            by_user[str(row.get("username", ""))][str(row.get("method", ""))].append(
                score
            )

    users = list(by_user)
    values_by_method = {
        method: [
            mean(by_user[user][method]) if by_user[user].get(method) else None
            for user in users
        ]
        for method in methods
    }

    fig, ax = plt.subplots(figsize=(12, max(5.5, len(users) * 0.75)))
    grouped_bars(ax, users, values_by_method, horizontal=True)
    ax.set_title("Average LLM Score by User")
    ax.set_xlabel("LLM score")
    ax.set_xlim(0, 100)
    ax.grid(axis="x", alpha=0.25)
    return save(fig, out_dir / "per_user_llm_average.png")


def llm_score_by_rank(
    out_dir: Path, rows: list[dict[str, Any]], methods: list[str]
) -> Path:
    by_rank: dict[str, dict[int, list[float]]] = defaultdict(lambda: defaultdict(list))
    for row in rows:
        score = number(row.get("llm_score"))
        rank = int(row.get("rank", 0) or 0)
        if score is not None and rank > 0:
            by_rank[str(row.get("method", ""))][rank].append(score)

    fig, ax = plt.subplots(figsize=(10, 5.5))
    for method in methods:
        ranks = sorted(by_rank.get(method, {}))
        if not ranks:
            continue
        scores = [mean(by_rank[method][rank]) for rank in ranks]
        ax.plot(ranks, scores, marker="o", color=color_for(method), label=method)

    ax.set_title("Average LLM Score by Rank")
    ax.set_xlabel("Rank")
    ax.set_ylabel("LLM score")
    ax.set_ylim(0, 100)
    ax.legend()
    ax.grid(alpha=0.25)
    return save(fig, out_dir / "llm_score_by_rank.png")


def evaluator_agreement(
    out_dir: Path, rows: list[dict[str, Any]], methods: list[str]
) -> Path:
    fig, ax = plt.subplots(figsize=(10, 6))
    for method in methods:
        xs = []
        ys = []
        for row in rows:
            if str(row.get("method", "")) != method:
                continue
            llm_score = number(row.get("llm_score"))
            rerank_score = number(row.get("rerank_score_normalized"))
            if llm_score is not None and rerank_score is not None:
                xs.append(llm_score)
                ys.append(rerank_score)
        if xs:
            ax.scatter(xs, ys, alpha=0.72, color=color_for(method), label=method)

    ax.set_title("LLM vs Rerank Evaluator Agreement")
    ax.set_xlabel("LLM score")
    ax.set_ylabel("Normalized rerank score")
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.legend()
    ax.grid(alpha=0.25)
    return save(fig, out_dir / "evaluator_agreement.png")


def latency_summary(
    out_dir: Path, rows: list[dict[str, Any]], methods: list[str]
) -> Path:
    values = unique_latency_by_method(rows)
    labels = ["Average latency", "Median latency"]
    values_by_method = {
        method: [
            safe_stat(values.get(method, []), mean),
            safe_stat(values.get(method, []), median),
        ]
        for method in methods
    }

    fig, ax = plt.subplots(figsize=(9, 5.5))
    grouped_bars(ax, labels, values_by_method)
    ax.set_title("Recommendation Latency Summary")
    ax.set_ylabel("Milliseconds")
    ax.grid(axis="y", alpha=0.25)
    return save(fig, out_dir / "latency_summary.png")


def baseline_deltas(out_dir: Path, metrics: dict[str, Any], methods: list[str]) -> Path:
    labels = [
        "LLM vs random",
        "Rerank vs random",
        "Precision@K vs random",
        "NDCG@K vs random",
    ]
    fields = [
        ("llm_average_minus_random", False),
        ("rerank_average_minus_random", True),
        ("precision_at_k_minus_random", True),
        ("ndcg_at_k_minus_random", True),
    ]
    values_by_method = {
        method: [
            scale_ratio(value) if should_scale else value
            for field, should_scale in fields
            for value in [number(metrics.get(method, {}).get(field))]
        ]
        for method in methods
    }

    fig, ax = plt.subplots(figsize=(11, 5.5))
    grouped_bars(ax, labels, values_by_method)
    ax.axhline(0, color="#334155", linewidth=1)
    ax.set_title("Difference from Random Baseline")
    ax.set_ylabel("Score difference, 0-100 scale")
    ax.grid(axis="y", alpha=0.25)
    return save(fig, out_dir / "baseline_deltas.png")


def grouped_bars(
    ax: plt.Axes,
    labels: list[str],
    values_by_method: dict[str, list[float | None]],
    *,
    horizontal: bool = False,
) -> None:
    methods = [
        method
        for method, values in values_by_method.items()
        if any(value is not None for value in values)
    ]
    positions = list(range(len(labels)))
    width = 0.8 / max(len(methods), 1)

    for index, method in enumerate(methods):
        offset = (index - (len(methods) - 1) / 2) * width
        points = [
            (pos + offset, value)
            for pos, value in zip(positions, values_by_method[method])
            if value is not None
        ]
        if not points:
            continue
        point_positions = [position for position, _ in points]
        values = [value for _, value in points]
        if horizontal:
            ax.barh(
                point_positions,
                values,
                height=width,
                color=color_for(method),
                label=method,
            )
        else:
            ax.bar(
                point_positions,
                values,
                width=width,
                color=color_for(method),
                label=method,
            )

    if horizontal:
        ax.set_yticks(positions, labels)
    else:
        ax.set_xticks(positions, labels, rotation=15, ha="right")
    ax.legend()


def unique_latency_by_method(rows: list[dict[str, Any]]) -> dict[str, list[float]]:
    seen: set[tuple[str, str, float]] = set()
    values: dict[str, list[float]] = defaultdict(list)
    for row in rows:
        latency = number(row.get("latency_ms"))
        if latency is None:
            continue
        method = str(row.get("method", ""))
        key = (str(row.get("username", "")), method, latency)
        if key in seen:
            continue
        seen.add(key)
        values[method].append(latency)
    return values


def normalize_rerank_scores(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    raw_scores = [
        score for row in rows if (score := number(row.get("rerank_score"))) is not None
    ]
    if not raw_scores:
        return rows

    min_score = min(raw_scores)
    max_score = max(raw_scores)
    span = max_score - min_score
    normalized_rows = []
    for row in rows:
        normalized = dict(row)
        score = number(row.get("rerank_score"))
        if score is not None:
            normalized["rerank_score_normalized"] = (
                0.0 if span == 0 else (score - min_score) * 100 / span
            )
        normalized_rows.append(normalized)
    return normalized_rows


def scores_for(rows: list[dict[str, Any]], method: str, field: str) -> list[float]:
    return [
        score
        for row in rows
        if str(row.get("method", "")) == method
        if (score := number(row.get(field))) is not None
    ]


def nested_number(data: Any, path: str) -> float | None:
    value = data
    for part in path.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return number(value)


def number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def scale_ratio(value: float | None) -> float | None:
    return None if value is None else value * 100


def safe_stat(values: list[float], fn: Callable[[list[float]], float]) -> float | None:
    return fn(values) if values else None


def color_for(method: str) -> str:
    return METHOD_COLORS.get(method, "#64748b")


def save(fig: plt.Figure, path: Path) -> Path:
    fig.tight_layout()
    fig.savefig(path, dpi=180)
    plt.close(fig)
    return path


if __name__ == "__main__":
    main()
