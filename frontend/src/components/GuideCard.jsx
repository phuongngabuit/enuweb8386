import { Link } from 'react-router-dom'
import { guideUrl, media } from '../api.js'
import Icon from '../icons.jsx'

export function PlatformTag({ p }) {
  return <span className={`tag ${p}`}><Icon name={p === 'web' ? 'monitor' : 'phone'} size={13} />{p === 'web' ? 'Web' : 'Mobile'}</span>
}

export default function GuideCard({ g, compact }) {
  return (
    <Link to={guideUrl(g.slug)} className={`card gcard${compact ? ' compact' : ''}`}>
      {!compact && (
        <div className={`gthumb ${g.platform}`}>
          {g.thumb ? <img src={media(g.thumb)} alt="" loading="lazy" /> : <Icon name="book" size={36} />}
        </div>
      )}
      <div className="gbody">
        <div className="gtags">
          <PlatformTag p={g.platform} />
          {g.kind === 'fix' ? <span className="tag fix"><Icon name="wrench" size={13} />Khắc phục lỗi</span>
            : <span className="tag">{g.category_label}</span>}
        </div>
        <h3>{g.title}</h3>
        {!compact && <p>{g.summary}</p>}
        <div className="gmeta">
          <span><Icon name="steps" size={14} />{g.steps_count} bước</span>
          {g.has_video && <span><Icon name="play" size={12} />Có video</span>}
          {g.step && <span className="hit"><Icon name="target" size={13} />Khớp Bước {g.step.index + 1}</span>}
        </div>
      </div>
    </Link>
  )
}
