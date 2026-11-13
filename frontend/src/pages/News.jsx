import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { NewsItem } from '../components/Feed.jsx'

export default function News() {
  const [items, setItems] = useState(null)
  useEffect(() => { api('/api/announcements').then(setItems).catch(() => setItems([])) }, [])
  return (
    <>
      <section className="band">
        <div className="fx"><i /><i /></div>
        <div className="wrap"><span className="kicker">Mới nhất</span><h1>Thông báo</h1>
          <p className="lead">Lịch bảo trì, phiên bản mới và các lưu ý khi sử dụng ENumber Chấm Công.</p></div>
      </section>
      <div className="wrap page-narrow">
        {items?.length === 0 && <div className="empty"><b>Hiện chưa có thông báo nào.</b></div>}
        <div className="feed">{items?.map((a) => <NewsItem key={a.id} a={a} />)}</div>
      </div>
    </>
  )
}
