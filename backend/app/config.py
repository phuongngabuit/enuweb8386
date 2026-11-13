"""Cấu hình đọc từ biến môi trường (.env do Docker Compose nạp)."""
import os
from pathlib import Path

DATA_DIR = Path(os.getenv("SF_DATA_DIR", "./data")).resolve()
MEDIA_DIR = DATA_DIR / "media"
TMP_DIR = DATA_DIR / "tmp"
TICKETS_DIR = DATA_DIR / "tickets"   # ảnh chụp màn hình của yêu cầu hỗ trợ (riêng tư)
DOCS_DIR = DATA_DIR / "docs"   # tài liệu cho người dùng tải về
DB_PATH = DATA_DIR / "supportflow.db"
STATIC_DIR = Path(os.getenv("SF_STATIC_DIR", Path(__file__).resolve().parents[2] / "frontend" / "dist"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
EDITOR_TOKEN = os.getenv("EDITOR_TOKEN", "").strip()

# Zalo Bot (tạo trong Zalo Bot Manager) — nhận thông báo khi có yêu cầu hỗ trợ mới
ZALO_BOT_TOKEN = os.getenv("ZALO_BOT_TOKEN", "").strip()
ZALO_CHAT_ID = os.getenv("ZALO_CHAT_ID", "").strip()
ZALO_API_BASE = os.getenv("ZALO_API_BASE", "https://bot-api.zaloplatforms.com").rstrip("/")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")   # ví dụ https://hotro.enumber.vn — cần để Zalo tải được ảnh
MAX_SHOT_BYTES = 8 * 1024 * 1024

PUBLIC_PORT = int(os.getenv("PUBLIC_PORT", "8080"))
EDITOR_PORT = int(os.getenv("EDITOR_PORT", "8081"))
EDITOR_HOST = os.getenv("EDITOR_HOST", "127.0.0.1")
PUBLIC_HOST = os.getenv("PUBLIC_HOST", "0.0.0.0")

MAX_DOC_BYTES = 25 * 1024 * 1024
MAX_VIDEO_BYTES = 80 * 1024 * 1024
MAX_VIDEO_SECONDS = 600
MAX_IMAGES = 12          # số ảnh minh hoạ tối đa trong một bài
MAX_CANDIDATES = 24      # số ảnh/khung hình ứng viên gửi cho AI
MAX_STEPS = 20
MAX_PDF_PAGES = 60
ASK_DAILY_LIMIT = int(os.getenv("ASK_DAILY_LIMIT", "500"))

SUPPORT = {
    "phone": os.getenv("SUPPORT_PHONE", ""),
    "email": os.getenv("SUPPORT_EMAIL", ""),
    "hours": os.getenv("SUPPORT_HOURS", ""),
    "zalo": os.getenv("SUPPORT_ZALO", ""),
}

PLATFORMS = {"mobile": "Mobile App", "web": "Web App"}
CATEGORIES = {
    "bat-dau": "Bắt đầu sử dụng",
    "dang-nhap": "Đăng nhập & tài khoản",
    "khuon-mat": "Khuôn mặt",
    "cham-cong": "Chấm công",
    "don-tu": "Công tác & đơn từ",
    "quan-ly": "Quản lý",
    "bao-cao": "Thống kê & báo cáo",
    "phe-duyet": "Phê duyệt",
    "khac": "Khác",
}


def ensure_dirs():
    for d in (DATA_DIR, MEDIA_DIR, TMP_DIR, DOCS_DIR, TICKETS_DIR):
        d.mkdir(parents=True, exist_ok=True)
