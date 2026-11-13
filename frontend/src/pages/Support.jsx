import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api.js'
import Icon from '../icons.jsx'

const MAX = 8 * 1024 * 1024

export default function Support() {
  const loc = useLocation()
  const [phone, setPhone] = useState('')
  const [content, setContent] = useState('')
  const [website, setWebsite] = useState('')
  const [shot, setShot] = useState(null) // { file, url }
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [over, setOver] = useState(false)
  const input = useRef(null)
  const from = loc.state?.from || ''

  const take = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setErr('Tệp vừa chọn không phải ảnh. Hãy chọn ảnh PNG hoặc JPG.'); return }
    if (file.size > MAX) { setErr('Ảnh vượt quá 8 MB. Hãy chụp lại hoặc cắt bớt.'); return }
    setErr(''); setShot((s) => { if (s) URL.revokeObjectURL(s.url); return { file, url: URL.createObjectURL(file) } })
  }
  useEffect(() => { // dán ảnh trực tiếp bằng Ctrl+V
    const onPaste = (e) => { const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); take(f) } }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])
  useEffect(() => { document.title = 'Gửi yêu cầu hỗ trợ — SupportFlow'; return () => { document.title = 'SupportFlow — Hướng dẫn ENumber Chấm Công' } }, [])

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    const p = phone.replace(/[\s.\-()]/g, '')
    if (!/^(0|\+?84)\d{9}$/.test(p)) { setErr('Số điện thoại chưa đúng. Ví dụ: 0912345678.'); document.getElementById('sp-phone').focus(); return }
    if (content.trim().length < 10) { setErr('Hãy mô tả vấn đề ít nhất 10 ký tự để chúng tôi hỗ trợ đúng.'); document.getElementById('sp-content').focus(); return }
    setBusy(true)
    const form = new FormData(); form.append('phone', p); form.append('content', content.trim()); form.append('page', from); form.append('website', website)
    if (shot) form.append('image', shot.file, shot.file.name || 'anh-chup.png')
    try { setDone(await api('/api/support', { method: 'POST', form })); window.scrollTo({ top: 0 }) } catch (er) { setErr(er.message) } finally { setBusy(false) }
  }

  return (
    <>
      <section className="band">
        <div className="fx"><i /><i /></div>
        <div className="wrap"><span className="kicker">Liên hệ kỹ thuật</span><h1>Gửi yêu cầu hỗ trợ</h1>
          <p className="lead">Chưa tìm được cách xử lý? Để lại số điện thoại và mô tả lỗi, bộ phận kỹ thuật sẽ liên hệ lại với bạn.</p></div>
      </section>
      <div className="wrap sp">
        {done ? (
          <div className="tile sp-done" aria-live="polite">
            <span className="big-check"><Icon name="check" size={44} strokeWidth={2.6} /></span>
            <h2>Đã gửi yêu cầu</h2>
            <p>Mã yêu cầu của bạn</p>
            <strong>{done.code}</strong>
            <p className="muted">Bộ phận kỹ thuật sẽ gọi lại số <b>{phone}</b>. Hãy giữ mã này để tiện trao đổi.</p>
            <div className="sp-done-btns">
              <Link className="btn" to="/">Về trang chủ</Link>
              <button className="btn ghost" onClick={() => { setDone(null); setContent(''); setShot(null) }}>Gửi yêu cầu khác</button>
            </div>
          </div>
        ) : (
          <form className="tile sp-form" onSubmit={submit} noValidate>
            <label htmlFor="sp-phone">Số điện thoại của bạn <i>*</i></label>
            <div className="sp-field"><Icon name="phone" size={20} />
              <input id="sp-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0912 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={16} required />
            </div>
            <label htmlFor="sp-content">Nội dung cần hỗ trợ <i>*</i></label>
            <textarea id="sp-content" rows={5} maxLength={2000} value={content} onChange={(e) => setContent(e.target.value)} required
              placeholder="Ví dụ: Sáng nay tôi chấm công thì ứng dụng báo “khuôn mặt không khớp”, đã thử đăng ký lại nhưng vẫn lỗi. Điện thoại Samsung A54." />
            <div className="sp-count">{content.length}/2000</div>

            <label>Ảnh chụp màn hình lỗi <span className="muted">(không bắt buộc)</span></label>
            {shot ? (
              <div className="sp-shot">
                <img src={shot.url} alt="Ảnh chụp màn hình đã chọn" />
                <div><b>{shot.file.name || 'Ảnh đã dán'}</b><span className="muted">{Math.max(1, Math.round(shot.file.size / 1024))} KB</span>
                  <div className="sp-shot-btns">
                    <button type="button" className="btn ghost small" onClick={() => input.current.click()}>Đổi ảnh</button>
                    <button type="button" className="btn ghost small danger" onClick={() => { URL.revokeObjectURL(shot.url); setShot(null) }}>Bỏ ảnh</button>
                  </div></div>
              </div>
            ) : (
              <button type="button" className={`sp-drop${over ? ' over' : ''}`} onClick={() => input.current.click()}
                onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]) }}>
                <span className="sp-drop-ico"><Icon name="image" size={26} /></span>
                <b>Chèn ảnh chụp màn hình lỗi</b>
                <span className="muted">Bấm để chọn ảnh, kéo thả vào đây, hoặc dán bằng Ctrl + V</span>
              </button>
            )}
            <input ref={input} id="sp-file" type="file" accept="image/*" hidden onChange={(e) => { take(e.target.files[0]); e.target.value = '' }} />
            <input className="sp-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} />

            {err && <p className="err" role="alert"><Icon name="alert" size={17} /> {err}</p>}
            <button className="btn sp-send" disabled={busy}><Icon name="arrow" size={19} /> {busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button>
            <p className="sp-note">Số điện thoại và ảnh chỉ dùng để liên hệ và xử lý yêu cầu này. Trước khi gửi, hãy che thông tin cá nhân không liên quan trong ảnh.</p>
          </form>
        )}
        <aside className="sp-side">
          <div className="tile t-path sp-steps">
            <span className="kicker">Sau khi gửi</span>
            <h3>Yêu cầu của bạn đi đâu?</h3>
            <ol>
              <li><a><i>1</i><span><b>Tới thẳng nhóm kỹ thuật</b><em>Yêu cầu và ảnh được chuyển ngay qua Zalo</em></span></a></li>
              <li><a><i>2</i><span><b>Kỹ thuật viên xem ảnh lỗi</b><em>Có ảnh thì tìm ra nguyên nhân nhanh hơn</em></span></a></li>
              <li><a><i>3</i><span><b>Gọi lại cho bạn</b><em>Theo số điện thoại bạn để lại</em></span></a></li>
            </ol>
          </div>
          <div className="tile sp-tip">
            <b>Thử tự xử lý trước?</b>
            <p className="muted">Nhiều lỗi có sẵn cách khắc phục trong 1–2 phút.</p>
            <Link to="/khac-phuc-loi" className="more">Chẩn đoán theo triệu chứng <Icon name="arrow" size={16} /></Link>
          </div>
        </aside>
      </div>
    </>
  )
}
