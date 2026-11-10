"""AI Import: tệp nguồn -> bản nháp bài hướng dẫn (không bao giờ tự xuất bản)."""
import difflib
import re
import shutil
import time
import traceback
import uuid
from pathlib import Path

from .. import config, db, media
from ..textnorm import norm
from . import extract, gemini
from .extract import ImportError_

SYSTEM = """Bạn là biên tập viên tài liệu hướng dẫn sử dụng phần mềm ENumber Chấm Công (Mobile App và Web App) của Công ty eNumber.
Nhiệm vụ: chuyển NGUỒN (tài liệu hoặc các khung hình video) thành MỘT bài hướng dẫn từng bước bằng tiếng Việt, văn phong rõ ràng, lịch sự, dễ hiểu với cán bộ, công chức.

QUY TẮC BẮT BUỘC
- Chỉ dùng thông tin có trong nguồn. Tuyệt đối không bịa chức năng, tên nút, tên menu không xuất hiện trong nguồn.
- Giữ đúng trình tự thao tác. Gộp các bước trùng lặp. Tối đa {max_steps} bước, tối đa {max_images} ảnh.
- Mỗi bước là một thao tác: "title" ngắn bắt đầu bằng động từ, "body" 1-3 câu.
- "image_id": id ảnh trong nguồn minh hoạ đúng bước đó (mỗi ảnh dùng tối đa một lần), hoặc null nếu không có ảnh phù hợp. Không gán ảnh nếu không chắc.
- "hotspot": nếu trên ảnh nhìn thấy rõ nút/ô cần nhấn ở bước đó: {{"label": "tên nút", "box_2d": [ymin, xmin, ymax, xmax]}} toạ độ chuẩn hoá 0-1000; nếu không thấy rõ thì null.
- "confidence": 0-1, mức chắc chắn rằng bước đúng với nguồn. Nếu < 0.7 hãy nêu lý do ngắn trong "uncertain_reason".
- "note" là lưu ý hữu ích, "warning" là cảnh báo dễ gây lỗi; để chuỗi rỗng nếu nguồn không nêu.
- Nếu ảnh chứa thông tin cá nhân thật (họ tên, số điện thoại, CCCD...), ghi vào "review_notes" để người biên tập che lại.

TRẢ VỀ DUY NHẤT MỘT JSON:
{{"title": str, "summary": str (1-2 câu), "platform": "mobile"|"web", "category": một trong {cats},
 "kind": "guide"|"fix" (fix = bài khắc phục lỗi), "keywords": [str] (5-10 từ khoá người dùng hay gõ, kể cả cách nói dân dã),
 "quick": [str] (3-5 gạch đầu dòng tóm tắt), "review_notes": [str],
 "steps": [{{"title": str, "body": str, "image_id": str|null, "hotspot": obj|null, "note": str, "warning": str,
            "confidence": number, "uncertain_reason": str, "timestamp": number|null}}]}}"""

STEP_RE = re.compile(r"^\s*(?:bước|buoc|b)\s*\d+\s*[:.)\-–]?\s*|^\s*\d{1,2}\s*[.)]\s+", re.I)


def detect_kind(filename: str) -> str:
    ext = Path(filename).suffix.lower().lstrip(".")
    if ext not in ("docx", "pdf", "mp4"):
        raise ImportError_("Chỉ hỗ trợ tệp DOCX, PDF hoặc MP4.")
    return ext


