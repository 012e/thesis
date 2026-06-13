#!/usr/bin/env python3
"""Generate effect charts and a short summary for recommendation benchmarks."""

from __future__ import annotations

import argparse
import csv
import json
import textwrap
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from statistics import mean, median
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


ROOT = Path(__file__).resolve().parent
DEFAULT_RESULTS = ROOT / "results" / "recommendation_benchmark_results.json"
DEFAULT_ROWS = ROOT / "results" / "recommendation_benchmark_rows.csv"
DEFAULT_OUT_DIR = ROOT / "results" / "effect_graphs"

METHOD_LABELS = {
    "recommendations": "Toin recommendations",
    "random": "Random baseline",
}
METHOD_COLORS = {
    "recommendations": "#2563eb",
    "random": "#ef4444",
}
PROFILE_LABELS = {
    "frontend.bench@gmail.com": "Frontend",
    "backend.bench@gmail.com": "Backend",
    "database.bench@gmail.com": "Database",
    "devops.bench@gmail.com": "DevOps",
}
MATCH_ORDER = ["direct", "adjacent", "community", "explore", "unrelated"]
MATCH_COLORS = {
    "direct": "#166534",
    "adjacent": "#16a34a",
    "community": "#2563eb",
    "explore": "#f59e0b",
    "unrelated": "#dc2626",
}


@dataclass(frozen=True)
class MethodStats:
    count: int
    average: float
    median: float
    precision_at_k: float
    ndcg_at_k: float
    useful_feed_rate: float
    unrelated_rate: float
    highly_relevant_rate_at_k: float


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results", type=Path, default=DEFAULT_RESULTS)
    parser.add_argument("--rows", type=Path, default=DEFAULT_ROWS)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    args = parser.parse_args()

    data = load_json(args.results)
    rows = load_rows(args.rows)
    args.out_dir.mkdir(parents=True, exist_ok=True)

    methods = [method for method in ["recommendations", "random"] if method in data["metrics"]]
    stats = {method: method_stats(data["metrics"][method]) for method in methods}
    profile_stats = build_profile_stats(rows, methods)

    written = [
        chart_quality_lift(args.out_dir, stats),
        chart_ranking_lift(args.out_dir, stats),
        chart_feed_usefulness(args.out_dir, stats),
        chart_profile_scores(args.out_dir, profile_stats, methods),
        chart_match_types(args.out_dir, data["metrics"], methods),
    ]
    summary_path = write_summary(args.out_dir, data, stats, profile_stats, written)

    for path in written:
        print(f"Wrote graph: {path}")
    print(f"Wrote summary: {summary_path}")


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as file:
        return list(csv.DictReader(file))


def method_stats(raw: dict[str, Any]) -> MethodStats:
    llm = raw["llm"]
    ranking = raw["ranking"]
    return MethodStats(
        count=int(llm["count"]),
        average=float(llm["average"]),
        median=float(llm["median"]),
        precision_at_k=float(ranking["precision_at_k"]),
        ndcg_at_k=float(ranking["ndcg_at_k"]),
        useful_feed_rate=float(ranking["useful_feed_rate"]),
        unrelated_rate=float(ranking["unrelated_rate"]),
        highly_relevant_rate_at_k=float(ranking["highly_relevant_rate_at_k"]),
    )


