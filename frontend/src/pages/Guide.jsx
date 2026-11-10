import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import GuideView from '../components/GuideView.jsx'

export default function Guide() {
  const { slug } = useParams()
  const [g, setG] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    setG(null); setErr('')
    api(`/api/guides/${slug}`).then((d) => {
      setG(d); document.title = `${d.title} — SupportFlow`
      api(`/api/guides/${slug}/view`, { method: 'POST' }).catch(() => {})
    }).catch((e) => setErr(e.message))
    return () => { document.title = 'SupportFlow — Hướng dẫn ENumber Chấm Công' }
  }, [slug])
  if (err) return <div className="wrap empty"><h1>{err}</h1><Link className="btn" to="/huong-dan">Mở thư viện hướng dẫn</Link></div>
  if (!g) return <div className="wrap empty muted">Đang tải…</div>
  return <GuideView g={g} />
}
