from app.textnorm import norm


def test_norm():
    assert norm("Đăng ký KHUÔN mặt!") == "dang ky khuon mat"


def test_no_login_needed(public):
    assert public.get("/api/meta").status_code == 200
    assert len(public.get("/api/guides").json()) >= 8


def top(public, q):
    r = public.get("/api/search", params={"q": q}).json()
    assert r, q
    return r[0]


def test_search_no_accents(public):
    assert top(public, "dang ky khuon mat")["slug"] == "dang-ky-khuon-mat-de-cham-cong"
    assert top(public, "xuat excel bang cong")["slug"].startswith("xem-thong-ke")


def test_search_natural_language(public):
    assert top(public, "Tôi chấm công không nhận khuôn mặt")["slug"].startswith("khong-nhan-dien-duoc-khuon-mat")
    assert top(public, "quên mật khẩu")["slug"] == "khong-dang-nhap-duoc-ung-dung"
    assert top(public, "gps bao sai")["slug"].startswith("bao-ngoai-pham-vi")
    assert top(public, "duyet don nghi phep")["slug"].startswith("phe-duyet")


def test_search_typo_and_step_hit(public):
    r = top(public, "quen mat khau")
    assert r["step"]["index"] == 2
    assert top(public, "chấm coong")["category"] == "cham-cong"
    assert public.get("/api/search", params={"q": "xyzzy qwerty"}).json() == []


def test_filters(public):
    web = public.get("/api/guides", params={"platform": "web"}).json()
    assert web and all(g["platform"] == "web" for g in web)
    fix = public.get("/api/guides", params={"kind": "fix"}).json()
    assert fix and all(g["kind"] == "fix" for g in fix)


def test_guide_detail_and_feedback(public):
    g = public.get("/api/guides/cham-cong-bang-khuon-mat").json()
    assert len(g["steps"]) == 4 and g["related"]
    assert public.get("/media/" + g["steps"][0]["image"]).status_code == 200
    assert public.post("/api/guides/cham-cong-bang-khuon-mat/feedback", json={"helpful": False, "reason": "kho-hieu"}).status_code == 200
    assert public.get("/api/guides/khong-ton-tai").status_code == 404


def test_public_has_no_write_api(public):
    """Tiêu chí bảo mật: cổng công khai không có import / sửa / xuất bản."""
    assert public.get("/editor/api/guides").status_code == 404
    assert public.post("/editor/api/import", files={"file": ("a.pdf", b"%PDF-1.4")}).status_code in (404, 405)
    assert public.post("/editor/api/guides/x/publish").status_code in (404, 405)
    assert public.put("/api/guides/cham-cong-bang-khuon-mat", json={}).status_code == 405
    assert public.get("/studio").status_code == 404
    assert public.get("/media/%2e%2e/supportflow.db").status_code == 404


def test_ask_without_key_falls_back_to_search(public):
    r = public.post("/api/ask", json={"q": "không đăng nhập được"}).json()
    assert r["ai"] is False and r["results"]


def test_symptoms(public):
    s = public.get("/api/symptoms").json()
    assert s and all(c["guide"] for x in s for c in x["causes"])


def test_announcements_and_documents(public, editor, samples):
    assert public.get("/api/announcements").json()[0]["title"].startswith("Chào mừng")
    a = editor.post("/editor/api/announcements", json={"title": "Bảo trì 22h", "body": "Tạm ngưng 30 phút", "level": "warning", "published": False}).json()
    assert all(x["id"] != a["id"] for x in public.get("/api/announcements").json())          # nháp không lộ ra
    editor.put(f"/editor/api/announcements/{a['id']}", json={**a, "published": True})
    assert any(x["id"] == a["id"] and x["level"] == "warning" for x in public.get("/api/announcements").json())
    editor.put(f"/editor/api/announcements/{a['id']}", json={**a, "published": True, "ends_at": 1})  # đã hết hạn
    assert all(x["id"] != a["id"] for x in public.get("/api/announcements").json())
    assert editor.delete(f"/editor/api/announcements/{a['id']}").status_code == 200
    assert public.post("/api/announcements", json={"title": "x"}).status_code == 405
    assert public.post("/editor/api/announcements", json={"title": "x"}).status_code in (404, 405)

    with open(samples / "mau.pdf", "rb") as f:
        d = editor.post("/editor/api/documents", files={"file": ("So tay.pdf", f)}, data={"title": "Sổ tay sử dụng", "platform": "mobile"}).json()
    assert d["title"] == "Sổ tay sử dụng" and d["ext"] == "pdf"
    assert public.get("/api/documents").json()[0]["id"] == d["id"]
    r = public.get(f"/api/documents/{d['id']}/download")
    assert r.status_code == 200 and r.content.startswith(b"%PDF") and "attachment" in r.headers["content-disposition"]
    editor.put(f"/editor/api/documents/{d['id']}", json={**d, "published": False})
    assert public.get("/api/documents").json() == [] and public.get(f"/api/documents/{d['id']}/download").status_code == 404
    assert editor.post("/editor/api/documents", files={"file": ("a.exe", b"MZ")}).status_code == 400
    assert editor.post("/editor/api/documents", files={"file": ("gia.pdf", b"khong phai pdf")}).status_code == 400
    assert editor.delete(f"/editor/api/documents/{d['id']}").status_code == 200
    from app import config
    assert not any(config.DOCS_DIR.iterdir())


