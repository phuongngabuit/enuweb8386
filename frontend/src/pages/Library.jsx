import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import Icon from '../icons.jsx'
import { useMeta } from '../App.jsx'
import GuideCard from '../components/GuideCard.jsx'

export default function Library() {
  const meta = useMeta()
  const [sp, setSp] = useSearchParams()
  const [items, setItems] = useState(null)
  const f = { platform: sp.get('platform') || '', category: sp.get('category') || '', kind: sp.get('kind') || '', q: sp.get('q') || '' }
  const [q, setQ] = useState(f.q)
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }) }

  useEffect(() => {
    let live = true
    api(`/api/guides?${new URLSearchParams(f)}`).then((r) => live && setItems(r)).catch(() => live && setItems([]))
    return () => { live = false }
  }, [sp.toString()])
  useEffect(() => { const t = setTimeout(() => q !== f.q && set('q', q), 200); return () => clearTimeout(t) }, [q])

  const Opt = ({ k, v, children, n }) => (
    <button className={f[k] === v ? 'on' : ''} onClick={() => set(k, f[k] === v ? '' : v)} aria-pressed={f[k] === v}>
      <span>{children}</span>{n != null && <i>{n}</i>}
    </button>
  )
  const c = meta?.counts || {}
  const catCount = (k) => (f.platform ? c[`${f.platform}:${k}`] || 0 : (c[`mobile:${k}`] || 0) + (c[`web:${k}`] || 0))
  return (
    <div className="wrap lib">
      <aside className="filters" aria-label="Bộ lọc">
        <div className="fgroup">
          <h4>Nền tảng</h4>
          <Opt k="platform" v="mobile" n={c.mobile || 0}>Mobile App</Opt>
          <Opt k="platform" v="web" n={c.web || 0}>Web App</Opt>
        </div>
        <div className="fgroup">
          <h4>Loại nội dung</h4>
          <Opt k="kind" v="guide" n={c['kind:guide'] || 0}>Hướng dẫn sử dụng</Opt>
          <Opt k="kind" v="fix" n={c['kind:fix'] || 0}>Khắc phục lỗi</Opt>
        </div>
        <div className="fgroup">
          <h4>Danh mục</h4>
          {Object.entries(meta?.categories || {}).filter(([k]) => catCount(k)).map(([k, label]) => (
            <Opt key={k} k="category" v={k} n={catCount(k)}>{label}</Opt>
          ))}
        </div>
      </aside>
      <div className="lib-main">
        <h1>Thư viện hướng dẫn</h1>
        <div className="sb-field inline">
          <Icon name="search" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm trong thư viện (gõ không dấu cũng được)" aria-label="Tìm trong thư viện" />
          {q && <button className="icon-btn" onClick={() => setQ('')} aria-label="Xoá"><Icon name="x" size={18} /></button>}
        </div>
        <p className="muted count-line">{items ? `${items.length} bài hướng dẫn` : 'Đang tải…'}
          {(f.platform || f.category || f.kind || f.q) && <button className="link" onClick={() => { setQ(''); setSp({}, { replace: true }) }}>Xoá bộ lọc</button>}
        </p>
        {items?.length === 0 && <div className="empty"><b>Không có bài nào khớp bộ lọc.</b><span>Hãy thử bỏ bớt điều kiện hoặc đổi từ khoá.</span></div>}
        <div className="grid3">{items?.map((g) => <GuideCard key={g.slug} g={g} />)}</div>
      </div>
    </div>
  )
}
