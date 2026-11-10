import { useEffect, useRef } from 'react'

/** Hiện dần khi cuộn tới. Tôn trọng "giảm chuyển động" của hệ điều hành (xử lý trong CSS). */
export default function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...rest }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!('IntersectionObserver' in window)) { el.classList.add('in'); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect() } }, { rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <Tag ref={ref} className={`rv ${className}`} style={delay ? { '--d': `${delay}ms` } : undefined} {...rest}>{children}</Tag>
}
