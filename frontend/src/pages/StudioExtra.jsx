import { useEffect, useRef, useState } from 'react'
import { api, editorToken, fmtDate, fmtSize, LEVELS } from '../api.js'
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


const ST = { new: 'Mới', doing: 'Đang xử lý', done: 'Đã xong' }
const fmtTime = (t) => new Date(t * 1000).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })

/** Ảnh riêng tư: tải kèm mã biên tập rồi hiển thị bằng blob URL. */
function ShotThumb({ id }) {
  const [url, setUrl] = useState(null)
  const [big, setBig] = useState(false)
  useEffect(() => {
    let u
    fetch(`/editor/api/tickets/${id}/image`, { headers: { 'X-Editor-Token': editorToken.get() } }).then((r) => (r.ok ? r.blob() : null)).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u) } }).catch(() => {})
    return () => u && URL.revokeObjectURL(u)
  }, [id])
  if (!url) return <span className="tk-shot empty"><Icon name="image" size={20} /></span>
  return (<>
    <button className="tk-shot" onClick={() => setBig(true)} aria-label="Xem ảnh chụp màn hình"><img src={url} alt="" /></button>
    {big && <div className="overlay zoom" onClick={() => setBig(false)}><button className="icon-btn light" aria-label="Đóng"><Icon name="x" size={26} /></button><img src={url} alt="Ảnh chụp màn hình lỗi" /></div>}
  </>)
}

/** Yêu cầu hỗ trợ người dùng gửi lên + trạng thái kết nối Zalo Bot. */
export function TicketsAdmin() {
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState(null)
  const [chats, setChats] = useState(null)
  const [filter, setFilter] = useState('open')
  const load = () => api('/editor/api/tickets').then(setData).catch((e) => setMsg({ err: e.message }))
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t) }, [])
  if (!data) return <div className="st-empty muted">{msg?.err || 'Đang tải…'}</div>
  const z = data.zalo
  const run = async (fn, ok) => { setMsg(null); try { const r = await fn(); if (ok) setMsg({ ok }); load(); return r } catch (e) { setMsg({ err: e.message }) } }
  const patch = (t, p) => run(() => api(`/editor/api/tickets/${t.id}`, { method: 'PUT', body: { status: t.status, note: t.note, ...p } }))
  const list = data.tickets.filter((t) => (filter === 'open' ? t.status !== 'done' : filter === 'done' ? t.status === 'done' : true))
  const zl = (v) => (v === 'sent' ? ['st-published', 'Đã gửi Zalo'] : v === 'off' ? ['', 'Zalo chưa bật'] : v === 'pending' ? ['', 'Đang gửi Zalo…'] : v.startsWith('sent-no-photo') ? ['fix', 'Đã gửi chữ, ảnh lỗi'] : ['fix', 'Gửi Zalo lỗi'])
  return (
    <div className="ed">
      <h2 className="adm-h"><Icon name="chat" size={22} /> Yêu cầu hỗ trợ</h2>
      <div className={`card zalo ${z.token && z.chat_id ? 'on' : 'off'}`}>
        <div className="grow">
          <b>{z.token && z.chat_id ? 'Zalo Bot đã cấu hình' : 'Zalo Bot chưa cấu hình xong'}</b>
          <p className="muted">
            {!z.token ? 'Thiếu ZALO_BOT_TOKEN trong tệp .env. Tạo bot trong Zalo Bot Manager rồi chép Bot Token vào.'
              : !z.chat_id ? 'Thiếu ZALO_CHAT_ID. Nhắn một tin cho bot trên Zalo, bấm “Tìm chat_id”, chép mã vào .env rồi khởi động lại.'
                : z.photo ? 'Yêu cầu mới được gửi vào Zalo kèm ảnh chụp màn hình.' : 'Yêu cầu mới được gửi vào Zalo dạng chữ. Đặt PUBLIC_BASE_URL trong .env để gửi kèm ảnh.'}
          </p>
          {chats && (chats.length ? <ul className="zalo-chats">{chats.map((c, i) => <li key={i}><code>{c.chat_id}</code> {c.name} {c.text && <span className="muted">· “{c.text}”</span>}</li>)}</ul>
            : <p className="muted">Chưa thấy tin nhắn mới nào gửi tới bot. Hãy nhắn cho bot rồi bấm lại.</p>)}
        </div>
        <div className="adm-btns">
          {z.token && <button className="btn ghost small" onClick={async () => setChats(await run(() => api('/editor/api/zalo/chats')) || null)}>Tìm chat_id</button>}
          {z.token && z.chat_id && <button className="btn ghost small" onClick={() => run(() => api('/editor/api/zalo/test', { method: 'POST' }), 'Đã gửi tin thử vào Zalo.')}>Gửi tin thử</button>}
        </div>
      </div>
      {msg?.ok && <p className="okmsg"><Icon name="check" size={16} /> {msg.ok}</p>}{msg?.err && <p className="err">{msg.err}</p>}
      <div className="seg" role="tablist">{[['open', 'Chưa xong'], ['done', 'Đã xong'], ['all', 'Tất cả']].map(([k, l]) => <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}{k === 'open' ? ` (${data.tickets.filter((t) => t.status !== 'done').length})` : ''}</button>)}</div>
      {list.length === 0 && <p className="muted">Không có yêu cầu nào trong mục này.</p>}
      {list.map((t) => {
        const [zc, zt] = zl(t.zalo)
        return (
          <div key={t.id} className={`card adm-row tk ${t.status}`}>
            {t.image ? <ShotThumb id={t.id} /> : <span className="tk-shot empty" title="Không có ảnh"><Icon name="image" size={20} /></span>}
            <div className="grow">
              <div className="adm-tags">
                <span className={`tag tk-${t.status}`}>{ST[t.status]}</span><b>{t.code}</b>
                <span className="muted">{fmtTime(t.created_at)}</span>
                <span className={`tag ${zc}`} title={t.zalo}>{zt}</span>
              </div>
              <a className="tk-phone" href={`tel:${t.phone}`}><Icon name="phone" size={16} /> {t.phone}</a>
              <p>{t.content}</p>
              {t.page && <p className="muted">Gửi từ trang: {t.page}</p>}
              <input className="tk-note" defaultValue={t.note} placeholder="Ghi chú xử lý (chỉ nội bộ thấy)" aria-label="Ghi chú xử lý" onBlur={(e) => e.target.value !== t.note && patch(t, { note: e.target.value })} />
            </div>
            <div className="adm-btns">
              <select value={t.status} aria-label="Trạng thái" onChange={(e) => patch(t, { status: e.target.value })}>{Object.entries(ST).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              {t.zalo !== 'sent' && z.token && z.chat_id && <button className="btn ghost small" onClick={() => run(() => api(`/editor/api/tickets/${t.id}/resend`, { method: 'POST' }))}>Gửi lại Zalo</button>}
              <Confirm label="Xoá" onYes={() => run(() => api(`/editor/api/tickets/${t.id}`, { method: 'DELETE' }))} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
