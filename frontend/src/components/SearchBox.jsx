import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, guideUrl } from '../api.js'
import Icon from '../icons.jsx'
import { useMeta } from '../App.jsx'
import { PlatformTag } from './GuideCard.jsx'

const HINTS = ['Chấm công không nhận khuôn mặt', 'Quên mật khẩu', 'Báo sai vị trí', 'Xuất báo cáo Excel']

export default function SearchBox({ autoFocus, big }) {
  const meta = useMeta()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [res, setRes] = useState(null)
  const [sel, setSel] = useState(-1)
  const [ai, setAi] = useState(null) // {loading} | {answer, cited}
  const seq = useRef(0)

  useEffect(() => {
    setAi(null); setSel(-1)
    if (!q.trim()) { setRes(null); return }
    const id = ++seq.current
    const t = setTimeout(() => {
      api(`/api/search?q=${encodeURIComponent(q)}`).then((r) => id === seq.current && setRes(r)).catch(() => {})
    }, 140)
    return () => clearTimeout(t)
  }, [q])

  const askAi = async () => {
    setAi({ loading: true })
    try { setAi(await api('/api/ask', { method: 'POST', body: { q } })) } catch (e) { setAi({ error: e.message }) }
  }
  const onKey = (e) => {
    if (!res) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, res.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, -1)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      const r = res[sel >= 0 ? sel : 0]
      if (sel < 0 && meta?.ai && q.trim().length >= 6 && !ai) askAi()
      else if (r) nav(guideUrl(r.slug, sel >= 0 ? r.step?.index : undefined))
    }
  }

  return (
    <div className={`sb${big ? ' big' : ''}`}>
      <div className="sb-field">
        <Icon name="search" size={big ? 24 : 20} />
        <input autoFocus={autoFocus} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
          placeholder="Mô tả điều bạn cần, ví dụ: chấm công không nhận khuôn mặt" aria-label="Tìm hướng dẫn"
          role="combobox" aria-expanded={!!res} aria-controls="sb-list" autoComplete="off" enterKeyHint="search" />
        {q && <button className="icon-btn" onClick={() => setQ('')} aria-label="Xoá"><Icon name="x" size={18} /></button>}
      </div>
      {!q && (
        <div className="sb-hints">
          <span>Thử:</span>
          {HINTS.map((h) => <button key={h} onClick={() => setQ(h)}>{h}</button>)}
        </div>
      )}
      {res && (
        <div className="sb-panel" id="sb-list" role="listbox">
          {ai && (
            <div className="ai-box" aria-live="polite">
              <div className="ai-tag"><Icon name="sparkle" size={14} /> Trả lời nhanh bằng AI</div>
              {ai.loading ? <p className="muted">Đang đọc các bài hướng dẫn…</p>
                : ai.answer ? (
                  <>
                    <p>{ai.answer}</p>
                    <div className="ai-cites">
                      {ai.cited?.map((c, i) => (
                        <Link key={i} to={guideUrl(c.slug, c.step ? c.step - 1 : undefined)}>
                          {c.title}{c.step ? ` · Bước ${c.step}` : ''} <Icon name="arrow" size={13} />
                        </Link>
                      ))}
                    </div>
                    <small>Nội dung do AI tổng hợp từ bài hướng dẫn, vui lòng xem bài gốc để thao tác chính xác.</small>
                  </>
                ) : <p className="muted">Chưa có câu trả lời chắc chắn. Mời bạn xem các bài gợi ý bên dưới.</p>}
            </div>
          )}
          {res.length === 0 && (
            <div className="sb-empty">
              <b>Chưa tìm thấy bài phù hợp.</b>
              <span>Thử mô tả ngắn hơn, hoặc dùng <Link to="/khac-phuc-loi">Chẩn đoán theo triệu chứng</Link>.</span>
            </div>
          )}
          {res.map((r, i) => (
            <Link key={r.slug} to={guideUrl(r.slug, r.step?.index)} role="option" aria-selected={i === sel}
              className={`sb-item${i === sel ? ' on' : ''}`}>
              <span className={`sb-ico ${r.kind}`}><Icon name={r.kind === 'fix' ? 'wrench' : 'book'} size={18} /></span>
              <span className="sb-txt">
                <b>{r.title}</b>
                {r.step ? <em><Icon name="target" size={13} /> Đến thẳng Bước {r.step.index + 1}: {r.step.title}</em>
                  : <em>{r.summary}</em>}
              </span>
              <PlatformTag p={r.platform} />
            </Link>
          ))}
          {res.length > 0 && meta?.ai && !ai && q.trim().length >= 6 && (
            <button className="sb-ask" onClick={askAi}><Icon name="sparkle" size={16} /> Hỏi AI: “{q}” <kbd>Enter</kbd></button>
          )}
        </div>
      )}
    </div>
  )
}
