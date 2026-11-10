import time

import pytest

from app import config
from app.importer import gemini, pipeline


def run_import(editor, path, expect="done"):
    with open(path, "rb") as f:
        r = editor.post("/editor/api/import", files={"file": (path.name, f)})
    assert r.status_code == 200, r.text
    jid = r.json()["id"]
    for _ in range(300):
        j = editor.get(f"/editor/api/jobs/{jid}").json()
        if j["status"] != "running":
            break
        time.sleep(0.1)
    assert j["status"] == expect, j
    return editor.get(f"/editor/api/guides/{j['guide_id']}").json() if expect == "done" else j


def test_docx_heuristic(editor, public, samples):
    g = run_import(editor, samples / "mau.docx")
    d = g["draft"]
    assert g["status"] == "draft" and g["source"]["filename"] == "mau.docx"
    assert d["title"] == "Hướng dẫn chấm công bằng khuôn mặt"
    assert [s["title"] for s in d["steps"]] == ["Mở ứng dụng ENumber Chấm Công", "Chọn mục Chấm công", "Quét khuôn mặt", "Xem kết quả"]  # bước 5 trùng đã bị gộp
    assert all(s["image"] and s["uncertain"] for s in d["steps"])
    assert len({s["image"] for s in d["steps"]}) == 4
    # không tự xuất bản
    assert public.get(f"/api/guides/{g['slug']}").status_code == 404
    # còn bước chưa chắc chắn -> chặn xuất bản
    assert editor.post(f"/editor/api/guides/{g['id']}/publish").status_code == 400
    for s in d["steps"]:
        s["uncertain"] = ""
    d["category"] = "cham-cong"
    assert editor.put(f"/editor/api/guides/{g['id']}", json=d).status_code == 200
    p = editor.post(f"/editor/api/guides/{g['id']}/publish").json()
    assert p["status"] == "published" and p["version"] == 1
    pub = public.get(f"/api/guides/{p['slug']}").json()
    assert pub["category"] == "cham-cong" and len(pub["steps"]) == 4
    assert public.get("/media/" + pub["steps"][0]["image"]).headers["content-type"] == "image/webp"
    # sửa sau xuất bản: bản công khai không đổi cho tới khi xuất bản lại; có lịch sử phiên bản
    d["title"] = "Tiêu đề đã sửa"
    assert editor.put(f"/editor/api/guides/{g['id']}", json=d).json()["dirty"] is True
    assert public.get(f"/api/guides/{p['slug']}").json()["title"] != "Tiêu đề đã sửa"
    p2 = editor.post(f"/editor/api/guides/{g['id']}/publish").json()
    assert p2["version"] == 2 and len(p2["versions"]) == 2
    assert public.get(f"/api/guides/{p['slug']}").json()["title"] == "Tiêu đề đã sửa"
    assert editor.post(f"/editor/api/guides/{g["id"]}/restore/1").json()["draft"]["title"] == "Hướng dẫn chấm công bằng khuôn mặt"
    assert editor.delete(f"/editor/api/guides/{g['id']}").status_code == 200
    assert public.get(f"/api/guides/{p['slug']}").status_code == 404


def test_pdf_order(editor, samples):
    g = run_import(editor, samples / "mau.pdf")
    titles = [s["title"] for s in g["draft"]["steps"]]
    assert len(titles) == 4 and titles[0].startswith("Mo ung dung") and titles[3].startswith("Xem ket qua")
    assert all(s["image"] for s in g["draft"]["steps"])
    assert [a["page"] for a in g["assets"]] == sorted(a["page"] for a in g["assets"])


def test_mp4_frames(editor, samples):
    g = run_import(editor, samples / "mau.mp4")
    steps = g["draft"]["steps"]
    assert len(steps) == 4, [s["ts"] for s in steps]  # 4 màn hình khác nhau -> 4 khung hình
    ts = [s["ts"] for s in steps]
    assert ts == sorted(ts) and g["draft"]["video"].endswith("source.mp4")
    assert g["source"]["duration"] == pytest.approx(16, abs=1)


