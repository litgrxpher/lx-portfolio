import { useRef } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { projects } from '../data/projects'
import { site } from '../data/site'
import { Words, FadeUp } from '../components/Reveal'
import SayHello from '../components/SayHello'

const ease = [0.2, 0.7, 0.2, 1]

export default function Project() {
  const { slug } = useParams()
  const idx = projects.findIndex((p) => p.slug === slug)
  const bigRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: bigRef, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-9%', '9%'])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.18, 1.1, 1.18])

  if (idx < 0) return <Navigate to="/archive" replace />
  const p = projects[idx]
  const next = projects[(idx + 1) % projects.length]
  const pad = (n) => String(n).padStart(2, '0')

  return (
    <article className="view">
      <Link to="/archive" className="back-link" data-cursor="Back">← Back to archive</Link>
      <p className="crumb">{p.category}{p.year ? ` · ${p.year}` : ''}</p>

      <div className="vtop">
        <div>
          <motion.div
            className="frame"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            transition={{ duration: 1, ease }}
          >
            <img src={p.src} alt={p.title} />
          </motion.div>
          <p className="fr">Frame {pad(idx + 1)} of {pad(projects.length)}</p>
        </div>
        <FadeUp delay={0.2}>
          <dl className="meta">
            <div><dt>Category</dt><dd>{p.category}</dd></div>
            {p.year && <div><dt>Year</dt><dd>{p.year}</dd></div>}
            <div>
              <dt>More work</dt>
              <dd>
                <a href={p.link} target="_blank" rel="noopener noreferrer">Behance ↗</a>
                {' '}
                <a href={site.instagram} target="_blank" rel="noopener noreferrer">Instagram ↗</a>
              </dd>
            </div>
          </dl>
          {p.note && <p className="lead">{p.note}</p>}
        </FadeUp>
      </div>

      <h1 className="vtitle"><Words text={p.title} /></h1>

      <div ref={bigRef} className="big-frame">
        <motion.img src={p.src} alt="" style={{ y, scale }} />
      </div>

      <Link className="next" to={`/work/${next.slug}`} data-cursor="Next">
        <span>
          <small>Next project</small>
          <b>{next.title}</b>
        </span>
        <span className="next-r">
          <img src={next.src} alt="" />
          <i>→</i>
        </span>
      </Link>

      <SayHello />
    </article>
  )
}
