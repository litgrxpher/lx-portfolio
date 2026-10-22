import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { projects } from '../data/projects'
import { site } from '../data/site'
import { Words, FadeUp } from '../components/Reveal'
import SayHello from '../components/SayHello'

function Float({ p, className, range }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], range)
  return (
    <motion.div ref={ref} className={'ab-img ' + className} style={{ y }} data-cursor="View">
      <div className="tilt">
        <img src={p.src} alt="" />
      </div>
    </motion.div>
  )
}

export default function About() {
  const n = projects.length
  const pick = (i) => projects[i % n]
  const words = ['Design', 'Video', 'Photography', 'Engineering']

  return (
    <article className="view about">
      <p className="crumb">About</p>
      <div className="ab">
        <div className="ab-text">
          <h1 className="ab-title">
            <Words text="Logic by day," />
            <br />
            <Words text="pictures by night." delay={0.2} />
          </h1>
          <FadeUp as="p" className="lead" delay={0.3}>{site.about}</FadeUp>
          <FadeUp delay={0.4}>
            <dl className="meta">
              <div><dt>Work</dt><dd>Design, video, photography</dd></div>
              <div><dt>Portfolio</dt><dd><a href={site.behance} target="_blank" rel="noopener noreferrer">Behance ↗</a></dd></div>
              <div>
                <dt>Elsewhere</dt>
                <dd>
                  <a href={site.instagram} target="_blank" rel="noopener noreferrer">Instagram ↗</a>{' '}
                  <a href={site.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
                </dd>
              </div>
            </dl>
          </FadeUp>
        </div>
        {n > 0 && (
          <div className="ab-art" aria-hidden="true">
            <Float p={pick(2)} className="a0" range={['6%', '-10%']} />
            <Float p={pick(8)} className="a1" range={['14%', '-18%']} />
            <Float p={pick(13)} className="a2" range={['2%', '-6%']} />
          </div>
        )}
      </div>

      <div className="marq" aria-hidden="true">
        <div className="marq-track">
          {[...words, ...words, ...words, ...words].map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      </div>

      <SayHello />
    </article>
  )
}