def run_job(jid: str, path: Path, filename: str, kind: str):
    """Chạy trong luồng nền; cập nhật tiến độ để giao diện hiển thị pipeline."""
    workdir = path.parent
    gid = uuid.uuid4().hex[:12]
    try:
        up = lambda stage, progress, message: db.job_update(jid, stage=stage, progress=progress, message=message)
        up("extract", 15, "Đang trích xuất văn bản và hình ảnh…")
        extract.sniff(path, kind)
        duration = None
        if kind == "docx":
            blocks = extract.extract_docx(path)
        elif kind == "pdf":
            blocks = extract.extract_pdf(path)
        else:
            blocks, duration = extract.extract_video(path, workdir)
        blocks, assets = store_images(gid, blocks)
        if not assets and not any(b["type"] == "text" for b in blocks):
            raise ImportError_("Không tìm thấy nội dung nào trong tệp.")

        n_img = len(assets)
        ai_info = {"model": None, "mode": "heuristic", "notes": [], "error": None}
        result = None
        if gemini.available():
            up("ai", 45, f"Gemini đang phân tích {n_img} ảnh và nội dung…")
            try:
                result = gemini.generate_json(build_parts(blocks, kind, assets), SYSTEM.format(
                    max_steps=config.MAX_STEPS, max_images=config.MAX_IMAGES, cats=list(config.CATEGORIES)))
                ai_info.update(model=config.GEMINI_MODEL, mode="gemini")
            except Exception as e:  # AI lỗi -> vẫn tạo bản nháp bằng quy tắc
                ai_info["error"] = str(e)[:300]
        else:
            ai_info["error"] = "Chưa cấu hình GEMINI_API_KEY"
        if result is None:
            up("ai", 55, "Không dùng được AI — dựng bản nháp bằng quy tắc, cần biên tập kỹ.")
            result = heuristic(blocks, kind, filename)

        up("normalize", 75, "Chuẩn hoá, ghép ảnh vào bước và loại bước trùng…")
        content, notes = normalize(result, assets, ai_info["mode"])
        ai_info["notes"] = notes
        if kind == "mp4":
            shutil.copy(path, config.MEDIA_DIR / gid / "source.mp4")
            content["video"] = f"{gid}/source.mp4"
        up("build", 90, "Dựng bản nháp…")
        source = {"filename": filename, "type": kind, "imported_at": time.time(), "duration": duration,
                  "images_found": n_img}
        db.create_guide(content, assets=assets, source=source, ai=ai_info, gid=gid)
        db.job_update(jid, status="done", stage="done", progress=100, guide_id=gid,
                      message=f"Đã tạo bản nháp {len(content['steps'])} bước — chờ biên tập duyệt.")
    except ImportError_ as e:
        shutil.rmtree(config.MEDIA_DIR / gid, ignore_errors=True)
        db.job_update(jid, status="error", message=str(e))
    except Exception as e:
        traceback.print_exc()
        shutil.rmtree(config.MEDIA_DIR / gid, ignore_errors=True)
        db.job_update(jid, status="error", message=f"Lỗi xử lý: {type(e).__name__}")
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def store_images(gid, blocks):
    """Lưu ảnh, bỏ ảnh trùng/ảnh rác, giới hạn số ứng viên. Trả về (blocks đã gắn id, assets)."""
    out, assets, seen = [], [], set()
    for b in blocks:
        if b["type"] != "image":
            out.append(b); continue
        if len(assets) >= config.MAX_CANDIDATES:
            continue
        extra = {k: b[k] for k in ("ts", "page") if k in b}
        a = media.save_image(gid, b["data"], **extra)
        if not a or a["id"] in seen:
            continue
        seen.add(a["id"])
        a["id"] = f"img{len(assets) + 1}"
        assets.append(a)
        out.append({"type": "image", "id": a["id"], **extra})
    return out, assets


def fmt_ts(ts):
    return f"{int(ts // 60)}:{int(ts % 60):02d}"


def build_parts(blocks, kind, assets):
    files = {a["id"]: config.MEDIA_DIR / a["file"] for a in assets}
    parts = ["NGUỒN là " + ("các khung hình trích từ video quay màn hình, theo thứ tự thời gian. Hãy suy ra thao tác từ sự thay đổi giữa các khung."
                            if kind == "mp4" else f"tài liệu {kind.upper()}, nội dung và ảnh theo đúng thứ tự xuất hiện.")]
    text_budget = 60000
    for b in blocks:
        if b["type"] == "text":
            t = ("## " if b.get("heading") else "") + b["text"]
            text_budget -= len(t)
            if text_budget > 0:
                parts.append(t)
        else:
            label = f"[ẢNH id={b['id']}" + (f" tại {fmt_ts(b['ts'])} ({b['ts']}s)" if "ts" in b else "") + "]"
            parts.append(label)
            parts.append(gemini.image_part(media.to_jpeg_bytes(files[b["id"]])))
    parts.append("Hãy trả về JSON theo đúng định dạng đã nêu.")
    return parts


