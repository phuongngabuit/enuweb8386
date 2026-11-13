import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, editorToken, fmtDate, fmtTs, media } from '../api.js'
import Icon from '../icons.jsx'
import { MARK } from '../logo.js'
import { useMeta } from '../App.jsx'
import GuideView from '../components/GuideView.jsx'
import StepImage from '../components/StepImage.jsx'

const STAGES = [['upload', 'Nhận tệp'], ['extract', 'Trích xuất'], ['ai', 'AI phân tích'], ['normalize', 'Ghép ảnh & chuẩn hoá'], ['build', 'Dựng bản nháp']]
const BLANK = { title: '', body: '', image: null, hotspot: null, note: '', warning: '', uncertain: '', ts: null }

function Pipeline({ job }) {
  const at = job.stage === 'done' ? STAGES.length : STAGES.findIndex(([k]) => k === job.stage)
  return (
    <div className={`pipe ${job.status}`}>
      <div className="pipe-file"><Icon name="upload" size={15} /> {job.filename}</div>
      <ol>{STAGES.map(([k, l], i) => <li key={k} className={i < at ? 'ok' : i === at ? 'now' : ''}><span>{i < at ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}</span>{l}</li>)}</ol>
      <p>{job.message}</p>
    </div>
  )
}

function Importer({ ping, onDone }) {
  const [job, setJob] = useState(null)
  const [err, setErr] = useState('')
  const [over, setOver] = useState(false)
  const input = useRef(null)
  useEffect(() => {
    if (!job || job.status !== 'running') return
    const t = setTimeout(async () => {
      try { const j = await api(`/editor/api/jobs/${job.id}`); setJob(j); if (j.status === 'done') onDone(j.guide_id) } catch (e) { setErr(e.message) }
    }, 700)
    return () => clearTimeout(t)
  }, [job])
  const send = async (file) => {
    if (!file) return
    setErr(''); setJob({ filename: file.name, status: 'running', stage: 'upload', message: 'Đang tải tệp lên…' })
    const form = new FormData(); form.append('file', file)
    try { setJob(await api('/editor/api/import', { method: 'POST', form })) } catch (e) { setJob(null); setErr(e.message) }
  }
  return (
    <div className="imp">
      <div className={`drop${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files[0]) }}>
        <Icon name="sparkle" size={26} />
        <b>AI Import</b>
        <span>Kéo thả DOCX, PDF hoặc MP4 vào đây</span>
        <button className="btn" onClick={() => input.current.click()} disabled={job?.status === 'running'}>Chọn tệp</button>
        <small>DOCX/PDF ≤ {ping.limits.doc_mb} MB · MP4 ≤ {ping.limits.video_mb} MB, tối đa 10 phút</small>
        <input ref={input} type="file" hidden accept=".docx,.pdf,.mp4" onChange={(e) => { send(e.target.files[0]); e.target.value = '' }} />
      </div>
      <p className={`ai-state ${ping.ai ? 'on' : 'off'}`}>
        {ping.ai ? <>Gemini đã kết nối · <code>{ping.model}</code></> : 'Chưa có GEMINI_API_KEY — import chạy bằng quy tắc, cần biên tập kỹ hơn.'}
      </p>
      {err && <p className="err">{err}</p>}
      {job && <Pipeline job={job} />}
    </div>
  )
}

function StepEditor({ s, i, n, g, platform, onChange, onMove, onDelete, onPick }) {
  const [draw, setDraw] = useState(false)
  const set = (k, v) => onChange({ ...s, [k]: v })
  return (
    <div className={`card se${s.uncertain ? ' unsure' : ''}`}>
      <div className="se-head">
        <span className="step-no">Bước {String(i + 1).padStart(2, '0')}</span>
        {s.ts != null && <span className="tag">Video {fmtTs(s.ts)}</span>}
        <span className="grow" />
        <button className="icon-btn" disabled={i === 0} onClick={() => onMove(-1)} aria-label="Chuyển lên"><Icon name="up" size={17} /></button>
        <button className="icon-btn" disabled={i === n - 1} onClick={() => onMove(1)} aria-label="Chuyển xuống"><Icon name="down" size={17} /></button>
        <button className="icon-btn danger" onClick={onDelete} aria-label="Xoá bước"><Icon name="trash" size={17} /></button>
      </div>
      {s.uncertain && (
        <div className="co warn">
          <Icon name="alert" size={18} />
          <div><b>AI chưa chắc chắn</b>{s.uncertain}</div>
          <button className="btn small" onClick={() => set('uncertain', '')}><Icon name="check" size={14} /> Đã kiểm tra</button>
        </div>
      )}
      <div className="se-grid">
        <div className="se-fields">
          <label>Tiêu đề bước<input value={s.title} onChange={(e) => set('title', e.target.value)} /></label>
          <label>Nội dung<textarea rows={4} value={s.body} onChange={(e) => set('body', e.target.value)} /></label>
          <label>Lưu ý (tuỳ chọn)<input value={s.note} onChange={(e) => set('note', e.target.value)} /></label>
          <label>Cảnh báo (tuỳ chọn)<input value={s.warning} onChange={(e) => set('warning', e.target.value)} /></label>
        </div>
        <div className="se-img">
          {s.image ? (
            <>
              <StepImage src={s.image} hotspot={s.hotspot} platform={platform} onDraw={draw ? (r) => { set('hotspot', { ...r, label: s.hotspot?.label || '' }); setDraw(false) } : undefined} />
              {draw && <p className="muted">Kéo chuột trên ảnh để khoanh vùng cần nhấn.</p>}
              <div className="se-tools">
                <button className="btn small ghost" onClick={onPick}><Icon name="image" size={14} /> Đổi ảnh</button>
                <button className={`btn small ${draw ? '' : 'ghost'}`} onClick={() => setDraw(!draw)}><Icon name="target" size={14} /> {s.hotspot ? 'Vẽ lại điểm nhấn' : 'Thêm điểm nhấn'}</button>
                {s.hotspot && <button className="btn small ghost" onClick={() => set('hotspot', null)}>Bỏ điểm nhấn</button>}
                <button className="btn small ghost" onClick={() => onChange({ ...s, image: null, hotspot: null })}>Bỏ ảnh</button>
              </div>
              {s.hotspot && <label>Nhãn điểm nhấn<input value={s.hotspot.label} placeholder="Ví dụ: Chấm công" onChange={(e) => set('hotspot', { ...s.hotspot, label: e.target.value })} /></label>}
            </>
          ) : <button className="pick-empty" onClick={onPick}><Icon name="image" size={24} />Chọn ảnh minh hoạ{g.assets.length ? ` (${g.assets.length} ảnh trong kho)` : ''}</button>}
        </div>
      </div>
    </div>
  )
}

function AssetPicker({ g, used, onPick, onClose, onUploaded }) {
  const [err, setErr] = useState('')
  const up = async (file) => {
    if (!file) return
    const form = new FormData(); form.append('file', file)
    try { const a = await api(`/editor/api/guides/${g.id}/assets`, { method: 'POST', form }); onUploaded(a); onPick(a.file) } catch (e) { setErr(e.message) }
  }
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head"><h3>Kho ảnh của bài</h3><button className="icon-btn" onClick={onClose} aria-label="Đóng"><Icon name="x" /></button></div>
        <p className="muted">Ảnh trích từ tệp nguồn, theo đúng thứ tự xuất hiện. Ảnh mờ là ảnh đã dùng ở bước khác.</p>
        <div className="assets">
          {g.assets.map((a) => (
            <button key={a.id} className={used.has(a.file) ? 'used' : ''} onClick={() => onPick(a.file)}>
              <img src={media(a.file)} alt="" loading="lazy" />
              <span>{a.ts != null ? fmtTs(a.ts) : a.page ? `Trang ${a.page}` : a.id}</span>
            </button>
          ))}
          <label className="asset-up"><Icon name="upload" size={22} />Tải ảnh khác<input type="file" hidden accept="image/*" onChange={(e) => up(e.target.files[0])} /></label>
        </div>
        {err && <p className="err">{err}</p>}
      </div>
    </div>
  )
}

function Editor({ id, onChanged, onDeleted }) {
  const meta = useMeta()
  const [g, setG] = useState(null)
  const [d, setD] = useState(null)
  const [msg, setMsg] = useState(null)
  const [pick, setPick] = useState(null)
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const load = (x) => { setG(x); setD(x.draft) }
  useEffect(() => { setG(null); setMsg(null); setPreview(false); api(`/editor/api/guides/${id}`).then(load).catch((e) => setMsg({ err: e.message })) }, [id])
  if (!g) return <div className="st-empty muted">{msg?.err || 'Đang tải…'}</div>

  const changed = JSON.stringify(d) !== JSON.stringify(g.draft)
  const set = (k, v) => setD({ ...d, [k]: v })
  const setStep = (i, s) => set('steps', d.steps.map((x, j) => (j === i ? s : x)))
  const run = async (fn, ok) => {
    setBusy(true); setMsg(null)
    try { const x = await fn(); if (x?.id) load(x); setMsg({ ok }); onChanged() } catch (e) { setMsg({ err: e.message }) } finally { setBusy(false) }
  }
  const save = () => api(`/editor/api/guides/${id}`, { method: 'PUT', body: d })
  const publish = async () => { await save(); return api(`/editor/api/guides/${id}/publish`, { method: 'POST' }) }
  const move = (i, dir) => { const s = [...d.steps]; [s[i], s[i + dir]] = [s[i + dir], s[i]]; set('steps', s) }
  const unsure = d.steps.filter((s) => s.uncertain).length
  const used = new Set(d.steps.map((s) => s.image).filter(Boolean))
  const src = g.source

  return (
    <div className="ed">
      <div className="ed-bar">
        <span className={`tag st-${g.status}`}>{g.status === 'published' ? `Đã xuất bản · v${g.version}` : 'Bản nháp'}</span>
        {(g.dirty || changed) && g.status === 'published' && <span className="tag fix">Có thay đổi chưa xuất bản</span>}
        <span className="grow" />
        <button className="btn ghost small" onClick={() => setPreview(!preview)}><Icon name="eye" size={15} /> {preview ? 'Quay lại sửa' : 'Xem trước'}</button>
        <button className="btn ghost small" disabled={busy || !changed} onClick={() => run(save, 'Đã lưu bản nháp.')}>Lưu nháp</button>
        <button className="btn small" disabled={busy} onClick={() => run(publish, 'Đã xuất bản lên thư viện công khai.')}>{g.status === 'published' ? 'Xuất bản bản cập nhật' : 'Xuất bản'}</button>
      </div>
      {msg?.ok && <p className="okmsg"><Icon name="check" size={16} /> {msg.ok} {g.status === 'published' && <Link to={`/huong-dan/${g.slug}`} target="_blank">Mở bài công khai</Link>}</p>}
      {msg?.err && <p className="err">{msg.err}</p>}

      {preview ? (
        <div className="pv pub"><GuideView preview g={{ ...d, slug: g.slug, category_label: meta?.categories?.[d.category], related: [] }} /></div>
      ) : (
        <>
          {(src || g.ai) && (
            <div className="card srcbox">
              <div>
                <b>Nguồn:</b> {src?.filename || '—'} {src?.type && src.type !== 'seed' && <span className="tag">{src.type.toUpperCase()}</span>}
                {src?.imported_at && <> · nhập ngày {fmtDate(src.imported_at)}</>}
                {src?.duration && <> · video {fmtTs(src.duration)}</>}
                {g.ai && <> · {g.ai.mode === 'gemini' ? <>AI: <code>{g.ai.model}</code></> : 'Dựng bằng quy tắc (không AI)'}</>}
              </div>
              {g.ai?.error && <p className="muted">Lý do không dùng AI: {g.ai.error}</p>}
              {g.ai?.notes?.length > 0 && <ul>{g.ai.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
              {unsure > 0 && <p className="warn-line"><Icon name="alert" size={16} /> Còn {unsure} bước cần kiểm tra trước khi xuất bản.</p>}
            </div>
          )}
          <div className="card form">
            <label className="full">Tiêu đề<input value={d.title} onChange={(e) => set('title', e.target.value)} /></label>
            <label className="full">Mô tả ngắn<textarea rows={2} value={d.summary} onChange={(e) => set('summary', e.target.value)} /></label>
            <label>Nền tảng<select value={d.platform} onChange={(e) => set('platform', e.target.value)}><option value="mobile">Mobile App</option><option value="web">Web App</option></select></label>
            <label>Danh mục<select value={d.category} onChange={(e) => set('category', e.target.value)}>{Object.entries(meta?.categories || {}).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label>Loại<select value={d.kind} onChange={(e) => set('kind', e.target.value)}><option value="guide">Hướng dẫn sử dụng</option><option value="fix">Khắc phục lỗi</option></select></label>
            <div className="checks">
              <label><input type="checkbox" checked={d.featured} onChange={(e) => set('featured', e.target.checked)} /> Nổi bật</label>
              <label><input type="checkbox" checked={d.beginner} onChange={(e) => set('beginner', e.target.checked)} /> Dành cho người mới</label>
            </div>
            <label className="full">Từ khoá tìm kiếm (cách nhau bằng dấu phẩy)<input value={d.keywords.join(', ')} onChange={(e) => set('keywords', e.target.value.split(',').map((x) => x.trimStart()))} /></label>
            <label className="full">Tóm tắt nhanh (mỗi dòng một ý, 3–5 ý)<textarea rows={3} value={d.quick.join('\n')} onChange={(e) => set('quick', e.target.value.split('\n'))} /></label>
          </div>
          <h3 className="ed-h">Các bước ({d.steps.length})</h3>
          {d.steps.map((s, i) => (
            <StepEditor key={i} s={s} i={i} n={d.steps.length} g={g} platform={d.platform} onChange={(x) => setStep(i, x)}
              onMove={(dir) => move(i, dir)} onDelete={() => set('steps', d.steps.filter((_, j) => j !== i))} onPick={() => setPick(i)} />
          ))}
          <button className="btn ghost add" onClick={() => set('steps', [...d.steps, { ...BLANK }])} disabled={d.steps.length >= 20}><Icon name="plus" size={17} /> Thêm bước</button>

          <div className="card danger-zone">
            <div>
              <b>Phiên bản đã xuất bản</b>
              {g.versions.length === 0 && <p className="muted">Chưa có.</p>}
              {g.versions.map((v) => (
                <p key={v.version}>v{v.version} · {fmtDate(v.created_at)} · {v.title}{' '}
                  <button className="link" onClick={() => run(() => api(`/editor/api/guides/${id}/restore/${v.version}`, { method: 'POST' }), `Đã nạp lại nội dung v${v.version} vào bản nháp.`)}>Khôi phục vào bản nháp</button></p>
              ))}
              {g.status === 'published' && <p className="muted">Lượt xem: {g.views} · Hữu ích: {g.helpful_yes} · Chưa giải quyết: {g.helpful_no}</p>}
            </div>
            <div className="dz-btns">
              {g.status === 'published' && <button className="btn ghost small" onClick={() => run(() => api(`/editor/api/guides/${id}/unpublish`, { method: 'POST' }), 'Đã gỡ khỏi thư viện công khai.')}>Gỡ xuất bản</button>}
              <button className="btn ghost small danger" onClick={() => window.confirm('Xoá hẳn bài này cùng toàn bộ ảnh?') && api(`/editor/api/guides/${id}`, { method: 'DELETE' }).then(onDeleted)}>Xoá bài</button>
            </div>
          </div>
        </>
      )}
      {pick != null && (
        <AssetPicker g={g} used={used} onClose={() => setPick(null)} onUploaded={(a) => setG({ ...g, assets: [...g.assets, a] })}
          onPick={(file) => { setStep(pick, { ...d.steps[pick], image: file, hotspot: null }); setPick(null) }} />
      )}
    </div>
  )
}

export default function Studio() {
  const [ping, setPing] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | token | off
  const [list, setList] = useState([])
  const [cur, setCur] = useState(null)
  const [tok, setTok] = useState('')
  const refresh = () => api('/editor/api/guides').then(setList).catch(() => {})
  const connect = () => api('/editor/api/ping').then((p) => { setPing(p); setState('ok'); refresh() })
    .catch((e) => setState(e.status === 401 ? 'token' : 'off'))
  useEffect(() => { document.title = 'SupportFlow Studio'; connect() }, [])

  if (state === 'loading') return <div className="st-empty muted">Đang kết nối…</div>
  if (state === 'off') return <div className="st-empty"><h2>Studio không khả dụng ở địa chỉ này</h2><p className="muted">Công cụ biên tập chỉ mở trên cổng nội bộ của máy chủ.</p><Link className="btn" to="/">Về trang chủ</Link></div>
  if (state === 'token') return (
    <form className="st-empty" onSubmit={(e) => { e.preventDefault(); editorToken.set(tok); connect() }}>
      <h2>Nhập mã biên tập</h2>
      <p className="muted">Giá trị <code>EDITOR_TOKEN</code> trong tệp .env trên máy chủ.</p>
      <input type="password" value={tok} onChange={(e) => setTok(e.target.value)} autoFocus aria-label="Mã biên tập" />
      <button className="btn">Mở Studio</button>
    </form>
  )
  return (
    <div className="studio">
      <aside className="st-side">
        <Link to="/" className="logo"><img className="logo-img" src={MARK} alt="" width="38" height="38" /><span><b>SupportFlow</b> <i>Studio</i></span></Link>
        <Importer ping={ping} onDone={(id) => { refresh(); setCur(id) }} />
        <div className="st-list-head"><b>Bài viết ({list.length})</b>
          <button className="link" onClick={async () => { const g = await api('/editor/api/guides', { method: 'POST' }); await refresh(); setCur(g.id) }}><Icon name="plus" size={15} /> Bài trống</button>
        </div>
        <ul className="st-list">
          {list.map((g) => (
            <li key={g.id}>
              <button className={g.id === cur ? 'on' : ''} onClick={() => setCur(g.id)}>
                <b>{g.title || 'Chưa có tiêu đề'}</b>
                <span>
                  <i className={`dot ${g.status}${g.dirty ? ' dirty' : ''}`} />{g.status === 'published' ? (g.dirty ? 'Có bản sửa chờ xuất bản' : 'Đã xuất bản') : 'Bản nháp'}
                  {g.uncertain > 0 && <em> · {g.uncertain} bước cần kiểm tra</em>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="st-main">
        {cur ? <Editor key={cur} id={cur} onChanged={refresh} onDeleted={() => { setCur(null); refresh() }} />
          : <div className="st-empty"><Icon name="sparkle" size={36} /><h2>Tải tệp lên để AI dựng bản nháp</h2><p className="muted">Hoặc chọn một bài ở cột bên trái để chỉnh sửa. Bài chỉ xuất hiện công khai sau khi bạn bấm Xuất bản.</p></div>}
      </section>
    </div>
  )
}
