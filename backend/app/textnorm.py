"""Chuẩn hoá tiếng Việt: bỏ dấu, tách từ, từ đồng nghĩa."""
import re
import unicodedata

_STOP = set("toi minh em anh chi bi la the nao lam sao de cho cua va thi ma a oi voi nhu can muon hay xin hoi "
            "giup duoc khong o tren trong cai nay cach khi co".split())

# Mỗi nhóm là các cách nói tương đương (đã bỏ dấu).
SYNONYMS = [
    ["khuon mat", "face", "faceid", "face id", "guong mat", "mat"],
    ["dang nhap", "login", "log in", "sign in", "vao app", "vao ung dung"],
    ["mat khau", "password", "pass", "mk"],
    ["cham cong", "diem danh", "check in", "checkin", "check out", "checkout", "cham vao", "cham ra"],
    ["cong tac", "di cong tac", "cong vu"],
    ["nghi phep", "xin nghi", "don nghi"],
    ["bao cao", "thong ke", "xuat excel", "bang cong"],
    ["phe duyet", "duyet don", "duyet", "xet duyet"],
    ["vi tri", "gps", "dinh vi", "toa do", "ngoai pham vi"],
    ["cai dat", "tai app", "tai ung dung", "install", "cai app"],
    ["loi", "khong nhan", "that bai", "khong thanh cong", "truc trac", "hong", "bao loi"],
    ["mang", "wifi", "4g", "internet", "ket noi"],
    ["dien thoai", "mobile", "app", "ung dung"],
    ["may tinh", "web", "trinh duyet", "website"],
    ["quen", "khong nho", "mat"],
    ["cap nhat", "update", "phien ban moi"],
]


def strip_accents(s: str) -> str:
    s = s.replace("đ", "d").replace("Đ", "D")
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def norm(s: str) -> str:
    s = strip_accents(unicodedata.normalize("NFC", s or "")).lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", s)).strip()


def tokens(s: str) -> list[str]:
    return norm(s).split()


def content_tokens(s: str) -> list[str]:
    t = tokens(s)
    kept = [x for x in t if x not in _STOP]
    return kept or t


def expand(qn: str) -> list[str]:
    """Trả về các cụm đồng nghĩa (đã chuẩn hoá) liên quan tới câu truy vấn."""
    padded = f" {qn} "
    out = []
    for group in SYNONYMS:
        if any(f" {p} " in padded for p in group if len(p) > 3 or p in qn.split()):
            out += [p for p in group if f" {p} " not in padded]
    return out


def slugify(s: str) -> str:
    return re.sub(r"\s+", "-", norm(s))[:80].strip("-") or "bai-viet"


def edit1(a: str, b: str) -> bool:
    """Khoảng cách chỉnh sửa <= 1."""
    if a == b:
        return True
    la, lb = len(a), len(b)
    if abs(la - lb) > 1:
        return False
    if la > lb:
        a, b, la, lb = b, a, lb, la
    i = j = diff = 0
    while i < la and j < lb:
        if a[i] == b[j]:
            i += 1; j += 1
        else:
            diff += 1
            if diff > 1:
                return False
            if la == lb:
                i += 1
            j += 1
    return True
