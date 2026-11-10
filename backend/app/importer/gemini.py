"""Gọi Gemini API phía máy chủ (khoá API không bao giờ ra frontend)."""
import base64
import json
import re
import time

import httpx

from .. import config

URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class GeminiError(Exception):
    pass


def available() -> bool:
    return bool(config.GEMINI_API_KEY)


def image_part(jpeg: bytes) -> dict:
    return {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(jpeg).decode()}}


def generate_json(parts: list, system: str, temperature: float = 0.2, timeout: float = 180) -> dict:
    """parts: chuỗi (text) hoặc dict part. Trả về JSON đã parse."""
    body = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": p} if isinstance(p, str) else p for p in parts]}],
        "generationConfig": {"temperature": temperature, "responseMimeType": "application/json"},
    }
    last = None
    for attempt in range(3):
        try:
            r = httpx.post(URL.format(model=config.GEMINI_MODEL), json=body, timeout=timeout,
                           headers={"x-goog-api-key": config.GEMINI_API_KEY})
        except httpx.HTTPError as e:
            last = f"Lỗi mạng: {type(e).__name__}"
        else:
            if r.status_code == 200:
                try:
                    text = "".join(p.get("text", "") for p in r.json()["candidates"][0]["content"]["parts"])
                    return parse_json(text)
                except (KeyError, IndexError, ValueError) as e:
                    raise GeminiError(f"Phản hồi AI không đúng định dạng ({type(e).__name__})")
            last = f"HTTP {r.status_code}: {r.text[:200]}"
            if r.status_code not in (429, 500, 502, 503, 504):
                break
        time.sleep(2 * (attempt + 1))
    raise GeminiError(last or "Không gọi được Gemini")


def parse_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    return json.loads(text)
