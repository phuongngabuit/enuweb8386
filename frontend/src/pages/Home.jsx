import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import Icon from '../icons.jsx'
import { useMeta } from '../App.jsx'
import SearchBox from '../components/SearchBox.jsx'
import GuideCard from '../components/GuideCard.jsx'
import Wizard from '../components/Wizard.jsx'

const GROUPS = {
  mobile: { icon: 'phone', title: 'Mobile App', desc: 'Cài đặt, đăng nhập, đăng ký khuôn mặt, chấm công, đăng ký công tác.' },
  web: { icon: 'monitor', title: 'Web App', desc: 'Đăng nhập, quản lý, thống kê, báo cáo và phê duyệt.' },
}

function Section({ title, to, children }) {
  return (
    <section className="sec">
      <div className="sec-head"><h2>{title}</h2>{to && <Link to={to}>Xem tất cả <Icon name="arrow" size={15} /></Link>}</div>
      {children}
    </section>
  )
}

export default function Home() {
  const meta = useMeta()
  const [home, setHome] = useState(null)
  useEffect(() => { api('/api/home').then(setHome).catch(() => setHome({ popular: [], fixes: [], beginner: [] })) }, [])
  const cats = (p) => Object.entries(meta?.categories || {}).filter(([k]) => meta.counts[`${p}:${k}`])
  return (
    <>
      <section className="hero">
        <div className="wrap hero-in">
          <p className="eyebrow">Trung tâm hướng dẫn ENumber Chấm Công</p>
          <h1>Bạn cần hỗ trợ điều gì?</h1>
          <SearchBox big />
        </div>
      </section>
      <div className="wrap">
        <div className="grid2 lift">
          {Object.entries(GROUPS).map(([p, g]) => (
            <div key={p} className="card pcard">
              <Link to={`/huong-dan?platform=${p}`} className="pcard-top">
                <span className={`pico ${p}`}><Icon name={g.icon} size={26} /></span>
                <div><h2>{g.title}</h2><p>{g.desc}</p></div>
                <span className="count">{meta?.counts?.[p] || 0} bài</span>
              </Link>
              <div className="chips">
                {cats(p).map(([k, label]) => <Link key={k} to={`/huong-dan?platform=${p}&category=${k}`}>{label}</Link>)}
              </div>
            </div>
          ))}
        </div>

        <Section title="Chẩn đoán nhanh theo triệu chứng" to="/khac-phuc-loi"><Wizard /></Section>

        {home?.popular.length > 0 && (
          <Section title="Hướng dẫn được xem nhiều" to="/huong-dan">
            <div className="grid4">{home.popular.map((g) => <GuideCard key={g.slug} g={g} />)}</div>
          </Section>
        )}
        {home?.fixes.length > 0 && (
          <Section title="Lỗi thường gặp" to="/khac-phuc-loi">
            <div className="grid2">{home.fixes.map((g) => <GuideCard key={g.slug} g={g} compact />)}</div>
          </Section>
        )}
        {home?.beginner.length > 0 && (
          <Section title="Dành cho người mới">
            <ol className="path">
              {home.beginner.map((g, i) => (
                <li key={g.slug}><Link to={`/huong-dan/${g.slug}`}><span>{i + 1}</span><b>{g.title}</b><em>{g.steps_count} bước</em></Link></li>
              ))}
            </ol>
          </Section>
        )}
      </div>
    </>
  )
}
