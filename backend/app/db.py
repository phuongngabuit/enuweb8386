"""SQLite: bài viết (bản nháp + bản đã xuất bản), phiên bản, job import, phản hồi."""
import json
import sqlite3
import time
import uuid
from contextlib import contextmanager

from . import config
from .textnorm import slugify

SCHEMA = """
CREATE TABLE IF NOT EXISTS guides(
  id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL,
  draft TEXT NOT NULL, published TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  assets TEXT NOT NULL DEFAULT '[]', source TEXT, ai TEXT,
  views INTEGER NOT NULL DEFAULT 0, helpful_yes INTEGER NOT NULL DEFAULT 0, helpful_no INTEGER NOT NULL DEFAULT 0,
  created_at REAL, updated_at REAL, published_at REAL);
CREATE TABLE IF NOT EXISTS versions(
  guide_id TEXT, version INTEGER, content TEXT, created_at REAL, PRIMARY KEY(guide_id, version));
CREATE TABLE IF NOT EXISTS jobs(
  id TEXT PRIMARY KEY, filename TEXT, kind TEXT, status TEXT, stage TEXT, progress INTEGER,
  message TEXT, guide_id TEXT, created_at REAL, updated_at REAL);
CREATE TABLE IF NOT EXISTS announcements(
  id TEXT PRIMARY KEY, title TEXT, body TEXT, level TEXT, pinned INTEGER, published INTEGER,
  ends_at REAL, created_at REAL, updated_at REAL);
CREATE TABLE IF NOT EXISTS documents(
  id TEXT PRIMARY KEY, title TEXT, description TEXT, platform TEXT, filename TEXT, ext TEXT, size INTEGER,
  published INTEGER, downloads INTEGER NOT NULL DEFAULT 0, created_at REAL);
CREATE TABLE IF NOT EXISTS feedback(
  guide_id TEXT, helpful INTEGER, reason TEXT, created_at REAL);
"""

EMPTY = {"title": "", "summary": "", "platform": "mobile", "category": "khac", "kind": "guide",
         "keywords": [], "quick": [], "steps": [], "video": None, "featured": False, "beginner": False}


@contextmanager
def conn():
    c = sqlite3.connect(config.DB_PATH, timeout=15)
    c.row_factory = sqlite3.Row
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init():
    config.ensure_dirs()
    with conn() as c:
        c.execute("PRAGMA journal_mode=WAL")
        c.executescript(SCHEMA)


def _row(r):
    if r is None:
        return None
    d = dict(r)
    for k in ("draft", "published", "assets", "source", "ai"):
        d[k] = json.loads(d[k]) if d[k] else None
    d["assets"] = d["assets"] or []
    return d


def clean_content(data: dict) -> dict:
    """Chỉ giữ các trường hợp lệ, ép kiểu an toàn."""
    out = dict(EMPTY)
    for k in ("title", "summary"):
        out[k] = str(data.get(k) or "").strip()[:500]
    out["platform"] = data.get("platform") if data.get("platform") in config.PLATFORMS else "mobile"
    out["category"] = data.get("category") if data.get("category") in config.CATEGORIES else "khac"
    out["kind"] = "fix" if data.get("kind") == "fix" else "guide"
    out["keywords"] = [str(x).strip()[:60] for x in (data.get("keywords") or []) if str(x).strip()][:20]
    out["quick"] = [str(x).strip()[:300] for x in (data.get("quick") or []) if str(x).strip()][:5]
    out["video"] = data.get("video") or None
    out["featured"] = bool(data.get("featured"))
    out["beginner"] = bool(data.get("beginner"))
    steps = []
    for s in (data.get("steps") or [])[: config.MAX_STEPS]:
        if not isinstance(s, dict):
            continue
        h = s.get("hotspot")
        hot = None
        if isinstance(h, dict):
            try:
                hot = {k: max(0.0, min(1.0, float(h[k]))) for k in ("x", "y", "w", "h")}
                hot["label"] = str(h.get("label") or "")[:60]
            except (KeyError, TypeError, ValueError):
                hot = None
        ts = s.get("ts")
        steps.append({
            "title": str(s.get("title") or "").strip()[:200],
            "body": str(s.get("body") or "").strip()[:4000],
            "image": s.get("image") or None,
            "hotspot": hot,
            "note": str(s.get("note") or "").strip()[:1000],
            "warning": str(s.get("warning") or "").strip()[:1000],
            "uncertain": str(s.get("uncertain") or "").strip()[:300],
            "ts": float(ts) if isinstance(ts, (int, float)) else None,
        })
    out["steps"] = steps
    return out


