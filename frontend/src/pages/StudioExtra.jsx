import { useEffect, useRef, useState } from 'react'
import { api, fmtDate, fmtSize, LEVELS } from '../api.js'
import Icon from '../icons.jsx'

/** Quản lý thông báo: soạn, ghim, hẹn ngày hết hạn, hiện/ẩn. */
export function NewsAdmin() {
  const blank = { title: '', body: '', level: 'info', pinned: false, published: true, ends_at: null }
  const [list, setList] = useState([])
  const [f, setF] = useState(blank)
  const [msg, setMsg] = useState(null)
  const load = () => api('/editor/api/announcements').then(setList).catch((e) => setMsg({ err: e.message }))
  useEffect(() => { load() }, [])
  const set = (k, v) => setF({ ...f, [k]: v })
  const save = async (e) => {
    e.preventDefault(); setMsg(null)
    try {
      await api(f.id ? `/editor/api/announcements/${f.id}` : '/editor/api/announcements', { method: f.id ? 'PUT' : 'POST', body: f })
      setMsg({ ok: f.id ? 'Đã cập nhật thông báo.' : f.published ? 'Đã đăng thông báo.' : 'Đã lưu bản nháp.' }); setF(blank); load()
    } catch (er) { setMsg({ err: er.message }) }
  }
  const patch = (a, p) => api(`/editor/api/announcements/${a.id}`, { method: 'PUT', body: { ...a, ...p } }).then(load)
  const toDate = (t) => (t ? new Date(t * 1000).toISOString().slice(0, 10) : '')
  const now = Date.now() / 1000
  return (
    <div className="ed">
      <h2 className="adm-h"><Icon name="bell" size={22} /> Thông báo</h2>
      <form className="card form" onSubmit={save}>
        <label className="full">Tiêu đề<input id="ann-title" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Ví dụ: Bảo trì hệ thống 22:00 ngày 20/11" required /></label>
        <label className="full">Nội dung<textarea id="ann-body" rows={4} value={f.body} onChange={(e) => set('body', e.target.value)} /></label>
        <label>Mức độ<select id="ann-level" value={f.level} onChange={(e) => set('level', e.target.value)}>{Object.entries(LEVELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>Tự ẩn sau ngày (tuỳ chọn)<input id="ann-end" type="date" value={toDate(f.ends_at)} onChange={(e) => set('ends_at', e.target.value ? new Date(`${e.target.value}T23:59:59`).getTime() / 1000 : null)} /></label>
        <div className="checks">
          <label><input type="checkbox" checked={f.pinned} onChange={(e) => set('pinned', e.target.checked)} /> Ghim lên đầu</label>
          <label><input type="checkbox" checked={f.published} onChange={(e) => set('published', e.target.checked)} /> Hiển thị công khai</label>
        </div>
        <div className="full adm-actions">
          <button className="btn">{f.id ? 'Lưu thay đổi' : 'Đăng thông báo'}</button>
          {f.id && <button type="button" className="btn ghost" onClick={() => setF(blank)}>Huỷ sửa</button>}
          {msg?.ok && <span className="okmsg"><Icon name="check" size={16} /> {msg.ok}</span>}{msg?.err && <span className="err">{msg.err}</span>}
        </div>
      </form>
      <h3 className="ed-h">Đã tạo ({list.length})</h3>
      {list.length === 0 && <p className="muted">Chưa có thông báo nào.</p>}
      {list.map((a) => {
        const expired = a.ends_at && a.ends_at < now
        return (
          <div key={a.id} className="card adm-row">
            <div className="grow">
              <div className="adm-tags">
                <span className={`tag ${a.published && !expired ? 'st-published' : ''}`}>{expired ? 'Đã hết hạn' : a.published ? 'Đang hiển thị' : 'Bản nháp'}</span>
                <span className={`tag ${a.level === 'warning' ? 'fix' : ''}`}>{LEVELS[a.level]}</span>
                {a.pinned ? <span className="tag">Ghim</span> : null}
                <span className="muted">{fmtDate(a.created_at)}{a.ends_at ? ` · ẩn sau ${fmtDate(a.ends_at)}` : ''}</span>
              </div>
              <b>{a.title}</b>{a.body && <p className="muted">{a.body}</p>}
            </div>
            <div className="adm-btns">
              <button className="btn ghost small" onClick={() => { setF(a); document.getElementById('ann-title')?.focus() }}>Sửa</button>
              <button className="btn ghost small" onClick={() => patch(a, { published: !a.published })}>{a.published ? 'Ẩn' : 'Hiện'}</button>
              <Confirm label="Xoá" onYes={() => api(`/editor/api/announcements/${a.id}`, { method: 'DELETE' }).then(load)} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Kho tài liệu cho người dùng tải về (khác với AI Import: tệp được giữ nguyên, không chuyển thành bài). */
export function DocsAdmin({ limitMb }) {
  const [list, setList] = useState([])
  const [f, setF] = useState({ title: '', description: '', platform: 'all' })
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const input = useRef(null)
  const load = () => api('/editor/api/documents').then(setList).catch((e) => setMsg({ err: e.message }))
  useEffect(() => { load() }, [])
  const send = async (e) => {
    e.preventDefault(); if (!file) { setMsg({ err: 'Hãy chọn tệp cần tải lên.' }); return }
    setBusy(true); setMsg(null)
    const form = new FormData(); form.append('file', file); Object.entries(f).forEach(([k, v]) => form.append(k, v))
    try { await api('/editor/api/documents', { method: 'POST', form }); setMsg({ ok: 'Đã tải lên và hiển thị công khai.' }); setFile(null); setF({ title: '', description: '', platform: 'all' }); input.current.value = ''; load() }
    catch (er) { setMsg({ err: er.message }) } finally { setBusy(false) }
  }
  const patch = (d, p) => api(`/editor/api/documents/${d.id}`, { method: 'PUT', body: { ...d, ...p } }).then(load)
  return (
    <div className="ed">
      <h2 className="adm-h"><Icon name="file" size={22} /> Tài liệu tải về</h2>
      <form className="card form" onSubmit={send}>
        <label className="full">Tệp (PDF, DOCX, XLSX, PPTX · tối đa {limitMb} MB)<input id="doc-file" ref={input} type="file" accept=".pdf,.docx,.xlsx,.pptx" onChange={(e) => setFile(e.target.files[0] || null)} /></label>
        <label className="full">Tên hiển thị<input id="doc-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Để trống sẽ lấy theo tên tệp" /></label>
        <label className="full">Mô tả ngắn<input id="doc-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <label>Dành cho<select id="doc-platform" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })}><option value="all">Tất cả</option><option value="mobile">Mobile App</option><option value="web">Web App</option></select></label>
        <div className="full adm-actions">
          <button className="btn" disabled={busy}><Icon name="upload" size={17} /> {busy ? 'Đang tải lên…' : 'Tải lên'}</button>
          {msg?.ok && <span className="okmsg"><Icon name="check" size={16} /> {msg.ok}</span>}{msg?.err && <span className="err">{msg.err}</span>}
        </div>
        <p className="full muted">Tệp được công khai nguyên trạng. Kiểm tra kỹ để không lộ thông tin nhân sự hay tài liệu nội bộ. Muốn chuyển tệp thành bài hướng dẫn từng bước, dùng AI Import ở mục Hướng dẫn.</p>
      </form>
      <h3 className="ed-h">Đã tải lên ({list.length})</h3>
      {list.length === 0 && <p className="muted">Chưa có tài liệu nào.</p>}
      {list.map((d) => (
        <div key={d.id} className="card adm-row">
          <span className={`doc-ext ${d.ext}`}>{d.ext.toUpperCase()}</span>
          <div className="grow">
            <div className="adm-tags">
              <span className={`tag ${d.published ? 'st-published' : ''}`}>{d.published ? 'Đang hiển thị' : 'Đã ẩn'}</span>
              <span className="tag">{d.platform === 'all' ? 'Tất cả' : d.platform === 'web' ? 'Web' : 'Mobile'}</span>
              <span className="muted">{fmtSize(d.size)} · {fmtDate(d.created_at)} · {d.downloads} lượt tải</span>
            </div>
            <b>{d.title}</b><p className="muted">{d.description || d.filename}</p>
          </div>
          <div className="adm-btns">
            <button className="btn ghost small" onClick={() => patch(d, { published: !d.published })}>{d.published ? 'Ẩn' : 'Hiện'}</button>
            <Confirm label="Xoá" onYes={() => api(`/editor/api/documents/${d.id}`, { method: 'DELETE' }).then(load)} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Confirm({ label, onYes }) {
  const [ask, setAsk] = useState(false)
  if (!ask) return <button className="btn ghost small danger" onClick={() => setAsk(true)}>{label}</button>
  return <span className="adm-confirm">Chắc chắn? <button className="btn small danger-solid" onClick={onYes}>Xoá hẳn</button><button className="btn ghost small" onClick={() => setAsk(false)}>Không</button></span>
}
