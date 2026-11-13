import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { DocRow } from '../components/Feed.jsx'

const TABS = [['', 'Tất cả'], ['mobile', 'Mobile App'], ['web', 'Web App']]

export default function Docs() {
  const [items, setItems] = useState(null)
  const [p, setP] = useState('')
  useEffect(() => { api('/api/documents').then(setItems).catch(() => setItems([])) }, [])
  const shown = items?.filter((d) => !p || d.platform === p || d.platform === 'all')
  return (
    <>
      <section className="band">
        <div className="fx"><i /><i /></div>
        <div className="wrap"><span className="kicker">Tải về</span><h1>Tài liệu</h1>
          <p className="lead">Sổ tay, biểu mẫu và tài liệu hướng dẫn đầy đủ để lưu hoặc in.</p></div>
      </section>
      <div className="wrap page-narrow">
        <div className="seg" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={p === k} className={p === k ? 'on' : ''} onClick={() => setP(k)}>{l}</button>)}</div>
        {shown?.length === 0 && <div className="empty"><b>Chưa có tài liệu nào trong mục này.</b></div>}
        <div className="feed">{shown?.map((d) => <DocRow key={d.id} d={d} />)}</div>
      </div>
    </>
  )
}
