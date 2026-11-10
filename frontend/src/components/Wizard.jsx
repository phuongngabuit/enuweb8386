import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, guideUrl } from '../api.js'
import Icon from '../icons.jsx'
import { PlatformTag } from './GuideCard.jsx'

/** Chẩn đoán theo triệu chứng: chọn hiện tượng -> chọn tình huống -> tới đúng bước xử lý. */
export default function Wizard() {
  const [list, setList] = useState([])
  const [cur, setCur] = useState(null)
  useEffect(() => { api('/api/symptoms').then(setList).catch(() => {}) }, [])
  if (!list.length) return null
  return (
    <div className="card wiz">
      <div className="wiz-head">
        <span className="wiz-step">{cur ? '2' : '1'}/2</span>
        <h3>{cur ? cur.label : 'Bạn đang gặp hiện tượng nào?'}</h3>
        {cur && <button className="link" onClick={() => setCur(null)}><Icon name="back" size={15} /> Chọn lại</button>}
      </div>
      {!cur ? (
        <div className="wiz-opts">
          {list.map((s) => (
            <button key={s.id} onClick={() => setCur(s)}>
              <span>{s.label}</span><PlatformTag p={s.platform} /><Icon name="arrow" size={16} />
            </button>
          ))}
        </div>
      ) : (
        <div className="wiz-opts">
          <p className="muted">Chọn tình huống giống của bạn nhất:</p>
          {cur.causes.map((c, i) => (
            <Link key={i} to={guideUrl(c.guide, c.step)}>
              <span>{c.label}</span><em>Xem cách xử lý</em><Icon name="arrow" size={16} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
