import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'

// Buttery scrolling on desktop content pages (About, project pages).
// Touch devices use the browser's native 120Hz/60Hz compositor momentum scrolling.
export default function SmoothScroll() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname === '/') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Never intercept touch on mobile devices; mobile engines already have native momentum
    const isTouch =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches ||
       'ontouchstart' in window ||
       navigator.maxTouchPoints > 0)
    if (isTouch) return

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