def unique_slug(c, title, exclude_id=None):
    base = slugify(title)
    slug, i = base, 2
    while c.execute("SELECT 1 FROM guides WHERE slug=? AND id!=?", (slug, exclude_id or "")).fetchone():
        slug = f"{base}-{i}"; i += 1
    return slug


def create_guide(content, assets=None, source=None, ai=None, gid=None):
    gid = gid or uuid.uuid4().hex[:12]
    content = clean_content(content)
    now = time.time()
    with conn() as c:
        slug = unique_slug(c, content["title"] or "bai-viet-moi")
        c.execute("INSERT INTO guides(id,slug,draft,assets,source,ai,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                  (gid, slug, json.dumps(content, ensure_ascii=False), json.dumps(assets or []),
                   json.dumps(source, ensure_ascii=False) if source else None,
                   json.dumps(ai, ensure_ascii=False) if ai else None, now, now))
    return gid


def get_guide(gid=None, slug=None):
    with conn() as c:
        r = c.execute("SELECT * FROM guides WHERE " + ("id=?" if gid else "slug=?"), (gid or slug,)).fetchone()
    return _row(r)


def all_guides():
    with conn() as c:
        return [_row(r) for r in c.execute("SELECT * FROM guides ORDER BY updated_at DESC")]


def published_guides():
    return [g for g in all_guides() if g["published"]]


def save_draft(gid, content):
    content = clean_content(content)
    with conn() as c:
        g = c.execute("SELECT published FROM guides WHERE id=?", (gid,)).fetchone()
        if not g:
            return None
        args = [json.dumps(content, ensure_ascii=False), time.time()]
        sql = "UPDATE guides SET draft=?, updated_at=?"
        if not g["published"]:  # chưa xuất bản thì slug đi theo tiêu đề
            sql += ", slug=?"; args.append(unique_slug(c, content["title"] or "bai-viet-moi", gid))
        c.execute(sql + " WHERE id=?", args + [gid])
    return get_guide(gid)


def publish(gid):
    with conn() as c:
        g = c.execute("SELECT draft, version FROM guides WHERE id=?", (gid,)).fetchone()
        if not g:
            return None
        v, now = g["version"] + 1, time.time()
        c.execute("UPDATE guides SET published=draft, version=?, published_at=?, updated_at=? WHERE id=?", (v, now, now, gid))
        c.execute("INSERT INTO versions VALUES(?,?,?,?)", (gid, v, g["draft"], now))
    return get_guide(gid)


def unpublish(gid):
    with conn() as c:
        c.execute("UPDATE guides SET published=NULL, updated_at=? WHERE id=?", (time.time(), gid))
    return get_guide(gid)


def delete_guide(gid):
    with conn() as c:
        c.execute("DELETE FROM guides WHERE id=?", (gid,))
        c.execute("DELETE FROM versions WHERE guide_id=?", (gid,))


def versions(gid):
    with conn() as c:
        return [{"version": r["version"], "created_at": r["created_at"], "title": json.loads(r["content"]).get("title")}
                for r in c.execute("SELECT * FROM versions WHERE guide_id=? ORDER BY version DESC", (gid,))]


def version_content(gid, v):
    with conn() as c:
        r = c.execute("SELECT content FROM versions WHERE guide_id=? AND version=?", (gid, v)).fetchone()
    return json.loads(r["content"]) if r else None


def add_asset(gid, asset):
    with conn() as c:
        r = c.execute("SELECT assets FROM guides WHERE id=?", (gid,)).fetchone()
        assets = json.loads(r["assets"]) + [asset]
        c.execute("UPDATE guides SET assets=? WHERE id=?", (json.dumps(assets), gid))


def bump(slug, field):
    assert field in ("views", "helpful_yes", "helpful_no")
    with conn() as c:
        c.execute(f"UPDATE guides SET {field}={field}+1 WHERE slug=? AND published IS NOT NULL", (slug,))


