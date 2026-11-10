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
