import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, guideUrl } from '../api.js'
import Icon from '../icons.jsx'
import { useMeta } from '../App.jsx'
import SearchBox from '../components/SearchBox.jsx'
import GuideCard, { PlatformTag } from '../components/GuideCard.jsx'
import Wizard from '../components/Wizard.jsx'
import HeroPhone from '../components/HeroPhone.jsx'
import Reveal from '../components/Reveal.jsx'

const ASKS = ['Quên mật khẩu đăng nhập', 'Chấm công không nhận khuôn mặt', 'Báo ngoài phạm vi chấm công', 'Xuất bảng công ra Excel',
  'Đăng ký khuôn mặt lần đầu', 'Tạo đơn công tác', 'Duyệt đơn nghỉ phép', 'Cài ứng dụng trên điện thoại']

function Count({ to }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!to) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); return }
    const t0 = performance.now(); let raf
    const f = (t) => { const k = Math.min(1, (t - t0) / 1100); setN(Math.round(to * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(f) }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <b>{String(n).padStart(2, '0')}</b>
}

function Head({ kicker, title, to }) {
  return (
    <div className="sec-head2">
      <div><span className="kicker">{kicker}</span><h2>{title}</h2></div>
      {to && <Link to={to} className="more">Xem tất cả <Icon name="arrow" size={16} /></Link>}
    </div>
  )
}

export default function Home() {
  const meta = useMeta()
  const [home, setHome] = useState(null)
  const hero = useRef(null)
  useEffect(() => { api('/api/home').then(setHome).catch(() => setHome({ popular: [], fixes: [], beginner: [] })) }, [])
  const cats = (p) => Object.entries(meta?.categories || {}).filter(([k]) => meta.counts[`${p}:${k}`])
  const tilt = (e) => {
    const r = hero.current.getBoundingClientRect()
    hero.current.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
    hero.current.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
  }
  return (
    <>
      <section className="hero2" ref={hero} onPointerMove={tilt}>
        <div className="fx"><i /><i /><i /></div>
        <div className="wrap hero2-in">
          <div className="hero2-copy">
            <span className="pill"><Icon name="sparkle" size={15} /> Trung tâm hướng dẫn · ENumber Chấm Công</span>
            <h1>Bạn cần <em>hỗ trợ</em><br />điều gì?</h1>
            <p className="hero2-sub">Mô tả vấn đề bằng lời của bạn. SupportFlow tìm đúng bài và mở đúng bước cần làm.</p>
            <SearchBox big />
            <div className="stats">
              <div><Count to={meta?.total} /><span>bài hướng dẫn</span></div>
              <div><Count to={meta?.steps} /><span>bước có hình minh hoạ</span></div>
              <div><Count to={2} /><span>nền tảng Mobile & Web</span></div>
            </div>
          </div>
          <HeroPhone />
        </div>
        <div className="mq">
          <div className="mq-track">
            {[0, 1].map((k) => ASKS.map((a) => (
              <Link key={k + a} to={`/huong-dan?q=${encodeURIComponent(a)}`} aria-hidden={k === 1} tabIndex={k === 1 ? -1 : undefined}>
                <Icon name="search" size={14} /> {a}
              </Link>
            )))}
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="bento">
          <Reveal className="tile t-mobile spot">
            <span className="deco d1" /><span className="deco d2" />
            <span className="tile-ico"><Icon name="phone" size={26} /></span>
            <span className="tile-n">{String(meta?.counts?.mobile || 0).padStart(2, '0')}<small>bài</small></span>
            <h2><Link to="/huong-dan?platform=mobile">Mobile App <Icon name="arrow" size={22} /></Link></h2>
            <p>Cài đặt, đăng nhập, đăng ký khuôn mặt, chấm công và đăng ký công tác ngay trên điện thoại.</p>
            <div className="tchips">{cats('mobile').map(([k, l]) => <Link key={k} to={`/huong-dan?platform=mobile&category=${k}`}>{l}</Link>)}</div>
          </Reveal>
          <Reveal className="tile t-web spot" delay={90}>
            <span className="deco w1" />
            <span className="tile-ico"><Icon name="monitor" size={26} /></span>
            <span className="tile-n">{String(meta?.counts?.web || 0).padStart(2, '0')}<small>bài</small></span>
            <h2><Link to="/huong-dan?platform=web">Web App <Icon name="arrow" size={22} /></Link></h2>
            <p>Đăng nhập, quản lý, thống kê, báo cáo và phê duyệt trên máy tính.</p>
            <div className="tchips">{cats('web').map(([k, l]) => <Link key={k} to={`/huong-dan?platform=web&category=${k}`}>{l}</Link>)}</div>
          </Reveal>
          <Reveal className="tile t-wiz">
            <span className="kicker">Chẩn đoán nhanh</span>
            <Wizard />
          </Reveal>
          {home?.beginner.length > 0 && (
            <Reveal className="tile t-path" delay={90}>
              <span className="kicker">Người mới bắt đầu</span>
              <h3>Lộ trình {home.beginner.length} bài để dùng thành thạo</h3>
              <ol>
                {home.beginner.map((g, i) => (
                  <li key={g.slug}><Link to={guideUrl(g.slug)}><i>{i + 1}</i><span><b>{g.title}</b><em>{g.steps_count} bước · {g.platform === 'web' ? 'Web' : 'Mobile'}</em></span><Icon name="arrow" size={17} /></Link></li>
                ))}
              </ol>
            </Reveal>
          )}
        </div>

        {home?.popular.length > 0 && (
          <section className="sec2">
            <Head kicker="Phổ biến" title="Hướng dẫn được xem nhiều" to="/huong-dan" />
            <div className="grid4">{home.popular.map((g, i) => <Reveal key={g.slug} delay={i * 70}><GuideCard g={g} /></Reveal>)}</div>
          </section>
        )}
        {home?.fixes.length > 0 && (
          <section className="sec2">
            <Head kicker="Gỡ rối" title="Lỗi thường gặp" to="/khac-phuc-loi" />
            <div className="frows">
              {home.fixes.map((g, i) => (
                <Reveal key={g.slug} delay={i * 60}>
                  <Link to={guideUrl(g.slug)} className="frow spot">
                    <i>{String(i + 1).padStart(2, '0')}</i>
                    <span><b>{g.title}</b><em>{g.summary}</em></span>
                    <PlatformTag p={g.platform} />
                    <u><Icon name="arrow" size={20} /></u>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
