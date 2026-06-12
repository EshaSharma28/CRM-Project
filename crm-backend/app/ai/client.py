"""Provider-agnostic AI client with automatic fallback.

The rest of the app talks to `generate_json()` / `generate_text()` and never
imports a vendor SDK directly. A primary provider (default Google Gemini) is
tried first; if it's rate-limited or unavailable, we automatically fall back to
a secondary provider (Groq) when one is configured. Adding a provider means one
small `_call_*` method here — nothing else in the app changes. This indirection
is a deliberate code-quality choice (see the walkthrough video).
"""
from __future__ import annotations

import json
import re
import time

import httpx

from app.config import settings

# Transient statuses worth retrying within a provider.
_RETRYABLE_STATUS = {500, 503}
_MAX_RETRIES = 3
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


class AIUnavailable(Exception):
    """Raised when an AI provider can't serve a request (quota/capacity).

    Carries an HTTP status so callers can surface a clean message instead of a 500.
    """

    def __init__(self, status: int, message: str):
        self.status = status
        self.message = message
        super().__init__(message)


class AIClient:
    def __init__(self) -> None:
        # Ordered list of providers to try. Fallback only added if a REAL key is
        # set (Groq keys start with "gsk_"); the .env placeholder is ignored.
        self.providers = [settings.ai_provider]
        if settings.groq_api_key.startswith("gsk_") and "groq" not in self.providers:
            self.providers.append("groq")
        self._gemini = None

    # --- providers ---------------------------------------------------------

    def _gemini_client(self):
        if self._gemini is None:
            from google import genai

            self._gemini = genai.Client(api_key=settings.gemini_api_key)
        return self._gemini

    def _call_gemini(self, prompt: str) -> str:
        from google.genai.errors import APIError

        for attempt in range(_MAX_RETRIES):
            try:
                resp = self._gemini_client().models.generate_content(
                    model=settings.gemini_model, contents=prompt
                )
                return resp.text or ""
            except APIError as e:
                status = getattr(e, "code", None) or getattr(e, "status_code", None) or 503
                # 429 = quota: don't burn time retrying, fall back immediately.
                if status in _RETRYABLE_STATUS and attempt < _MAX_RETRIES - 1:
                    time.sleep(1.5 * (2**attempt))
                    continue
                msg = (
                    "Gemini free-tier quota is exhausted."
                    if status == 429 else "Gemini is temporarily unavailable."
                )
                raise AIUnavailable(status, msg) from e

    def _call_groq(self, prompt: str) -> str:
        headers = {"Authorization": f"Bearer {settings.groq_api_key}"}
        body = {
            "model": settings.groq_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
        }
        for attempt in range(_MAX_RETRIES):
            try:
                r = httpx.post(GROQ_URL, json=body, headers=headers, timeout=30)
                if r.status_code == 200:
                    return r.json()["choices"][0]["message"]["content"] or ""
                if r.status_code in _RETRYABLE_STATUS and attempt < _MAX_RETRIES - 1:
                    time.sleep(1.5 * (2**attempt))
                    continue
                raise AIUnavailable(r.status_code, f"Groq error {r.status_code}.")
            except httpx.HTTPError as e:
                if attempt < _MAX_RETRIES - 1:
                    time.sleep(1.5 * (2**attempt))
                    continue
                raise AIUnavailable(503, "Groq is unreachable.") from e

    def _call(self, provider: str, prompt: str) -> str:
        if provider == "gemini":
            return self._call_gemini(prompt)
        if provider == "groq":
            return self._call_groq(prompt)
        raise ValueError(f"Unsupported AI provider: {provider}")

    # --- public API --------------------------------------------------------

    def generate_text(self, prompt: str) -> str:
        """Free-form text. Tries each provider in order; falls back on failure."""
        last_error: AIUnavailable | None = None
        for provider in self.providers:
            try:
                return self._call(provider, prompt)
            except AIUnavailable as e:
                last_error = e
                continue  # try the next provider
        raise last_error or AIUnavailable(503, "No AI provider available.")

    def generate_json(self, prompt: str) -> dict:
        """Structured output. Returns a parsed dict; caller validates schema."""
        raw = self.generate_text(prompt + "\n\nReturn ONLY valid JSON, no prose.")
        return _extract_json(raw)


def _extract_json(text: str) -> dict:
    """Multi-strategy JSON extraction — handles fences, preamble, and noise.

    Strategy 1: strip markdown code fences and parse.
    Strategy 2: find the first balanced { } block (handles preamble text).
    Strategy 3: find the first balanced [ ] block (for array responses).
    """
    text = text.strip()

    # Strategy 1: strip markdown fences (``` or ```json)
    cleaned = re.sub(r"^```(?:json)?\s*", "", text)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Strategy 2 & 3: find the first balanced { } or [ ] block
    for open_ch, close_ch in (("{", "}"), ("[", "]")):
        start = text.find(open_ch)
        if start == -1:
            continue
        depth, i, in_str = 0, start, False
        while i < len(text):
            ch = text[i]
            if ch == '"' and (i == 0 or text[i - 1] != '\\'):
                in_str = not in_str
            elif not in_str:
                if ch == open_ch:
                    depth += 1
                elif ch == close_ch:
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(text[start : i + 1])
                        except json.JSONDecodeError:
                            break
            i += 1

    raise AIUnavailable(502, "AI returned unparseable output.")


_client: AIClient | None = None


def get_ai() -> AIClient:
    global _client
    if _client is None:
        _client = AIClient()
    return _client