def test_support_request_and_zalo(public, editor, monkeypatch):
    import io, time
    from PIL import Image
    from app import config, zalo
    calls = []

    def fake_call(method, payload=None, timeout=20):
        calls.append((method, payload)); return {}

    monkeypatch.setattr(config, "ZALO_BOT_TOKEN", "t"); monkeypatch.setattr(config, "ZALO_CHAT_ID", "c1")
    monkeypatch.setattr(config, "PUBLIC_BASE_URL", "https://hotro.example.vn"); monkeypatch.setattr(zalo, "call", fake_call)
    buf = io.BytesIO(); Image.new("RGB", (300, 600), "red").save(buf, "PNG")
    assert public.post("/api/support", data={"phone": "12345", "content": "Không chấm công được"}).status_code == 400
    assert public.post("/api/support", data={"phone": "0912345678", "content": "ngắn"}).status_code == 400
    assert public.post("/api/support", data={"phone": "0912345678", "content": "Không chấm công được"}, files={"image": ("a.png", b"khong phai anh")}).status_code == 400
    r = public.post("/api/support", data={"phone": "0912 345 678", "content": "Chấm công báo lỗi khuôn mặt không khớp", "page": "/huong-dan/x"},
                    files={"image": ("loi.png", buf.getvalue())})
    assert r.status_code == 200 and r.json()["code"].startswith("HT-")
    for _ in range(50):
        t = editor.get("/editor/api/tickets").json()["tickets"][0]
        if t["zalo"] != "pending":
            break
        time.sleep(0.05)
    assert t["phone"] == "0912345678" and t["zalo"] == "sent" and t["status"] == "new"
    assert calls[0][0] == "sendMessage" and "0912345678" in calls[0][1]["text"] and r.json()["code"] in calls[0][1]["text"]
    assert calls[1][0] == "sendPhoto" and calls[1][1]["photo"].startswith("https://hotro.example.vn/api/support/image/")
    token = calls[1][1]["photo"].rsplit("/", 1)[1]
    assert public.get(f"/api/support/image/{token}").content[:2] == b"\xff\xd8"          # Zalo tải được ảnh bằng mã riêng
    assert public.get("/api/support/image/" + "0" * 32 + ".jpg").status_code == 404
    assert public.get("/editor/api/tickets").status_code == 404                               # danh sách chỉ có ở cổng biên tập
    assert editor.get(f"/editor/api/tickets/{t['id']}/image").status_code == 200
    assert editor.put(f"/editor/api/tickets/{t['id']}", json={"status": "done", "note": "Đã gọi lại"}).json()["status"] == "done"
    # bẫy bot: không tạo yêu cầu
    n = len(editor.get("/editor/api/tickets").json()["tickets"])
    public.post("/api/support", data={"phone": "0912345678", "content": "spam spam spam spam", "website": "http://x"})
    assert len(editor.get("/editor/api/tickets").json()["tickets"]) == n
    # Zalo lỗi -> vẫn lưu yêu cầu, ghi rõ lý do, gửi lại được
    monkeypatch.setattr(zalo, "call", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("Zalo từ chối: 401")))
    public.post("/api/support", data={"phone": "+84912345678", "content": "Không đăng nhập được ứng dụng"})
    for _ in range(50):
        t2 = editor.get("/editor/api/tickets").json()["tickets"][0]
        if t2["zalo"] != "pending":
            break
        time.sleep(0.05)
    assert t2["zalo"].startswith("error") and "401" in t2["zalo"]
    monkeypatch.setattr(zalo, "call", fake_call)
    assert editor.post(f"/editor/api/tickets/{t2['id']}/resend").json()["zalo"] == "sent"
    for x in (t, t2):
        assert editor.delete(f"/editor/api/tickets/{x['id']}").status_code == 200
    assert not any(config.TICKETS_DIR.iterdir())
    # giới hạn tần suất: lần thứ 6 trong một giờ bị chặn
    codes = [public.post("/api/support", data={"phone": "0912345678", "content": "Thử giới hạn tần suất gửi"}).status_code for _ in range(4)]
    assert codes[-1] == 429
