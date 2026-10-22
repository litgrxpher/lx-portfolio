import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { series } from '../data/series'
import { Words, FadeUp } from '../components/Reveal'
import SayHello from '../components/SayHello'

const ease = [0.2, 0.7, 0.2, 1]
const mod = (a, n) => ((a % n) + n) % n
const pad = (n) => String(n).padStart(2, '0')

const slide = {
  enter: (d) => ({ x: d * 120, opacity: 0, scale: 1.06, filter: 'grayscale(1)' }),
  center: { x: 0, opacity: 1, scale: 1, filter: 'grayscale(0)' },
  exit: (d) => ({ x: d * -120, opacity: 0, scale: 0.96, filter: 'grayscale(1)' }),
}
const firstLook = { x: 0, opacity: 0, scale: 1.12, filter: 'grayscale(1)' }

function Media({ it, className, ...rest }) {
  if (it.type === 'video') {
    return (
      <motion.video className={className} src={it.src} muted loop autoPlay playsInline preload="metadata" {...rest} />
    )
  }
  return <motion.img className={className} src={it.src} alt={it.caption || it.series.title} draggable={false} {...rest} />
}

// The big viewer: cursor-following tilt and glare, slides between frames
function Viewer({ items, active, dir, go }) {
  const it = items[active]
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const rotY = useSpring(useTransform(mx, [0, 1], [9, -9]), { stiffness: 140, damping: 18 })
  const rotX = useSpring(useTransform(my, [0, 1], [-7, 7]), { stiffness: 140, damping: 18 })
  const gx = useTransform(mx, (v) => `${v * 100}%`)
  const gy = useTransform(my, (v) => `${v * 100}%`)
  const glare = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.2), transparent 55%)`

  return (
    <div
      className="sr-view"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        mx.set((e.clientX - r.left) / r.width)
        my.set((e.clientY - r.top) / r.height)
      }}
      onPointerLeave={() => {
        mx.set(0.5)
        my.set(0.5)
      }}
    >
      <motion.div className="sr-frame" style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 1200 }}>
        <AnimatePresence initial={false} custom={dir}>
          <Media
            key={it.id}
            it={it}
            className="sr-media"
            custom={dir}
            variants={slide}
            initial={dir === 0 ? firstLook : 'enter'}
            animate="center"
            exit="exit"
            transition={{ duration: dir === 0 ? 1.3 : 0.65, ease }}
          />
        </AnimatePresence>
        <motion.span className="sr-glare" style={{ background: glare }} aria-hidden="true" />
      </motion.div>
      <div className="sr-ctrl">
        <button onClick={() => go(-1)} aria-label="Previous" data-cursor="Prev">←</button>
        <span>{pad(active + 1)} / {pad(items.length)}</span>
        <button onClick={() => go(1)} aria-label="Next" data-cursor="Next">→</button>
      </div>
      <p className="sr-cap">{it.caption}</p>
    </div>
  )
}

// A card in the scrolling contact sheet, drifting at its own speed
function Card({ it, k, onPick }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const spread = [36, 0, 64][k % 3]
  const y = useTransform(scrollYProgress, [0, 1], [spread, -spread])
  return (
    <motion.button
      ref={ref}
      className="sr-card"
      style={{ y }}
      initial={{ opacity: 0, clipPath: 'inset(14% 0 0 0)' }}
      whileInView={{ opacity: 1, clipPath: 'inset(0% 0 0 0)' }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.9, ease }}
      onClick={() => onPick(k)}
      data-cursor="View"
      aria-label={`Show frame ${k + 1}`}
    >
      {it.type === 'video' ? (
        <video src={it.src} muted loop autoPlay playsInline preload="metadata" />
      ) : (
        <img src={it.src} alt="" loading="lazy" />
      )}
      <span>{pad(k + 1)}</span>
    </motion.button>
  )
}

export default function Series() {
  const { slug, n } = useParams()
  const si = series.findIndex((s) => s.slug === slug)
  const s = series[si]
  const items = s ? s.items : []
  const count = items.length
  const startIdx = Math.min(Math.max((parseInt(n, 10) || 1) - 1, 0), Math.max(count - 1, 0))
  const [active, setActive] = useState(startIdx)
  const [dir, setDir] = useState(0)
  const stripRef = useRef(null)

  const go = (d) => {
    setDir(d)
    setActive((v) => mod(v + d, count))
  }
  const jump = (k) => {
    setDir(k >= active ? 1 : -1)
    setActive(k)
    if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.1 })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!count) return
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  useEffect(() => {
    if (!s) return
    window.history.replaceState(window.history.state, '', `/series/${s.slug}/${active + 1}`)
    const el = stripRef.current && stripRef.current.children[active]
    if (el && el.scrollIntoView) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [active, s])

  if (!s || !count) return <Navigate to="/archive" replace />

  const photos = items.filter((i) => i.type === 'image').length
  const videos = count - photos
  const frames = [
    photos ? `${photos} photo${photos > 1 ? 's' : ''}` : '',
    videos ? `${videos} video${videos > 1 ? 's' : ''}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const rows = [
    ['Location', s.location],
    ['Date', s.date],
    ['Type', s.category],
    ['Frames', frames],
    ...Object.entries(s.details),
  ].filter(([, v]) => v)
  const next = series.length > 1 ? series[(si + 1) % series.length] : null
  const cover = next && (next.items.find((i) => i.type === 'image') || next.items[0])

  return (
    <article className="view sr">
      <div className="sr-top">
        <Link to="/archive" className="back-link" data-cursor="Back">← Back to archive</Link>
        <span>Series {pad(si + 1)} / {pad(series.length)}</span>
      </div>

      <section className="sr-hero">
        <div className="sr-text">
          {s.location && <p className="sr-where">{s.location}</p>}
          <h1 className="sr-title"><Words text={s.title} /></h1>
          {s.description && <FadeUp as="p" className="lead" delay={0.25}>{s.description}</FadeUp>}
          <FadeUp delay={0.35}>
            <dl className="meta">
              {rows.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
              <div>
                <dt>More</dt>
                <dd><a href={s.link} target="_blank" rel="noopener noreferrer">Behance ↗</a></dd>
              </div>
            </dl>
          </FadeUp>
        </div>
        <Viewer items={items} active={active} dir={dir} go={go} />
      </section>

      <div className="sr-strip" ref={stripRef}>
        {items.map((m, k) => (
          <button
            key={m.id}
            className={'sr-thumb' + (k === active ? ' on' : '')}
            onClick={() => jump(k)}
            aria-label={`Show frame ${k + 1}`}
            aria-current={k === active ? 'true' : undefined}
            data-cursor="View"
          >
            {m.type === 'video' ? (
              <video src={m.src} muted playsInline preload="metadata" />
            ) : (
              <img src={m.src} alt="" loading="lazy" />
            )}
            <span>{pad(k + 1)}</span>
          </button>
        ))}
      </div>

      <section className="sr-sheet" aria-label="All frames">
        {items.map((m, k) => (
          <Card key={m.id} it={m} k={k} onPick={jump} />
        ))}
      </section>

      {next && (
        <Link className="sr-next" to={`/series/${next.slug}/1`} data-cursor="Next">
          <span>
            <small>Next series</small>
            <b>{next.title}</b>
            {next.location && <em>{next.location}</em>}
          </span>
          <span className="sr-next-r">
            {cover && cover.type === 'image' && <img src={cover.src} alt="" />}
            <i>→</i>
          </span>
        </Link>
      )}

      <SayHello />
    </article>
  )
}
