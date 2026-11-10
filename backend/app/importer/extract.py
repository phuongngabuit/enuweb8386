"""Trích xuất nội dung thô từ DOCX / PDF / MP4 thành chuỗi block theo đúng thứ tự xuất hiện.

Block: {"type": "text", "text": str, "heading": bool} | {"type": "image", "data": bytes, "ts"?: float, "page"?: int}
"""
import json
import re
import shutil
import subprocess
import zipfile
from pathlib import Path

from .. import config, media


class ImportError_(Exception):
    """Lỗi có thông điệp hiển thị cho người biên tập."""


def sniff(path: Path, ext: str):
    head = path.open("rb").read(16)
    if ext == "docx":
        if not head.startswith(b"PK"):
            raise ImportError_("Tệp không phải DOCX hợp lệ.")
        try:
            with zipfile.ZipFile(path) as z:
                if "word/document.xml" not in z.namelist():
                    raise ImportError_("Tệp không phải DOCX hợp lệ.")
                if sum(i.file_size for i in z.infolist()) > 300 * 1024 * 1024:
                    raise ImportError_("DOCX giải nén quá lớn.")
        except zipfile.BadZipFile:
            raise ImportError_("Tệp DOCX bị hỏng.")
    elif ext == "pdf":
        if not head.startswith(b"%PDF"):
            raise ImportError_("Tệp không phải PDF hợp lệ.")
    elif ext == "mp4":
        if head[4:8] != b"ftyp":
            raise ImportError_("Tệp không phải MP4 hợp lệ.")


def extract_docx(path: Path) -> list[dict]:
    import docx
    from docx.oxml.ns import qn

    doc = docx.Document(str(path))
    blocks = []

    def para(p_el):
        from docx.text.paragraph import Paragraph
        p = Paragraph(p_el, doc)
        text = p.text.strip()
        style = (p.style.name or "").lower() if p.style is not None else ""
        if text:
            numbered = p_el.find(".//" + qn("w:numPr")) is not None
            blocks.append({"type": "text", "text": text, "numbered": numbered,
                           "heading": style.startswith(("heading", "title")) or "tiêu đề" in style})
        for blip in p_el.iter(qn("a:blip")):
            rid = blip.get(qn("r:embed"))
            part = doc.part.related_parts.get(rid) if rid else None
            if part is not None:
                blocks.append({"type": "image", "data": part.blob})

    for el in doc.element.body.iterchildren():
        if el.tag == qn("w:p"):
            para(el)
        elif el.tag == qn("w:tbl"):
            for row in el.iter(qn("w:tr")):
                cells = []
                for tc in row.iter(qn("w:tc")):
                    cells.append(" ".join(t.text or "" for t in tc.iter(qn("w:t"))).strip())
                    for blip in tc.iter(qn("a:blip")):
                        part = doc.part.related_parts.get(blip.get(qn("r:embed")))
                        if part is not None:
                            blocks.append({"type": "image", "data": part.blob})
                line = " | ".join(c for c in cells if c)
                if line:
                    blocks.append({"type": "text", "text": line, "heading": False})
    return blocks


