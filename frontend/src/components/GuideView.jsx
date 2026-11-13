import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, fmtDate, fmtTs, media } from '../api.js'
import Icon from '../icons.jsx'
import GuideCard, { PlatformTag } from './GuideCard.jsx'
import StepImage from './StepImage.jsx'
import Reveal from './Reveal.jsx'

const pad = (n) => String(n).padStart(2, '0')
const REASONS = [['khong-dung-loi', 'Không đúng lỗi tôi gặp'], ['kho-hieu', 'Hướng dẫn khó hiểu'], ['thieu-buoc', 'Thiếu bước'], ['anh-khac', 'Hình ảnh khác với máy tôi']]

function Callouts({ s }) {
  return (
    <>
      {s.note && <div className="co note"><Icon name="info" size={18} /><div><b>Lưu ý</b>{s.note}</div></div>}
      {s.warning && <div className="co warn"><Icon name="alert" size={18} /><div><b>Cảnh báo</b>{s.warning}</div></div>}
    </>
  )
}
const Body = ({ text }) => text.split(/\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)

function Feedback({ slug, preview }) {
  const [state, setState] = useState('ask')
  const send = (helpful, reason = '') => {
    if (!preview) api(`/api/guides/${slug}/feedback`, { method: 'POST', body: { helpful, reason } }).catch(() => {})
    setState(helpful ? 'done' : reason ? 'sent' : 'why')
  }
  return (
    <div className="card fb" aria-live="polite">
      {state === 'ask' && (<>
        <h3>Đã giải quyết được vấn đề?</h3>
        <div className="fb-btns">
          <button className="btn" onClick={() => send(true)}><Icon name="check" size={18} /> Hữu ích</button>
          <button className="btn ghost" onClick={() => send(false)}>Chưa giải quyết được</button>
        </div>
      </>)}
      {state === 'why' && (<>
        <h3>Điều gì chưa ổn?</h3>
        <div className="fb-btns wrapb">
          {REASONS.map(([k, l]) => <button key={k} className="btn ghost" onClick={() => send(false, k)}>{l}</button>)}
        </div>
        {!preview && <Link className="btn" to="/ho-tro" state={{ from: `/huong-dan/${slug}` }}><Icon name="chat" size={18} /> Gửi yêu cầu hỗ trợ</Link>}
        <p className="muted">Hoặc thử <Link to="/khac-phuc-loi">chẩn đoán theo triệu chứng</Link>.</p>
      </>)}
      {state === 'done' && <h3><Icon name="check" size={20} /> Cảm ơn bạn đã phản hồi.</h3>}
      {state === 'sent' && (<>
        <h3><Icon name="check" size={20} /> Cảm ơn bạn đã phản hồi.</h3>
        <p className="muted">Vẫn chưa xử lý được? Kỹ thuật viên có thể gọi lại cho bạn.</p>
        {!preview && <Link className="btn" to="/ho-tro" state={{ from: `/huong-dan/${slug}` }}><Icon name="chat" size={18} /> Gửi yêu cầu hỗ trợ</Link>}
      </>)}
    </div>
  )
}