def heuristic(blocks, kind, filename):
    """Dựng bản nháp không cần AI: tách bước theo tiêu đề / dòng đánh số, ảnh đi theo bước gần nhất phía trên."""
    stem = Path(filename).stem.replace("_", " ").replace("-", " ").strip()
    if kind == "mp4":
        steps = [{"title": f"Thao tác tại {fmt_ts(b['ts'])}", "body": "", "image_id": b["id"], "timestamp": b["ts"],
                  "confidence": 0.2, "uncertain_reason": "Chưa có mô tả — cần người biên tập viết nội dung bước."}
                 for b in blocks if b["type"] == "image"][: config.MAX_IMAGES]
        return {"title": stem, "summary": "", "steps": steps, "keywords": [], "quick": []}
    texts = [b for b in blocks if b["type"] == "text"]
    title = next((b["text"] for b in texts if b.get("heading")), texts[0]["text"] if texts else stem)
    has_markers = any(STEP_RE.match(b["text"]) or b.get("numbered") for b in texts)
    steps, intro, cur, seen_title = [], [], None, False
    for b in blocks:
        if b["type"] == "text":
            if not seen_title and b["text"] == title:
                seen_title = True; continue
            is_step = bool(STEP_RE.match(b["text"]) or b.get("numbered")) if has_markers else (b.get("heading") or cur is None or cur["image_id"])
            if is_step:
                t = STEP_RE.sub("", b["text"]).strip()
                head, _, rest = t.partition(". ") if len(t) > 90 else (t, "", "")
                cur = {"title": head[:120], "body": rest, "image_id": None}
                steps.append(cur)
            elif cur is None:
                intro.append(b["text"])
            else:
                cur["body"] = (cur["body"] + "\n" + b["text"]).strip()
        elif cur is not None and not cur["image_id"]:
            cur["image_id"] = b["id"]
        elif cur is None and not has_markers:
            cur = {"title": "", "body": "", "image_id": b["id"]}; steps.append(cur)
    for s in steps:
        s["confidence"] = 0.4
        s["uncertain_reason"] = "Tách bước tự động bằng quy tắc (không qua AI) — cần kiểm tra."
    low = norm(title + " " + " ".join(intro))
    return {"title": title[:200], "summary": " ".join(intro)[:400], "steps": steps, "keywords": [], "quick": [],
            "platform": "web" if re.search(r"\bweb\b|trinh duyet|may tinh", low) else "mobile",
            "kind": "fix" if re.search(r"\bloi\b|khac phuc|khong .* duoc", low) else "guide"}


def normalize(result: dict, assets: list, mode: str):
    """Kiểm tra đầu ra AI: ảnh phải tồn tại, mỗi ảnh một lần, bỏ bước trùng, đánh dấu chỗ chưa chắc."""
    notes = [str(n)[:300] for n in (result.get("review_notes") or [])]
    by_id = {a["id"]: a for a in assets}
    used, steps, removed = set(), [], 0
    for s in result.get("steps") or []:
        if not isinstance(s, dict):
            continue
        title, body = str(s.get("title") or "").strip(), str(s.get("body") or "").strip()
        if not title and not body and not s.get("image_id"):
            continue
        key = norm(title + " " + body)
        # bước chỉ có tiêu đề ngắn: chỉ coi là trùng khi giống hệt
        dup = (lambda k: key == k) if not body else (lambda k: difflib.SequenceMatcher(None, key, k).ratio() > 0.88)
        if key and any(dup(x["_k"]) for x in steps):
            removed += 1; continue
        img = s.get("image_id")
        uncertain = ""
        try:
            conf = float(s.get("confidence", 0.5))
        except (TypeError, ValueError):
            conf = 0.5
        if conf < 0.7:
            uncertain = str(s.get("uncertain_reason") or "AI chưa đủ chắc chắn về bước này.")
        if img is not None and (img not in by_id or img in used or len(used) >= config.MAX_IMAGES):
            if img not in by_id:
                uncertain = uncertain or "AI tham chiếu ảnh không tồn tại — đã bỏ ảnh."
            img = None
        asset = by_id.get(img)
        hot = None
        box = (s.get("hotspot") or {}).get("box_2d") if isinstance(s.get("hotspot"), dict) else None
        if asset and isinstance(box, list) and len(box) == 4:
            try:
                y0, x0, y1, x1 = [max(0.0, min(1000.0, float(v))) / 1000 for v in box]
                if x1 - x0 > 0.01 and y1 - y0 > 0.01:
                    hot = {"x": round(x0, 4), "y": round(y0, 4), "w": round(x1 - x0, 4), "h": round(y1 - y0, 4), "label": str(s["hotspot"].get("label") or "")}
            except (TypeError, ValueError):
                pass
        if asset:
            used.add(img)
        ts = s.get("timestamp")
        if asset and "ts" in asset:
            ts = asset["ts"]
        steps.append({"title": title, "body": body, "image": asset["file"] if asset else None, "hotspot": hot,
                      "note": s.get("note") or "", "warning": s.get("warning") or "", "uncertain": uncertain,
                      "ts": ts if isinstance(ts, (int, float)) else None, "_k": key})
        if len(steps) >= config.MAX_STEPS:
            notes.append(f"Nguồn có nhiều hơn {config.MAX_STEPS} bước — phần sau đã bị lược bỏ.")
            break
    for s in steps:
        s.pop("_k")
    if removed:
        notes.append(f"Đã tự động gộp {removed} bước trùng lặp.")
    if mode != "gemini":
        notes.insert(0, "Bản nháp dựng bằng quy tắc, chưa qua AI. Cần biên tập kỹ trước khi xuất bản.")
    unused = len(assets) - len(used)
    if unused:
        notes.append(f"{unused} ảnh trích được chưa gắn vào bước nào — có thể chọn thủ công trong kho ảnh.")
    content = {k: result.get(k) for k in ("title", "summary", "platform", "category", "kind", "keywords", "quick")}
    content["steps"] = steps
    return db.clean_content(content), notes