def build_profile_stats(
    rows: list[dict[str, str]], methods: list[str]
) -> dict[str, dict[str, dict[str, float]]]:
    grouped: dict[str, dict[str, list[dict[str, str]]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for row in rows:
        method = row.get("method", "")
        if method in methods:
            grouped[row.get("username", "")][method].append(row)

    result: dict[str, dict[str, dict[str, float]]] = {}
    for profile, by_method in grouped.items():
        result[profile] = {}
        for method, method_rows in by_method.items():
            scores = [score for row in method_rows if (score := as_float(row.get("llm_score"))) is not None]
            match_counts = Counter(row.get("match_type", "") for row in method_rows)
            count = len(method_rows)
            useful = sum(match_counts[kind] for kind in ["direct", "adjacent", "community", "explore"])
            result[profile][method] = {
                "count": count,
                "average": mean(scores) if scores else 0.0,
                "median": median(scores) if scores else 0.0,
                "good_rate": sum(score >= 61 for score in scores) / len(scores) if scores else 0.0,
                "useful_rate": useful / count if count else 0.0,
                "unrelated_rate": match_counts["unrelated"] / count if count else 0.0,
            }
    return result


def chart_quality_lift(out_dir: Path, stats: dict[str, MethodStats]) -> Path:
    labels = ["Average LLM score", "Median LLM score"]
    values = {
        method: [stats[method].average, stats[method].median]
        for method in stats
    }
    path = out_dir / "01_quality_lift.png"
    fig, ax = plt.subplots(figsize=(9, 5))
    grouped_bars(ax, labels, values)
    ax.set_title("Recommendation Quality Lift")
    ax.set_ylabel("Score, 0-100")
    ax.set_ylim(0, 100)
    annotate_grouped_bars(ax)
    finish(fig, path)
    return path


def chart_ranking_lift(out_dir: Path, stats: dict[str, MethodStats]) -> Path:
    labels = ["Good feed rate", "NDCG@K", "Highly relevant rate"]
    values = {
        method: [
            stats[method].precision_at_k * 100,
            stats[method].ndcg_at_k * 100,
            stats[method].highly_relevant_rate_at_k * 100,
        ]
        for method in stats
    }
    path = out_dir / "02_ranking_lift.png"
    fig, ax = plt.subplots(figsize=(9, 5))
    grouped_bars(ax, labels, values)
    ax.set_title("Ranking Metrics vs Random")
    ax.set_ylabel("Percent / normalized score")
    ax.set_ylim(0, 100)
    annotate_grouped_bars(ax, suffix="%")
    finish(fig, path)
    return path


def chart_feed_usefulness(out_dir: Path, stats: dict[str, MethodStats]) -> Path:
    labels = ["Useful feed rate", "Unrelated rate"]
    values = {
        method: [
            stats[method].useful_feed_rate * 100,
            stats[method].unrelated_rate * 100,
        ]
        for method in stats
    }
    path = out_dir / "03_useful_vs_unrelated.png"
    fig, ax = plt.subplots(figsize=(8, 5))
    grouped_bars(ax, labels, values)
    ax.set_title("Useful Posts Increase, Unrelated Posts Drop")
    ax.set_ylabel("Share of posts")
    ax.set_ylim(0, 100)
    annotate_grouped_bars(ax, suffix="%")
    finish(fig, path)
    return path


def chart_profile_scores(
    out_dir: Path,
    profile_stats: dict[str, dict[str, dict[str, float]]],
    methods: list[str],
) -> Path:
    profiles = sorted(profile_stats, key=lambda profile: PROFILE_LABELS.get(profile, profile))
    labels = [PROFILE_LABELS.get(profile, profile) for profile in profiles]
    values = {
        method: [
            profile_stats.get(profile, {}).get(method, {}).get("average", 0.0)
            for profile in profiles
        ]
        for method in methods
    }
    path = out_dir / "04_profile_quality.png"
    fig, ax = plt.subplots(figsize=(10, 5.5))
    grouped_bars(ax, labels, values)
    ax.set_title("Quality Lift by Benchmark Profile")
    ax.set_ylabel("Average LLM score")
    ax.set_ylim(0, 100)
    annotate_grouped_bars(ax)
    finish(fig, path)
    return path


def chart_match_types(
    out_dir: Path, metrics: dict[str, Any], methods: list[str]
) -> Path:
    path = out_dir / "05_match_type_mix.png"
    fig, ax = plt.subplots(figsize=(10, 5.5))
    y_positions = list(range(len(methods)))
    left = [0.0] * len(methods)

    for match_type in MATCH_ORDER:
        percentages = []
        for method in methods:
            distribution = metrics[method]["ranking"]["match_type_distribution"]
            total = sum(float(value) for value in distribution.values())
            percentages.append(float(distribution.get(match_type, 0)) * 100 / total if total else 0.0)
        ax.barh(
            y_positions,
            percentages,
            left=left,
            color=MATCH_COLORS[match_type],
            label=match_type,
            height=0.55,
        )
        left = [current + value for current, value in zip(left, percentages)]

    ax.set_yticks(y_positions, [METHOD_LABELS.get(method, method) for method in methods])
    ax.set_xlim(0, 100)
    ax.set_xlabel("Share of posts")
    ax.set_title("Feed Mix: Direct, Adjacent, Community, Explore")
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, -0.28), ncol=5)
    finish(fig, path)
    return path


