from __future__ import annotations

from typing import Any


def post_text(post: dict[str, Any]) -> str:
    content = post.get("content") if isinstance(post.get("content"), dict) else {}
    parts: list[str] = []
    text = content.get("text")
    if isinstance(text, str):
        parts.append(text)
    poll = content.get("poll")
    if isinstance(poll, dict):
        if isinstance(poll.get("question"), str):
            parts.append(poll["question"])
        options = poll.get("options")
        if isinstance(options, list):
            parts.extend(o.get("label", "") for o in options if isinstance(o, dict))
    visualization = content.get("visualization")
    if isinstance(visualization, dict):
        for key in ("title", "description", "unit"):
            if isinstance(visualization.get(key), str):
                parts.append(visualization[key])
    tags = post.get("tags")
    if isinstance(tags, list):
        for tag in tags:
            if isinstance(tag, dict):
                parts.append(str(tag.get("displayName") or tag.get("slug") or ""))
    return "\n".join(part for part in parts if part).strip()


def post_metadata(post: dict[str, Any]) -> str:
    tags = post.get("tags")
    tag_names = []
    if isinstance(tags, list):
        tag_names = [
            str(tag.get("displayName") or tag.get("slug"))
            for tag in tags
            if isinstance(tag, dict) and (tag.get("displayName") or tag.get("slug"))
        ]
    return ", ".join(tag_names)
