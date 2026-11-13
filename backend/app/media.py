"""Lưu ảnh an toàn: giải mã lại bằng Pillow, xuất WebP, loại bỏ metadata."""
import hashlib
import io

from PIL import Image

from . import config

Image.MAX_IMAGE_PIXELS = 40_000_000


def save_image(gid: str, data: bytes, max_w: int = 1600, **extra) -> dict | None:
    """Trả về asset {id, file, w, h, ...} hoặc None nếu ảnh hỏng/quá nhỏ."""
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
    except Exception:
        return None
    if im.width < 120 or im.height < 120:
        return None  # icon, đường kẻ trang trí
    im = im.convert("RGBA" if "A" in im.getbands() or im.mode == "P" else "RGB")
    if im.mode == "RGBA":
        bg = Image.new("RGB", im.size, "white"); bg.paste(im, mask=im.split()[3]); im = bg
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    digest = hashlib.sha1(im.tobytes()).hexdigest()[:12]
    folder = config.MEDIA_DIR / gid
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{digest}.webp"
    im.save(folder / name, "WEBP", quality=88, method=4)
    return {"id": digest, "file": f"{gid}/{name}", "w": im.width, "h": im.height, **extra}


def to_jpeg_bytes(path, max_w=1024) -> bytes:
    """Bản thu nhỏ gửi cho Gemini để tiết kiệm token."""
    im = Image.open(path).convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)))
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=80)
    return buf.getvalue()


def signature(path) -> bytes:
    return Image.open(path).convert("L").resize((32, 32)).tobytes()


def sig_diff(a: bytes, b: bytes) -> float:
    """Phần trăm số ô (lưới 32x32) thay đổi rõ rệt giữa hai khung hình."""
    return 100 * sum(1 for x, y in zip(a, b) if abs(x - y) > 20) / len(a)


def save_shot(data: bytes, dest) -> bool:
    """Ảnh chụp màn hình người dùng gửi: giải mã lại, bỏ metadata, lưu JPEG."""
    try:
        im = Image.open(io.BytesIO(data)); im.load()
    except Exception:
        return False
    if im.width < 40 or im.height < 40:
        return False
    im = im.convert("RGB")
    if max(im.size) > 2000:
        k = 2000 / max(im.size); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    im.save(dest, "JPEG", quality=85)
    return True
