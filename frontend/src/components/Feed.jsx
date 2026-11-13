import { fmtDate, fmtSize, LEVELS } from '../api.js'
import Icon from '../icons.jsx'

export function NewsItem({ a, compact }) {
  return (
    <article className={`news ${a.level}${compact ? ' compact' : ''}`}>
      <div className="news-meta">
        <span className={`lv ${a.level}`}>{LEVELS[a.level] || LEVELS.info}</span>
        {a.pinned ? <span className="pinned"><Icon name="pin" size={13} /> Ghim</span> : null}
        <time>{fmtDate(a.created_at)}</time>
      </div>
      <h3>{a.title}</h3>
      {a.body && <p>{a.body}</p>}
    </article>
  )
}

export function DocRow({ d }) {
  return (
    <a className="doc spot" href={`/api/documents/${d.id}/download`} download={d.filename}>
      <span className={`doc-ext ${d.ext}`}>{d.ext.toUpperCase()}</span>
      <span className="doc-txt"><b>{d.title}</b><em>{d.description || d.filename}</em></span>
      <span className="doc-size">{fmtSize(d.size)}</span>
      <u><Icon name="download" size={19} /></u>
    </a>
  )
}