def add_feedback(gid, helpful, reason):
    with conn() as c:
        c.execute("INSERT INTO feedback VALUES(?,?,?,?)", (gid, int(helpful), reason, time.time()))


def feedback_reasons(gid):
    with conn() as c:
        return {r[0]: r[1] for r in c.execute(
            "SELECT reason, COUNT(*) FROM feedback WHERE guide_id=? AND helpful=0 AND reason!='' GROUP BY reason", (gid,))}


# ---- jobs ----
def job_create(filename, kind):
    jid, now = uuid.uuid4().hex[:12], time.time()
    with conn() as c:
        c.execute("INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?,?,?)",
                  (jid, filename, kind, "running", "upload", 5, "Đã nhận tệp", None, now, now))
    return jid


def job_update(jid, **kw):
    kw["updated_at"] = time.time()
    with conn() as c:
        c.execute(f"UPDATE jobs SET {', '.join(k + '=?' for k in kw)} WHERE id=?", list(kw.values()) + [jid])


def job_get(jid):
    with conn() as c:
        r = c.execute("SELECT * FROM jobs WHERE id=?", (jid,)).fetchone()
    return dict(r) if r else None


def jobs_recent():
    with conn() as c:
        return [dict(r) for r in c.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 15")]


# ---- thông báo ----
LEVELS = ("info", "update", "warning")


def _ann(data):
    ends = data.get("ends_at")
    return (str(data.get("title") or "").strip()[:200], str(data.get("body") or "").strip()[:4000],
            data.get("level") if data.get("level") in LEVELS else "info", int(bool(data.get("pinned"))),
            int(bool(data.get("published"))), float(ends) if isinstance(ends, (int, float)) and ends else None)


def ann_list(active_only=False):
    with conn() as c:
        rows = [dict(r) for r in c.execute("SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC")]
    if active_only:
        now = time.time()
        rows = [r for r in rows if r["published"] and (not r["ends_at"] or r["ends_at"] > now)]
    return rows


def ann_save(data, aid=None):
    vals, now = _ann(data), time.time()
    with conn() as c:
        if aid:
            c.execute("UPDATE announcements SET title=?,body=?,level=?,pinned=?,published=?,ends_at=?,updated_at=? WHERE id=?", (*vals, now, aid))
        else:
            aid = uuid.uuid4().hex[:12]
            c.execute("INSERT INTO announcements VALUES(?,?,?,?,?,?,?,?,?)", (aid, *vals, now, now))
        r = c.execute("SELECT * FROM announcements WHERE id=?", (aid,)).fetchone()
    return dict(r) if r else None


def ann_delete(aid):
    with conn() as c:
        c.execute("DELETE FROM announcements WHERE id=?", (aid,))


# ---- tài liệu tải về ----
def doc_list(published_only=False):
    with conn() as c:
        rows = [dict(r) for r in c.execute("SELECT * FROM documents ORDER BY created_at DESC")]
    return [r for r in rows if r["published"]] if published_only else rows


def doc_get(did):
    with conn() as c:
        r = c.execute("SELECT * FROM documents WHERE id=?", (did,)).fetchone()
    return dict(r) if r else None


def doc_create(did, title, description, platform, filename, ext, size):
    with conn() as c:
        c.execute("INSERT INTO documents(id,title,description,platform,filename,ext,size,published,created_at) VALUES(?,?,?,?,?,?,?,1,?)",
                  (did, title[:200], description[:1000], platform, filename[:150], ext, size, time.time()))
    return doc_get(did)


def doc_update(did, data):
    with conn() as c:
        c.execute("UPDATE documents SET title=?, description=?, platform=?, published=? WHERE id=?",
                  (str(data.get("title") or "").strip()[:200], str(data.get("description") or "").strip()[:1000],
                   data.get("platform") if data.get("platform") in ("mobile", "web", "all") else "all", int(bool(data.get("published"))), did))
    return doc_get(did)


def doc_delete(did):
    with conn() as c:
        c.execute("DELETE FROM documents WHERE id=?", (did,))


def doc_bump(did):
    with conn() as c:
        c.execute("UPDATE documents SET downloads=downloads+1 WHERE id=?", (did,))
