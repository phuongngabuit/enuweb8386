"""Tìm kiếm ngôn ngữ tự nhiên: không dấu, đồng nghĩa, sai chính tả nhẹ, trỏ thẳng tới bước phù hợp."""
from . import config
from .textnorm import content_tokens, edit1, expand, norm, tokens


def _tok_score(q: str, field_tokens: set[str]) -> float:
    if q in field_tokens:
        return 1.0
    if len(q) >= 3 and any(t.startswith(q) for t in field_tokens):
        return 0.7
    if len(q) >= 4 and any(abs(len(t) - len(q)) <= 1 and edit1(q, t) for t in field_tokens):
        return 0.5
    return 0.0


def _field(text: str):
    n = norm(text)
    return n, set(n.split())


def _score_field(qtoks, bigrams, syns, fld, weight):
    n, toks = fld
    if not n:
        return 0.0, set()
    hit, s = set(), 0.0
    for q in qtoks:
        m = _tok_score(q, toks)
        if m:
            hit.add(q); s += m * weight
    padded = f" {n} "
    s += sum(weight * 1.5 for b in bigrams if f" {b} " in padded)
    s += sum(weight * 0.6 for p in syns if f" {p} " in padded)
    return s, hit


def search(q: str, guides: list[dict], limit: int = 8) -> list[dict]:
    qn = norm(q)
    if not qn:
        return []
    qtoks = content_tokens(q)
    alltoks = tokens(q)
    bigrams = [f"{a} {b}" for a, b in zip(alltoks, alltoks[1:])]
    syns = expand(qn)
    out = []
    for g in guides:
        c = g["published"]
        fields = [
            (_field(c["title"]), 5), (_field(" ".join(c["keywords"])), 4), (_field(c["summary"]), 2),
            (_field(config.CATEGORIES.get(c["category"], "") + " " + config.PLATFORMS.get(c["platform"], "")), 2),
            (_field(" ".join(c["quick"])), 1.5),
        ]
        total, hit = 0.0, set()
        for fld, w in fields:
            s, h = _score_field(qtoks, bigrams, syns, fld, w)
            total += s; hit |= h
        best_i, best_s = None, 0.0
        for i, st in enumerate(c["steps"]):
            s1, h1 = _score_field(qtoks, bigrams, syns, _field(st["title"]), 2)
            s2, h2 = _score_field(qtoks, bigrams, syns, _field(st["body"] + " " + st["note"] + " " + st["warning"]), 1)
            hit |= h1 | h2
            if s1 + s2 > best_s:
                best_i, best_s = i, s1 + s2
        total += min(best_s, 8)
        if not total:
            continue
        coverage = len(hit) / len(qtoks)
        if coverage == 0 and not syns:
            continue
        score = total * (0.35 + 0.65 * coverage ** 2)
        if score < 1.2:
            continue
        item = card(g)
        item["score"] = round(score, 2)
        if best_i is not None and best_s >= 2:
            st = c["steps"][best_i]
            item["step"] = {"index": best_i, "title": st["title"], "snippet": st["body"][:140]}
        out.append(item)
    out.sort(key=lambda x: -x["score"])
    if out:  # bỏ kết quả quá yếu so với kết quả tốt nhất
        out = [o for o in out if o["score"] >= out[0]["score"] * 0.25]
    return out[:limit]


def card(g: dict) -> dict:
    c = g["published"] or g["draft"]
    return {
        "slug": g["slug"], "title": c["title"], "summary": c["summary"], "platform": c["platform"],
        "category": c["category"], "category_label": config.CATEGORIES.get(c["category"], ""),
        "kind": c["kind"], "steps_count": len(c["steps"]),
        "thumb": next((s["image"] for s in c["steps"] if s["image"]), None),
        "has_video": bool(c["video"]), "featured": c["featured"], "beginner": c["beginner"],
        "views": g["views"], "updated_at": g["published_at"] or g["updated_at"],
    }
