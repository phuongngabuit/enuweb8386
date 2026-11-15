import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, guideUrl } from '../api.js'
import Icon from '../icons.jsx'
import { useMeta } from '../App.jsx'
import SearchBox from '../components/SearchBox.jsx'
import Wizard from '../components/Wizard.jsx'
import { NewsItem, DocRow } from '../components/Feed.jsx'

const GROUPS = {
  mobile: { icon: 'phone', title: 'Mobile App', desc: 'Cài đặt, đăng nhập, đăng ký khuôn mặt, chấm công, đăng ký công tác.' },
  web: { icon: 'monitor', title: 'Web App', desc: 'Đăng nhập, quản lý, thống kê, báo cáo và phê duyệt.' },
}

function LinkList({ items }) {
  return (
    <ul className="llist">
      {items.map((g) => (
        <li key={g.slug}>
          <Link to={guideUrl(g.slug)}>
            <Icon name={g.kind === 'fix' ? 'wrench' : 'book'} size={18} />
            <span>{g.title}</span>
            <em>{g.steps_count} bước · {g.platform === 'web' ? 'Web' : 'Mobile'}</em>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function Home() {
  const meta = useMeta()
  const [home, setHome] = useState(null)
  const [news, setNews] = useState([])
  const [docs, setDocs] = useState([])
  useEffect(() => {
    api('/api/home').then(setHome).catch(() => setHome({ popular: [], fixes: [], beginner: [] }))
    api('/api/announcements').then(setNews).catch(() => {})
    api('/api/documents').then(setDocs).catch(() => {})
  }, [])
  const cats = (p) => Object.entries(meta?.categories || {}).filter(([k]) => meta.counts[`${p}:${k}`])
  return (
    <>
      {news[0] && (
        <Link to="/thong-bao" className={`abar ${news[0].level}`}>
          <span className="wrap"><Icon name="bell" size={17} /><b>{news[0].title}</b><u>Xem chi tiết</u></span>
        </Link>
      )}
      <section className="hero3">
        <div className="wrap">
          <h1>Bạn cần hỗ trợ điều gì?</h1>
          <SearchBox big />
        </div>
      </section>

      <div className="wrap home">
        <section className="prods">
          {Object.entries(GROUPS).map(([p, g]) => (
            <div key={p} className="prod">
              <span className="prod-ico"><Icon name={g.icon} size={26} /></span>
              <h2><Link to={`/huong-dan?platform=${p}`}>{g.title}</Link></h2>
              <p>{g.desc}</p>
              <ul>{cats(p).map(([k, l]) => <li key={k}><Link to={`/huong-dan?platform=${p}&category=${k}`}>{l}</Link></li>)}</ul>
              <Link className="all" to={`/huong-dan?platform=${p}`}>Xem tất cả {meta?.counts?.[p] || 0} bài <Icon name="arrow" size={16} /></Link>
            </div>
          ))}
        </section>

        <section className="cols">
          {home?.popular.length > 0 && (
            <div><h2>Bài viết phổ biến</h2><LinkList items={home.popular} /><Link className="all" to="/huong-dan">Xem thư viện hướng dẫn <Icon name="arrow" size={16} /></Link></div>
          )}
          {home?.fixes.length > 0 && (
            <div><h2>Lỗi thường gặp</h2><LinkList items={home.fixes} /><Link className="all" to="/khac-phuc-loi">Xem tất cả bài khắc phục lỗi <Icon name="arrow" size={16} /></Link></div>
          )}
        </section>

        <section>
          <h2>Chẩn đoán theo triệu chứng</h2>
          <Wizard />
        </section>

        {home?.beginner.length > 0 && (
          <section>
            <h2>Dành cho người mới</h2>
            <ol className="starter">
              {home.beginner.map((g, i) => (
                <li key={g.slug}><Link to={guideUrl(g.slug)}><i>{i + 1}</i><span>{g.title}</span></Link></li>
              ))}
            </ol>
          </section>
        )}

        {(news.length > 0 || docs.length > 0) && (
          <section className="cols">
            {news.length > 0 && (
              <div><h2>Thông báo</h2><div className="feed">{news.slice(0, 2).map((a) => <NewsItem key={a.id} a={a} compact />)}</div>
                <Link className="all" to="/thong-bao">Xem tất cả thông báo <Icon name="arrow" size={16} /></Link></div>
            )}
            {docs.length > 0 && (
              <div><h2>Tài liệu tải về</h2><div className="feed">{docs.slice(0, 3).map((d) => <DocRow key={d.id} d={d} />)}</div>
                <Link className="all" to="/tai-lieu">Xem tất cả tài liệu <Icon name="arrow" size={16} /></Link></div>
            )}
          </section>
        )}
      </div>
    </>
  )
}
