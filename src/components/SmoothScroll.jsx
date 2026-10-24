import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'

// Buttery scrolling on the content pages (About, project pages).
// The home screen handles its own wheel and drag input.
export default function SmoothScroll() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname === '/') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
    window.__lenis = lenis
    let raf = 0
    const loop = (t) => {
      lenis.raf(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      delete window.__lenis
      lenis.destroy()
    }
  }, [pathname])

  return null
}
