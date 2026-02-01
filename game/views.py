from __future__ import annotations

import json
import os
from pathlib import Path

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods

TARGET_SCORE = 10_000


def _load_env_values() -> dict[str, str]:
    """Parse .env file without needing extra dependencies."""
    env_path = Path(settings.BASE_DIR) / ".env"
    values: dict[str, str] = {}
    if not env_path.exists():
        return values

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


_ENV_VALUES = _load_env_values()
FLAG_URL = os.environ.get("url") or _ENV_VALUES.get("url", "")
FLAG_CODE = os.environ.get("code") or _ENV_VALUES.get("code", "")
FLAG_TEXT = (
    f"오픈채팅방 주소: {FLAG_URL} | 참여코드: {FLAG_CODE}"
    if FLAG_URL and FLAG_CODE
    else "오픈채팅 정보를 불러오지 못했습니다."
)


def home(request: HttpRequest) -> HttpResponse:
    """Simple landing page before launching the game."""
    return render(request, "game/home.html")


def index(request: HttpRequest) -> HttpResponse:
    """Serve the interactive Suika game page."""
    raw_boost = request.POST.get("score_boost", "1")
    try:
        score_boost = int(raw_boost)
    except (TypeError, ValueError):
        score_boost = 1

    # Allow any positive integer score boost with no upper bound.
    if score_boost < 1:
        score_boost = 1

    return render(
        request,
        "game/index.html",
        {
            "target_score": TARGET_SCORE,
            "score_boost": score_boost,
        },
    )


@require_http_methods(["POST"])
def result(request: HttpRequest) -> HttpResponse:
    """Display the result page after a failed run."""
    raw_score = request.POST.get("score", "0")
    status = request.POST.get("status", "failure")
    raw_boost = request.POST.get("score_boost", "1")
    try:
        boost_value = int(raw_boost)
    except (TypeError, ValueError):
        boost_value = 1
    if boost_value < 1:
        boost_value = 1
    try:
        score = int(raw_score)
    except (TypeError, ValueError):
        score = 0

    return render(
        request,
        "game/result.html",
        {
            "score": score,
            "target_score": TARGET_SCORE,
            "status": status,
            "score_boost": boost_value,
            "revealed_flag": FLAG_TEXT if score >= TARGET_SCORE else "",
        },
    )
