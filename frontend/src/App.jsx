import { createContext, useContext, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { api } from './api.js'
import Icon from './icons.jsx'
import SearchBox from './components/SearchBox.jsx'
import Home from './pages/Home.jsx'
import Library from './pages/Library.jsx'
import Guide from './pages/Guide.jsx'
import Fix from './pages/Fix.jsx'
import Studio from './pages/Studio.jsx'

const MetaCtx = createContext(null)
export const useMeta = () => useContext(MetaCtx)

function Header({ onSearch }) {
  return (
    <header className="hdr">
      <div className="wrap hdr-in">
        <Link to="/" className="logo" aria-label="SupportFlow — trang chủ">
          <span className="logo-mark"><Icon name="check" size={18} strokeWidth={3} /></span>
          <span><b>eNumber</b> <i>SupportFlow</i></span>
        </Link>
        <nav className="nav" aria-label="Điều hướng chính">
          <NavLink to="/" end>Trang chủ</NavLink>
          <NavLink to="/huong-dan?platform=mobile" className={() => (isP('mobile') ? 'active' : '')}>Hướng dẫn Mobile</NavLink>
          <NavLink to="/huong-dan?platform=web" className={() => (isP('web') ? 'active' : '')}>Hướng dẫn Web</NavLink>
          <NavLink to="/khac-phuc-loi">Khắc phục lỗi</NavLink>
        </nav>
        <button className="kbtn" onClick={onSearch} aria-label="Tìm kiếm nhanh">
          <Icon name="search" size={16} /><span>Tìm nhanh</span><kbd>Ctrl K</kbd>
        </button>
      </div>
    </header>
  )
}
const isP = (p) => location.pathname === '/huong-dan' && new URLSearchParams(location.search).get('platform') === p

function Footer({ meta }) {
  const s = meta?.support || {}
  return (
    <footer className="ftr">
      <div className="wrap ftr-in">
        <div>
          <b>Công ty Cổ phần Công nghệ eNumber</b>
          <p>SupportFlow — Trung tâm hướng dẫn sử dụng ENumber Chấm Công.</p>
        </div>
        <div id="ho-tro">
          <b>Hỗ trợ kỹ thuật</b>
          {s.phone || s.email || s.zalo ? (
            <p>
              {s.phone && <>Điện thoại: <a href={`tel:${s.phone}`}>{s.phone}</a><br /></>}
              {s.email && <>Email: <a href={`mailto:${s.email}`}>{s.email}</a><br /></>}
              {s.zalo && <>Zalo: {s.zalo}<br /></>}
              {s.hours && <>Giờ làm việc: {s.hours}</>}
            </p>
          ) : <p>Liên hệ người quản trị phần mềm tại đơn vị của bạn để được hỗ trợ trực tiếp.</p>}
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  const [meta, setMeta] = useState(null)
  const [palette, setPalette] = useState(false)
  const loc = useLocation()
  useEffect(() => { api('/api/meta').then(setMeta).catch(() => setMeta({ categories: {}, platforms: {}, counts: {}, support: {} })) }, [])
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true) }
      if (e.key === 'Escape') setPalette(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { setPalette(false); if (!loc.hash) window.scrollTo(0, 0) }, [loc.pathname, loc.search])
  useEffect(() => { // hiệu ứng "đèn rọi" theo con trỏ trên các thẻ .spot
    const f = (e) => {
      const t = e.target.closest?.('.spot'); if (!t) return
      const r = t.getBoundingClientRect()
      t.style.setProperty('--mx', `${e.clientX - r.left}px`); t.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    document.addEventListener('pointermove', f, { passive: true })
    return () => document.removeEventListener('pointermove', f)
  }, [])
  const studio = loc.pathname.startsWith('/studio')
  return (
    <MetaCtx.Provider value={meta}>
      <div className={studio ? 'app' : 'app pub'}>
      {!studio && <Header onSearch={() => setPalette(true)} />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/huong-dan" element={<Library />} />
          <Route path="/huong-dan/:slug" element={<Guide />} />
          <Route path="/khac-phuc-loi" element={<Fix />} />
          <Route path="/studio/*" element={<Studio />} />
          <Route path="*" element={<div className="wrap empty"><h1>Không tìm thấy trang</h1><Link className="btn" to="/">Về trang chủ</Link></div>} />
        </Routes>
      </main>
      {!studio && <Footer meta={meta} />}
      {palette && (
        <div className="overlay top" onMouseDown={(e) => e.target === e.currentTarget && setPalette(false)}>
          <div className="palette"><SearchBox autoFocus /></div>
        </div>
      )}
      </div>
    </MetaCtx.Provider>
  )
}
