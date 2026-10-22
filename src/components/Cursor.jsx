import { useEffect, useRef, useState } from 'react'

// Custom cursor: a dot plus a lagging ring that grows on links and shows labels
// (any element with data-cursor="Label"). Only runs on devices with a real mouse.
export default function Cursor() {
  const dot = useRef(null)
  const ring = useRef(null)
  const [label, setLabel] = useState('')
  const [link, setLink] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const root = document.documentElement
    root.classList.add('has-cursor')

    let x = -100,
      y = -100,
      rx = -100,
      ry = -100,
      raf = 0,
      curLabel = '',
      curLink = false

    const move = (e) => {
      x = e.clientX
      y = e.clientY
      const t = e.target.closest ? e.target.closest('[data-cursor]') : null
      const l = t ? t.dataset.cursor : ''
      const isLink = !!(e.target.closest && e.target.closest('a,button'))
      if (l !== curLabel) {
        curLabel = l
        setLabel(l)
      }
      if (isLink !== curLink) {
        curLink = isLink
        setLink(isLink)
      }
    }
    const loop = () => {
      rx += (x - rx) * 0.18
      ry += (y - ry) * 0.18
      if (dot.current) dot.current.style.transform = `translate3d(${x}px,${y}px,0)`
      if (ring.current)
        ring.current.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', move)
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
      root.classList.remove('has-cursor')
    }
  }, [])

  return (
    <>
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
      <div
        ref={ring}
        className={'cursor-ring' + (label ? ' has-label' : link ? ' is-link' : '')}
        aria-hidden="true"
      >
        {label}
      </div>
    </>
  )
}
