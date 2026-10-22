import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { allItems } from '../data/series'
import { site } from '../data/site'

const imgs = allItems.filter((item) => item.type === 'image')

export default function Home() {
  const navigate = useNavigate()
  const orbs = useRef([])
  const orbCount =
    typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches
      ? Math.min(5, imgs.length)
      : Math.min(9, imgs.length)
  const picks = useMemo(
    () => Array.from({ length: orbCount }, (_, k) => imgs[Math.floor((k * imgs.length) / orbCount)]),
    [orbCount]
  )

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
    const animate = !reduce && !touch
    let ang = 0
    let px = 0
    let py = 0
    let tpx = 0
    let tpy = 0
    let raf = 0
    let locked = false
    const tick = () => {
      if (animate) ang += 0.0007
      px += (tpx - px) * 0.06
      py += (tpy - py) * 0.06
      const width = window.innerWidth
      const height = window.innerHeight
      const rx = width * 0.32
      const ry = height * 0.32
      const orbWidth = Math.max(84, Math.min(220, width * 0.13))
      const orbHeight = orbWidth * 1.25
      orbs.current.forEach((el, k) => {
        if (!el) return
        const angle = ang + (k * 2 * Math.PI) / orbCount
        const cosine = Math.cos(angle)
        const sine = Math.sin(angle)
        const depth = (sine + 1) / 2
        const x = width / 2 + cosine * rx + px * (18 + depth * 26)
        const y = height / 2 + sine * ry + py * (12 + depth * 18)
        const tilt = (((k * 47) % 9) - 4) * 1.6
        const style = el.style
        style.width = `${orbWidth}px`
        style.height = `${orbHeight}px`
        style.transform = `translate3d(${x - orbWidth / 2}px,${y - orbHeight / 2}px,0) rotateY(${-cosine * 26}deg) rotateX(${sine * 8}deg) rotate(${tilt}deg) scale(${0.72 + 0.34 * depth})`
        style.opacity = `${0.35 + 0.65 * depth}`
        style.zIndex = `${Math.round(depth * 10)}`
      })
      if (animate) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const go = () => {
      if (locked) return
      locked = true
      navigate('/archive')
    }
    const onWheel = (event) => {
      if (event.deltaY > 18 || Math.abs(event.deltaX) > 40) go()
    }
    let touchY = null
    const onTouchStart = (event) => {
      touchY = event.touches[0].clientY
    }
    const onTouchEnd = (event) => {
      if (touchY !== null && touchY - event.changedTouches[0].clientY > 50) go()
      touchY = null
    }
    const onKey = (event) => {
      if (!['ArrowDown', 'PageDown', ' ', 'Enter'].includes(event.key)) return
      if (event.target.closest && event.target.closest('a,button')) return
      event.preventDefault()
      go()
    }
    const onMove = (event) => {
      tpx = (event.clientX / window.innerWidth - 0.5) * 2
      tpy = (event.clientY / window.innerHeight - 0.5) * 2
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('keydown', onKey)
    if (!touch) window.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
      if (!touch) window.removeEventListener('pointermove', onMove)
    }
  }, [navigate, orbCount])

  return (
    <section className="home" aria-label="Intro">
      <div className="ring" aria-hidden="true">
        {picks.map((item, index) => (
          <span key={item.id} className="orb" ref={(el) => (orbs.current[index] = el)}>
            <img
              src={item.src}
              alt=""
              draggable={false}
              decoding="async"
              loading={index < 3 ? 'eager' : 'lazy'}
            />
          </span>
        ))}
      </div>
      <div className="home-frame" aria-hidden="true">
        <span>PORTFOLIO <i> / </i> 2026</span>
        <span className="home-frame-side">MOMENTS IN FRAME</span>
      </div>
      <div className="home-intro">
        <p className="home-kicker">Selected work <i>—</i> Personal archive</p>
        <h1><span>{site.first}</span><span className="home-name-last">{site.last}</span></h1>
      </div>
      <Link className="enter" to="/archive" data-cursor="Enter">
        Enter archive <i aria-hidden="true">↓</i>
      </Link>
    </section>
  )
}