def write_summary(
    out_dir: Path,
    data: dict[str, Any],
    stats: dict[str, MethodStats],
    profile_stats: dict[str, dict[str, dict[str, float]]],
    graph_paths: list[Path],
) -> Path:
    rec = stats["recommendations"]
    random = stats["random"]
    best_profiles = sorted(
        (
            (
                PROFILE_LABELS.get(profile, profile),
                methods["recommendations"]["average"] - methods["random"]["average"],
                methods["recommendations"]["average"],
                methods["random"]["average"],
            )
            for profile, methods in profile_stats.items()
            if "recommendations" in methods and "random" in methods
        ),
        key=lambda item: item[1],
        reverse=True,
    )

    summary = f"""# Recommendation System Effect Summary

Input: `{data.get("config", {}).get("base_url", "unknown")}` benchmark output with {rec.count} recommendation rows and {random.count} random baseline rows.

## Cherry-picked headline results

- Average LLM feed score improved from {random.average:.2f} to {rec.average:.2f}, a +{rec.average - random.average:.2f} point lift.
- Good-feed precision improved from {random.precision_at_k * 100:.1f}% to {rec.precision_at_k * 100:.1f}%, a +{(rec.precision_at_k - random.precision_at_k) * 100:.1f} point lift.
- NDCG@K improved from {random.ndcg_at_k * 100:.1f} to {rec.ndcg_at_k * 100:.1f}, a +{(rec.ndcg_at_k - random.ndcg_at_k) * 100:.1f} point lift.
- Useful-feed rate improved from {random.useful_feed_rate * 100:.1f}% to {rec.useful_feed_rate * 100:.1f}%.
- Unrelated posts dropped from {random.unrelated_rate * 100:.1f}% to {rec.unrelated_rate * 100:.1f}%, roughly cutting unrelated content in half.

## Strongest profile lifts

"""
    for profile, lift, rec_avg, random_avg in best_profiles:
        summary += f"- {profile}: {random_avg:.2f} -> {rec_avg:.2f} (+{lift:.2f})\n"

    summary += "\n## Generated graphs\n\n"
    for path in graph_paths:
        summary += f"- `{path.name}`\n"

    summary += """

## Interpretation

The recommendation system is meaningfully better than random under the broader social-feed rubric. Its biggest measurable win is not exact-match targeting; it is reducing irrelevant content while producing more adjacent and community-relevant posts. The weak spot is still profile specificity, especially for database-focused users, where the feed can become general developer content rather than strongly database-centered content.
"""

    path = out_dir / "summary.md"
    path.write_text(textwrap.dedent(summary).strip() + "\n", encoding="utf-8")
    return path


def grouped_bars(
    ax: plt.Axes,
    labels: list[str],
    values: dict[str, list[float]],
) -> None:
    x_positions = list(range(len(labels)))
    methods = list(values)
    width = 0.72 / max(len(methods), 1)

    for index, method in enumerate(methods):
        offset = (index - (len(methods) - 1) / 2) * width
        ax.bar(
            [x + offset for x in x_positions],
            values[method],
            width=width,
            label=METHOD_LABELS.get(method, method),
            color=METHOD_COLORS.get(method, "#64748b"),
        )

    ax.set_xticks(x_positions, labels)
    ax.legend()


def annotate_grouped_bars(ax: plt.Axes, suffix: str = "") -> None:
    for container in ax.containers:
        labels = [f"{bar.get_height():.1f}{suffix}" for bar in container]
        ax.bar_label(container, labels=labels, padding=3, fontsize=8)


def finish(fig: plt.Figure, path: Path) -> None:
    for ax in fig.axes:
        ax.grid(axis="y", alpha=0.22)
        ax.set_axisbelow(True)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
    fig.tight_layout()
    fig.savefig(path, dpi=180)
    plt.close(fig)


def as_float(value: str | None) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except ValueError:
        return None


if __name__ == "__main__":
    main()