def extract_pdf(path: Path) -> list[dict]:
    import pymupdf as fitz

    doc = fitz.open(str(path))
    if doc.needs_pass:
        raise ImportError_("PDF có mật khẩu, không thể đọc.")
    if doc.page_count > config.MAX_PDF_PAGES:
        raise ImportError_(f"PDF vượt quá {config.MAX_PDF_PAGES} trang.")
    blocks, sizes, n_img, n_text = [], [], 0, 0
    for page in doc:
        d = page.get_text("dict")
        for b in d["blocks"]:
            if b["type"] == 0:
                sizes += [s["size"] for l in b["lines"] for s in l["spans"] if s["text"].strip()]
    body = sorted(sizes)[len(sizes) // 2] if sizes else 11
    for pno, page in enumerate(doc):
        d = page.get_text("dict", sort=True)
        for b in d["blocks"]:
            if b["type"] == 0:
                spans = [s for l in b["lines"] for s in l["spans"] if s["text"].strip()]
                text = " ".join(" ".join(s["text"] for s in l["spans"]).strip() for l in b["lines"]).strip()
                if not text:
                    continue
                big = max(s["size"] for s in spans) > body * 1.15
                bold = all(s["flags"] & 16 for s in spans)
                blocks.append({"type": "text", "text": text, "heading": (big or bold) and len(text) < 120, "page": pno + 1})
                n_text += len(text)
            elif b["type"] == 1 and b.get("image"):
                blocks.append({"type": "image", "data": b["image"], "page": pno + 1}); n_img += 1
    if n_img == 0:  # PDF scan hoặc ảnh vector: chụp cả trang làm ảnh minh hoạ
        out = []
        for pno, page in enumerate(doc):
            if pno >= config.MAX_IMAGES:
                break
            out += [b for b in blocks if b.get("page") == pno + 1]
            if n_text < 40 or page.get_drawings():
                out.append({"type": "image", "data": page.get_pixmap(dpi=110).tobytes("png"), "page": pno + 1})
        out += [b for b in blocks if b.get("page", 0) > config.MAX_IMAGES]
        blocks = out
    return blocks


def _run(cmd, timeout):
    return subprocess.run(cmd, capture_output=True, timeout=timeout, check=False)


def ffmpeg_bin() -> str:
    """ffmpeg của hệ thống; nếu không có thì dùng bản đóng gói sẵn của imageio-ffmpeg."""
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        raise ImportError_("Máy chủ chưa cài FFmpeg.")


def video_duration(path: Path) -> float:
    if shutil.which("ffprobe"):
        r = _run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)], 30)
        try:
            return float(json.loads(r.stdout)["format"]["duration"])
        except Exception:
            raise ImportError_("Không đọc được video (ffprobe).")
    r = _run([ffmpeg_bin(), "-hide_banner", "-i", str(path)], 30)
    m = re.search(rb"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", r.stderr)
    if not m:
        raise ImportError_("Không đọc được video.")
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])


def extract_video(path: Path, workdir: Path) -> tuple[list[dict], float]:
    """Lấy mẫu khung hình, giữ lại các khung mà màn hình vừa thay đổi rõ rệt."""
    dur = video_duration(path)
    if dur > config.MAX_VIDEO_SECONDS:
        raise ImportError_("Video dài hơn 10 phút.")
    step = max(1.0, dur / 90)
    small = workdir / "small"; small.mkdir(parents=True, exist_ok=True)
    r = _run([ffmpeg_bin(), "-v", "error", "-i", str(path), "-vf", f"fps=1/{step},scale=160:-2", "-q:v", "5",
              str(small / "%04d.jpg")], 300)
    files = sorted(small.glob("*.jpg"))
    if not files:
        raise ImportError_("Không trích được khung hình: " + r.stderr.decode(errors="ignore")[-200:])
    sigs = [media.signature(f) for f in files]
    # Điểm thay đổi so với khung trước đó; khung đầu luôn được chọn.
    picks, last = [(0, 999.0)], sigs[0]
    for i in range(1, len(sigs)):
        d = media.sig_diff(sigs[i], last)
        if d > 1.5:
            # chờ màn hình "đứng yên": lấy khung kế tiếp nếu nó gần giống khung này
            j = i + 1 if i + 1 < len(sigs) and media.sig_diff(sigs[i + 1], sigs[i]) < 1.5 else i
            picks.append((j, d)); last = sigs[j]
    if len(picks) > config.MAX_CANDIDATES:
        keep = sorted(picks, key=lambda p: -p[1])[: config.MAX_CANDIDATES]
        picks = sorted(keep)
    blocks = []
    for idx, _ in picks:
        ts = min(idx * step + step / 2, max(dur - 0.1, 0))
        out = workdir / f"f{idx}.png"
        _run([ffmpeg_bin(), "-v", "error", "-ss", f"{ts:.2f}", "-i", str(path), "-frames:v", "1", str(out)], 60)
        if out.exists():
            blocks.append({"type": "image", "data": out.read_bytes(), "ts": round(ts, 1)})
    return blocks, dur
