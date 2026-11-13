"""Gửi thông báo yêu cầu hỗ trợ tới Zalo qua Zalo Bot Platform (bot tạo bằng Zalo Bot Manager).

API dạng:  POST {ZALO_API_BASE}/bot<TOKEN>/<method>  với thân JSON — sendMessage {chat_id, text}, sendPhoto {chat_id, photo(URL), caption}.
Token chỉ nằm ở máy chủ, không bao giờ ra trình duyệt.
"""
from datetime import datetime, timedelta, timezone

import httpx

from . import config

VN = timezone(timedelta(hours=7))


def configured() -> bool:
    return bool(config.ZALO_BOT_TOKEN and config.ZALO_CHAT_ID)


def call(method: str, payload: dict | None = None, timeout: float = 20) -> dict:
    if not config.ZALO_BOT_TOKEN:
        raise RuntimeError("Chưa cấu hình ZALO_BOT_TOKEN")
    try:
        r = httpx.post(f"{config.ZALO_API_BASE}/bot{config.ZALO_BOT_TOKEN}/{method}", json=payload or {}, timeout=timeout)
        data = r.json()
    except httpx.HTTPError as e:
        raise RuntimeError(f"Không kết nối được Zalo ({type(e).__name__})")
    except ValueError:
        raise RuntimeError(f"Zalo trả về HTTP {r.status_code}")
    if not data.get("ok"):
        raise RuntimeError(f"Zalo từ chối: {data.get('description') or data.get('error_code') or r.status_code}")
    return data.get("result") or {}


def ticket_text(t: dict) -> str:
    when = datetime.fromtimestamp(t["created_at"], VN).strftime("%H:%M %d/%m/%Y")
    lines = [f"🆘 YÊU CẦU HỖ TRỢ MỚI · {t['code']}", f"📞 SĐT: {t['phone']}", f"🕒 {when}"]
    if t.get("page"):
        lines.append(f"📄 Đang xem: {t['page']}")
    lines += ["", t["content"]]
    if t.get("image"):
        lines += ["", "🖼 Có ảnh chụp màn hình" + (" (gửi kèm bên dưới)" if config.PUBLIC_BASE_URL else " — xem trong Studio, mục Yêu cầu")]
    return "\n".join(lines)[:2000]


def send_ticket(t: dict) -> str:
    """Trả về chuỗi trạng thái để lưu vào yêu cầu: 'sent' | 'sent-no-photo: …' | 'off' | 'error: …'."""
    if not configured():
        return "off"
    try:
        call("sendMessage", {"chat_id": config.ZALO_CHAT_ID, "text": ticket_text(t)})
    except RuntimeError as e:
        return f"error: {e}"[:300]
    if t.get("image") and config.PUBLIC_BASE_URL:
        try:  # Zalo tải ảnh từ URL công khai; đường dẫn chứa mã ngẫu nhiên riêng cho từng ảnh
            call("sendPhoto", {"chat_id": config.ZALO_CHAT_ID, "caption": f"Ảnh của yêu cầu {t['code']}",
                               "photo": f"{config.PUBLIC_BASE_URL}/api/support/image/{t['image_token']}.jpg"})
        except RuntimeError as e:
            return f"sent-no-photo: {e}"[:300]
    return "sent"
