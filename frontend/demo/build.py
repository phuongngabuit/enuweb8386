"""Dựng bản xem thử tĩnh một tệp HTML từ máy chủ đang chạy:  python3 demo/build.py http://localhost:8080 out.html"""
import json, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path

base, out = sys.argv[1], Path(sys.argv[2])
here = Path(__file__).resolve().parent
get = lambda p: json.load(urllib.request.urlopen(base + p))
cards = get("/api/guides")
guides = {c["slug"]: get("/api/guides/" + c["slug"]) for c in cards}
media = {}
for g in guides.values():
    for s in g["steps"]:
        f = s["image"]
        if f and f not in media and f.endswith(".svg"):
            svg = urllib.request.urlopen(base + "/media/" + f).read().decode()
            media[f] = "data:image/svg+xml," + urllib.parse.quote(svg)
sys.path.insert(0, str(here.parents[1] / "backend"))
from app.textnorm import SYNONYMS
meta = get("/api/meta"); meta["ai"] = False
(here / "data.json").write_text(json.dumps({"meta": meta, "home": get("/api/home"), "announcements": get("/api/announcements"), "documents": get("/api/documents"), "symptoms": get("/api/symptoms"),
    "cards": cards, "guides": guides, "media": media, "synonyms": SYNONYMS}, ensure_ascii=False))
js = subprocess.run(["npx", "esbuild", "demo/main.jsx", "--bundle", "--minify", "--format=iife", "--jsx=automatic", "--target=es2020",
    "--alias:react=./demo/shim-react.cjs", "--alias:react-dom=./demo/shim-dom.cjs", "--alias:react-dom/client=./demo/shim-dom.cjs",
    "--alias:react/jsx-runtime=./demo/shim-jsx.cjs", "--define:process.env.NODE_ENV=\"production\""],
    cwd=here.parent, capture_output=True, text=True, check=True).stdout
css = "".join((here.parent / "src" / f).read_text() for f in ("styles.css", "public.css")) + (here / "extra.css").read_text()
assert "</script" not in js.lower() and "</style" not in css.lower()
out.write_text(f"""<title>SupportFlow ENumber</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap">
<style>{css}</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>{js}</script>
""", encoding="utf-8")
print("OK", out, round(out.stat().st_size / 1024), "KB")
