// Bản xem thử tĩnh: chạy toàn bộ giao diện công khai không cần máy chủ (API được giả lập trong trình duyệt).
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App.jsx'
import DATA from './data.json'

window.__SF_MEDIA = DATA.media
const strip = (s) => (s || '').replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFD').replace(/[̀-ͯ]/g, '')
const norm = (s) => strip(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const STOP = new Set('toi minh em anh chi bi la the nao lam sao de cho cua va thi ma a oi voi nhu can muon hay xin hoi giup duoc khong o tren trong cai nay cach khi co'.split(' '))
const edit1 = (a, b) => {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  if (a.length > b.length) [a, b] = [b, a]
  let i = 0, j = 0, d = 0
  while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++ } else { if (++d > 1) return false; if (a.length === b.length) i++; j++ } }
  return true
}
const tok = (q, set) => (set.has(q) ? 1 : q.length >= 3 && [...set].some((t) => t.startsWith(q)) ? 0.7 : q.length >= 4 && [...set].some((t) => Math.abs(t.length - q.length) <= 1 && edit1(q, t)) ? 0.5 : 0)
function search(q, cards, limit = 8) {
  const qn = norm(q); if (!qn) return []
  const all = qn.split(' '); let qt = all.filter((t) => !STOP.has(t)); if (!qt.length) qt = all
  const bi = all.slice(1).map((b, i) => `${all[i]} ${b}`)
  const padq = ` ${qn} `
  const syn = DATA.synonyms.flatMap((g) => (g.some((p) => padq.includes(` ${p} `) && (p.length > 3 || all.includes(p))) ? g.filter((p) => !padq.includes(` ${p} `)) : []))
  const sc = (text, w, hit) => {
    const n = norm(text); if (!n) return 0
    const set = new Set(n.split(' ')); let s = 0
    for (const t of qt) { const m = tok(t, set); if (m) { hit.add(t); s += m * w } }
    const pad = ` ${n} `
    return s + bi.filter((b) => pad.includes(` ${b} `)).length * w * 1.5 + syn.filter((p) => pad.includes(` ${p} `)).length * w * 0.6
  }
  const out = []
  for (const c of cards) {
    const g = DATA.guides[c.slug], hit = new Set()
    let total = sc(g.title, 5, hit) + sc(g.keywords.join(' '), 4, hit) + sc(g.summary, 2, hit) + sc(`${g.category_label} ${g.platform}`, 2, hit) + sc(g.quick.join(' '), 1.5, hit)
    let bi_ = null, bs = 0
    g.steps.forEach((st, i) => { const s = sc(st.title, 2, hit) + sc(`${st.body} ${st.note} ${st.warning}`, 1, hit); if (s > bs) { bs = s; bi_ = i } })
    total += Math.min(bs, 8)
    const cov = hit.size / qt.length
    if (!total || (cov === 0 && !syn.length)) continue
    const score = total * (0.35 + 0.65 * cov * cov); if (score < 1.2) continue
    const item = { ...c, score }
    if (bi_ != null && bs >= 2) item.step = { index: bi_, title: g.steps[bi_].title, snippet: g.steps[bi_].body.slice(0, 140) }
    out.push(item)
  }
  out.sort((a, b) => b.score - a.score)
  return out.filter((o) => o.score >= out[0].score * 0.25).slice(0, limit)
}
function route(url, opts) {
  const u = new URL(url, 'http://x'); const p = u.pathname, q = u.searchParams
  if (opts?.method === 'POST') return p === '/api/ask' ? { answer: '', cited: [], results: [], ai: false } : { ok: true }
  if (p === '/api/meta') return DATA.meta
  if (p === '/api/home') return DATA.home
  if (p === '/api/symptoms') return DATA.symptoms
  if (p === '/api/search') return search(q.get('q') || '', DATA.cards)
  if (p === '/api/guides') {
    const cards = DATA.cards.filter((c) => (!q.get('platform') || c.platform === q.get('platform')) && (!q.get('category') || c.category === q.get('category')) && (!q.get('kind') || c.kind === q.get('kind')))
    return (q.get('q') || '').trim() ? search(q.get('q'), cards, 50) : cards
  }
  const m = /^\/api\/guides\/([^/]+)$/.exec(p)
  if (m && DATA.guides[m[1]]) return DATA.guides[m[1]]
  return null
}
window.fetch = async (url, opts) => {
  const data = typeof url === 'string' && (url.startsWith('/api') || url.startsWith('/editor')) ? route(url, opts) : null
  return new Response(JSON.stringify(data ?? { detail: 'Không khả dụng trong bản xem thử.' }), { status: data ? 200 : 404, headers: { 'Content-Type': 'application/json' } })
}
createRoot(document.getElementById('root')).render(<MemoryRouter><App /></MemoryRouter>)
