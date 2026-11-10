import { useEffect, useState } from 'react'
import { api } from '../api.js'
import GuideCard from '../components/GuideCard.jsx'
import Wizard from '../components/Wizard.jsx'

export default function Fix() {
  const [items, setItems] = useState(null)
  useEffect(() => { api('/api/guides?kind=fix').then(setItems).catch(() => setItems([])) }, [])
  return (
    <>
    <section className="band">
      <div className="fx"><i /><i /></div>
      <div className="wrap">
        <span className="kicker">Gỡ rối</span>
        <h1>Khắc phục lỗi</h1>
        <p className="lead">Chọn hiện tượng bạn đang gặp, hệ thống sẽ đưa bạn tới đúng bước xử lý.</p>
      </div>
    </section>
    <div className="wrap narrow-top">
      <div className="tile t-wiz"><Wizard /></div>
      <section className="sec">
        <div className="sec-head"><h2>Tất cả bài khắc phục lỗi</h2></div>
        {items?.length === 0 && <p className="muted">Chưa có bài nào.</p>}
        <div className="grid2">{items?.map((g) => <GuideCard key={g.slug} g={g} compact />)}</div>
      </section>
    </div>
    </>
  )
}
