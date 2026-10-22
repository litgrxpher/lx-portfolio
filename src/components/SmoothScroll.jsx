import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'

// Buttery scrolling on the content pages (About, project pages).
// The home and archive screens handle their own wheel and drag input.
export default function SmoothScroll() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname === '/' || pathname === '/archive') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
    let raf = 0
    const loop = (t) => {
      lenis.raf(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [pathname])

  return null
}
