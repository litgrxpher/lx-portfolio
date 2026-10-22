import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Chars } from '../components/Reveal'
import { projects } from '../data/projects'
import { site } from '../data/site'

const ORB_N = Math.min(9, projects.length)

export default function Home() {
  const navigate = useNavigate()
  const orbs = useRef([])
  const picks = useMemo(
    () => Array.from({ length: ORB_N }, (_, k) => projects[Math.floor((k * projects.length) / ORB_N)]),
    []
  )

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let ang = 0,
      px = 0,
      py = 0,
      tpx = 0,
      tpy = 0,
      raf = 0,
      locked = false

    const tick = () => {
      if (!reduce) ang += 0.0007
      px += (tpx - px) * 0.06
      py += (tpy - py) * 0.06
      const W = window.innerWidth
      const H = window.innerHeight
      const rx = W * 0.28
      const ry = H * 0.3
      const ow = Math.max(84, Math.min(190, W * 0.11))
      const oh = ow * 1.25
      orbs.current.forEach((el, k) => {
        if (!el) return
        const a = ang + (k * 2 * Math.PI) / ORB_N
        const c = Math.cos(a)
        const s = Math.sin(a)
        const d = (s + 1) / 2
        const x = W / 2 + c * rx + px * (18 + d * 26)
        const y = H / 2 + s * ry + py * (12 + d * 18)
        const tilt = (((k * 47) % 9) - 4) * 1.6
        const st = el.style
        st.width = ow + 'px'
        st.height = oh + 'px'
        st.transform = `translate3d(${x - ow / 2}px,${y - oh / 2}px,0) rotateY(${-c * 26}deg) rotateX(${s * 8}deg) rotate(${tilt}deg) scale(${0.72 + 0.34 * d})`
        st.opacity = 0.35 + 0.65 * d
        st.zIndex = Math.round(d * 10)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const go = () => {
      if (locked) return
      locked = true
      navigate('/archive')
    }
    const onWheel = (e) => {
      if (e.deltaY > 18 || Math.abs(e.deltaX) > 40) go()
    }
    let touchY = null
    const onTouchStart = (e) => {
      touchY = e.touches[0].clientY
    }
    const onTouchEnd = (e) => {
      if (touchY !== null && touchY - e.changedTouches[0].clientY > 50) go()
      touchY = null
    }
    const onKey = (e) => {
      if (!['ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) return
      if (e.target.closest && e.target.closest('a,button')) return
      e.preventDefault()
      go()
    }
    const onMove = (e) => {
      tpx = (e.clientX / window.innerWidth - 0.5) * 2
      tpy = (e.clientY / window.innerHeight - 0.5) * 2
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointermove', onMove)
    }
  }, [navigate])

  return (
    <section className="home" aria-label="Intro">
      <div className="ring" aria-hidden="true">
        {picks.map((p, k) => (
          <span key={p.id} className="orb" ref={(el) => (orbs.current[k] = el)}>
            <img src={p.src} alt="" draggable={false} decoding="async" />
          </span>
        ))}
      </div>
      <h1 className="hname" aria-label={site.name}>
        <span className="l"><Chars text={site.first} delay={0.15} /></span>
        <span className="r"><Chars text={site.last} delay={0.6} /></span>
      </h1>
      <motion.p
        className="role"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
      >
        {site.role}
      </motion.p>
      <motion.div
        className="enter-wrap"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <Link className="enter" to="/archive" data-cursor="Enter">
          Scroll to enter the archive <i>↓</i>
        </Link>
      </motion.div>
    </section>
  )
}
