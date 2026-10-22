import { useEffect, useRef } from 'react'

export default function Cursor() {
  const dot = useRef(null)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const root = document.documentElement
    root.classList.add('has-cursor')

    const move = (e) => {
      if (dot.current) {
        dot.current.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`
      }
    }

    window.addEventListener('pointermove', move)
    return () => {
      window.removeEventListener('pointermove', move)
      root.classList.remove('has-cursor')
    }
  }, [])

  return <div ref={dot} className="cursor-dot" aria-hidden="true" />
}