/** Hiển thị một bài hướng dẫn. Dùng chung cho trang công khai và phần xem trước trong Studio. */
export default function GuideView({ g, preview }) {
  const loc = useLocation()
  const [zoom, setZoom] = useState(null)
  const [focus, setFocus] = useState(null) // chỉ số bước trong chế độ "Từng bước"
  const [showHot, setShowHot] = useState(true)
  const [active, setActive] = useState(0)
  const video = useRef(null)
  const rbar = useRef(null)
  useEffect(() => {
    const f = () => { const h = document.documentElement; if (rbar.current) rbar.current.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})` }
    window.addEventListener('scroll', f, { passive: true }); f()
    return () => window.removeEventListener('scroll', f)
  }, [])
  const steps = g.steps
  const hasHot = steps.some((s) => s.hotspot)

  useEffect(() => {
    if (preview) return
    const m = /^#buoc-(\d+)$/.exec(loc.hash)
    if (!m) return
    const el = document.getElementById(`buoc-${m[1]}`)
    if (!el) return
    const go = () => el.scrollIntoView({ block: 'start', behavior: 'instant' })
    go(); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2200)
    // Ảnh phía trên tải xong sẽ đẩy bố cục xuống: cuộn lại sau khi tất cả ảnh đã có kích thước.
    const pending = [...document.querySelectorAll('.gmain img')].filter((i) => !i.complete)
    Promise.all(pending.map((i) => new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }) }))).then(go)
  }, [loc.hash, g.slug])

  useEffect(() => {
    const els = steps.map((_, i) => document.getElementById(`buoc-${i + 1}`)).filter(Boolean)
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(+e.target.dataset.i)), { rootMargin: '-30% 0px -60% 0px' })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [steps.length])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setZoom(null); setFocus(null) }
      if (focus == null || zoom) return
      if (e.key === 'ArrowRight') setFocus((f) => Math.min(f + 1, steps.length))
      if (e.key === 'ArrowLeft') setFocus((f) => Math.max(f - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = focus != null || zoom ? 'hidden' : ''
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [focus, zoom, steps.length])

  const seek = (ts) => { const v = video.current; if (v) { v.currentTime = ts; v.play().catch(() => {}); v.scrollIntoView({ block: 'center' }) } }
  const fs = focus != null && focus < steps.length ? steps[focus] : null

  return (
    <article className="guide">
      {!preview && <div className="rbar" ref={rbar} />}
      <div className="gband"><div className="fx"><i /><i /></div><div className="wrap">
      {!preview && (
        <nav className="crumbs" aria-label="Đường dẫn">
          <Link to="/">Trang chủ</Link><span>/</span>
          <Link to={`/huong-dan?platform=${g.platform}`}>{g.platform === 'web' ? 'Web App' : 'Mobile App'}</Link><span>/</span>
          <Link to={`/huong-dan?platform=${g.platform}&category=${g.category}`}>{g.category_label}</Link>
        </nav>
      )}
      <header className="ghead">
        <div className="gtags">
          <PlatformTag p={g.platform} />
          {g.kind === 'fix' && <span className="tag fix"><Icon name="wrench" size={13} />Khắc phục lỗi</span>}
          {g.category_label && <span className="tag">{g.category_label}</span>}
        </div>
        <h1>{g.title || 'Chưa có tiêu đề'}</h1>
        {g.summary && <p className="lead">{g.summary}</p>}
        <div className="gbar">
          <button className="btn" onClick={() => setFocus(0)} disabled={!steps.length}><Icon name="play" size={15} /> Hướng dẫn từng bước</button>
          {hasHot && (
            <label className="switch"><input type="checkbox" checked={showHot} onChange={(e) => setShowHot(e.target.checked)} /><span />Hiện điểm cần nhấn</label>
          )}
          <span className="muted">{steps.length} bước · khoảng {Math.max(1, Math.ceil(steps.length / 2))} phút{g.updated_at ? ` · Cập nhật ${fmtDate(g.updated_at)}` : ''}</span>
        </div>
      </header>
      </div></div>

      <div className="wrap glayout">
        <aside className="toc" aria-label="Mục lục các bước">
          <h4>Các bước</h4>
          <ol>
            {steps.map((s, i) => (
              <li key={i} className={i === active ? 'on' : ''}><a href={`#buoc-${i + 1}`}><span>{pad(i + 1)}</span>{s.title || `Bước ${i + 1}`}</a></li>
            ))}
          </ol>
        </aside>
        <div className="gmain">
          {g.quick?.length > 0 && (
            <div className="card quick">
              <h3><Icon name="sparkle" size={17} /> Tóm tắt nhanh</h3>
              <ul>{g.quick.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </div>
          )}
          {g.video && (
            <div className="card vid">
              <video ref={video} src={media(g.video)} controls preload="metadata" playsInline />
            </div>
          )}
          {steps.map((s, i) => (
            <Reveal as="section" key={i} id={`buoc-${i + 1}`} data-i={i} className={`step ${g.platform}${s.image ? '' : ' noimg'}`}>
              <div className="step-txt">
                <div className="step-no"><small>Bước </small><b>{pad(i + 1)}</b></div>
                <h2>{s.title}</h2>
                <Body text={s.body} />
                <Callouts s={s} />
                {s.ts != null && g.video && <button className="link" onClick={() => seek(s.ts)}><Icon name="play" size={12} /> Xem trong video ({fmtTs(s.ts)})</button>}
              </div>
              {s.image && <StepImage src={s.image} alt={`Minh hoạ bước ${i + 1}: ${s.title}`} hotspot={s.hotspot} showHot={showHot} platform={g.platform} onZoom={() => setZoom(s)} />}
            </Reveal>
          ))}
          {steps.length > 0 && <Feedback slug={g.slug} preview={preview} />}
          {g.related?.length > 0 && (
            <section className="sec">
              <div className="sec-head"><h2>Hướng dẫn liên quan</h2></div>
              <div className="grid3">{g.related.map((r) => <GuideCard key={r.slug} g={r} compact />)}</div>
            </section>
          )}
        </div>
      </div>

      {focus != null && (
        <div className="focus" role="dialog" aria-modal="true" aria-label="Hướng dẫn từng bước">
          <div className="focus-top">
            <b>{g.title}</b>
            <button className="icon-btn" onClick={() => setFocus(null)} aria-label="Đóng"><Icon name="x" /></button>
          </div>
          <div className="prog" aria-hidden="true">{steps.map((_, i) => <i key={i} className={i <= focus ? 'on' : ''} />)}</div>
          {fs ? (
            <div key={focus} className={`focus-body ${g.platform}${fs.image ? '' : ' noimg'}`}>
              {fs.image && <StepImage src={fs.image} hotspot={fs.hotspot} showHot={showHot} platform={g.platform} alt={fs.title} onZoom={() => setZoom(fs)} />}
              <div className="focus-txt">
                <div className="step-no">Bước {focus + 1} / {steps.length}</div>
                <h2>{fs.title}</h2>
                <Body text={fs.body} />
                <Callouts s={fs} />
              </div>
            </div>
          ) : (
            <div className="focus-body done">
              <span className="big-check"><Icon name="check" size={40} strokeWidth={2.6} /></span>
              <h2>Bạn đã hoàn thành {steps.length} bước</h2>
              <Feedback slug={g.slug} preview={preview} />
            </div>
          )}
          <div className="focus-nav">
            <button className="btn ghost" onClick={() => setFocus(focus - 1)} disabled={focus === 0}><Icon name="back" size={17} /> Quay lại</button>
            {focus < steps.length
              ? <button className="btn" onClick={() => setFocus(focus + 1)}>{focus === steps.length - 1 ? 'Hoàn tất' : 'Tiếp tục'} <Icon name="arrow" size={17} /></button>
              : <button className="btn" onClick={() => setFocus(null)}>Đóng</button>}
          </div>
        </div>
      )}
      {zoom && (
        <div className="overlay zoom" onClick={() => setZoom(null)} role="dialog" aria-modal="true" aria-label="Ảnh phóng to">
          <button className="icon-btn light" aria-label="Đóng"><Icon name="x" size={26} /></button>
          <div onClick={(e) => e.stopPropagation()}><StepImage src={zoom.image} hotspot={zoom.hotspot} showHot={showHot} alt={zoom.title} /></div>
        </div>
      )}
    </article>
  )
}