def test_gemini_mode_validates_ai_output(editor, samples, monkeypatch):
    """AI trả về ảnh không tồn tại, ảnh dùng 2 lần, bước trùng, độ tin cậy thấp -> hệ thống phải xử lý."""
    seen = {}

    def fake(parts, system, **kw):
        seen["images"] = sum(1 for p in parts if isinstance(p, dict))
        seen["system"] = system
        return {"title": "Chấm công bằng khuôn mặt", "summary": "Tóm tắt", "platform": "mobile", "category": "cham-cong",
                "kind": "guide", "keywords": ["chấm công"], "quick": ["a", "b", "c"], "review_notes": ["Ảnh 2 có tên người"],
                "steps": [
                    {"title": "Mở ứng dụng", "body": "Nhấn biểu tượng.", "image_id": "img1", "confidence": 0.95,
                     "hotspot": {"label": "Chấm công", "box_2d": [400, 100, 500, 900]}},
                    {"title": "Mở ứng dụng", "body": "Nhấn biểu tượng.", "image_id": "img2", "confidence": 0.9},
                    {"title": "Chọn Chấm công", "body": "Nhấn nút.", "image_id": "img1", "confidence": 0.9},
                    {"title": "Quét mặt", "body": "Giữ yên.", "image_id": "img99", "confidence": 0.9},
                    {"title": "Xem kết quả", "body": "Có thể có thông báo.", "image_id": "img4", "confidence": 0.4,
                     "uncertain_reason": "Nguồn không nêu rõ"}]}

    monkeypatch.setattr(config, "GEMINI_API_KEY", "test")
    monkeypatch.setattr(gemini, "generate_json", fake)
    g = run_import(editor, samples / "mau.docx")
    s = g["draft"]["steps"]
    assert seen["images"] == 4 and "không bịa" in seen["system"]
    assert g["ai"]["mode"] == "gemini" and len(s) == 4
    assert s[0]["hotspot"] == {"x": 0.1, "y": 0.4, "w": 0.8, "h": 0.1, "label": "Chấm công"} and not s[0]["uncertain"]
    assert s[1]["image"] is None            # img1 đã dùng
    assert s[2]["image"] is None and "không tồn tại" in s[2]["uncertain"]
    assert s[3]["uncertain"] == "Nguồn không nêu rõ"
    assert any("gộp 1 bước" in n for n in g["ai"]["notes"]) and "Ảnh 2 có tên người" in g["ai"]["notes"]


def test_gemini_failure_falls_back(editor, samples, monkeypatch):
    monkeypatch.setattr(config, "GEMINI_API_KEY", "test")
    monkeypatch.setattr(gemini, "generate_json", lambda *a, **k: (_ for _ in ()).throw(gemini.GeminiError("HTTP 503")))
    g = run_import(editor, samples / "mau.pdf")
    assert g["ai"]["mode"] == "heuristic" and "503" in g["ai"]["error"] and g["draft"]["steps"]


def test_rejects_bad_files(editor, tmp_path):
    assert editor.post("/editor/api/import", files={"file": ("virus.exe", b"MZ")}).status_code == 400
    fake = tmp_path / "gia.pdf"; fake.write_bytes(b"day khong phai pdf")
    assert "PDF" in run_import(editor, fake, expect="error")["message"]
    fake = tmp_path / "gia.docx"; fake.write_bytes(b"PK\x03\x04 rac")
    assert run_import(editor, fake, expect="error")["status"] == "error"
    big = tmp_path / "to.pdf"; big.write_bytes(b"%PDF" + b"0" * (config.MAX_DOC_BYTES + 10))
    with open(big, "rb") as f:
        assert editor.post("/editor/api/import", files={"file": ("to.pdf", f)}).status_code == 413
    assert not any(config.TMP_DIR.iterdir())  # không để lại tệp tạm


def test_editor_token(samples, monkeypatch):
    from fastapi.testclient import TestClient
    from app.api import create_app
    monkeypatch.setattr(config, "EDITOR_TOKEN", "bi-mat")
    c = TestClient(create_app(True))
    assert c.get("/editor/api/guides").status_code == 401
    assert c.get("/editor/api/guides", headers={"X-Editor-Token": "bi-mat"}).status_code == 200
    assert c.get("/api/guides").status_code == 200
