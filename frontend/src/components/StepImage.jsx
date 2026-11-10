import { useRef, useState } from 'react'
import { media } from '../api.js'

/** Ảnh gốc giữ nguyên; điểm nhấn là lớp phủ CSS theo toạ độ tỉ lệ (0–1). */
export default function StepImage({ src, alt, hotspot, showHot = true, onZoom, onDraw, platform }) {
  const box = useRef(null)
  const [drag, setDrag] = useState(null)
  const pos = (e) => {
    const r = box.current.getBoundingClientRect()
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }
  }
  const rect = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) })
  const draw = onDraw ? {
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const p = pos(e); setDrag({ a: p, b: p }) },
    onPointerMove: (e) => drag && setDrag({ ...drag, b: pos(e) }),
    onPointerUp: () => { if (drag) { const r = rect(drag.a, drag.b); if (r.w > 0.02 && r.h > 0.02) onDraw(r); setDrag(null) } },
  } : {}
  const h = drag ? rect(drag.a, drag.b) : showHot ? hotspot : null
  return (
    <div className={`simg ${platform || ''}${onDraw ? ' drawing' : ''}`}>
      <div className="simg-box" ref={box} {...draw}
        onClick={onZoom && !onDraw ? onZoom : undefined} role={onZoom && !onDraw ? 'button' : undefined}
        tabIndex={onZoom && !onDraw ? 0 : undefined} onKeyDown={(e) => e.key === 'Enter' && onZoom && !onDraw && onZoom()}
        aria-label={onZoom && !onDraw ? 'Phóng to ảnh' : undefined}>
        <img src={media(src)} alt={alt || ""} draggable={false} />
        {h && (
          <span className="hot" style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, width: `${h.w * 100}%`, height: `${h.h * 100}%` }}>
            {h.label && <b className={h.y < 0.12 ? 'below' : ''}>Nhấn: {h.label}</b>}
          </span>
        )}
      </div>
    </div>
  )
}
