import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { allItems } from '../data/series'
import { site } from '../data/site'
import { Words, FadeUp } from '../components/Reveal'
import SayHello from '../components/SayHello'

function Float({ p, className, range }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], range)
  return (
    <motion.div ref={ref} className={'ab-img ' + className} style={{ y }}>
      <div className="tilt">
        <img src={p.src} alt="" decoding="async" />
      </div>
    </motion.div>
  )
}

export default function About() {
  const aboutImage = allItems.find(
    (item) => item.file === 'IMG_6884_SnapseedCopy_SnapseedCopy.jpg'
  )
  const words = ['Design', 'Video', 'Photography', 'Engineering']

  return (
    <article className="view about">
      <p className="crumb">About</p>
      <div className="ab">
        <div className="ab-text">
          <h1 className="ab-title">
            <Words text="Querying data by day," />
            <br />
            <Words text="Framing stories by night." delay={0.2} />
          </h1>
          <FadeUp as="p" className="lead" delay={0.3}>{site.about}</FadeUp>
          <FadeUp delay={0.4}>
            <dl className="meta">
              <div><dt>Work</dt><dd>Data, Video, Photography</dd></div>
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
        {aboutImage && (
          <div className="ab-art" aria-hidden="true">
            <Float p={aboutImage} className="about-feature" range={['6%', '-10%']} />
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

      <section className="resume" aria-labelledby="resume-title">
        <div>
          <p className="resume-label">A little more on paper</p>
          <h2 id="resume-title" className="resume-title">Resume</h2>
          <p className="resume-copy">Explore my experience, education, and skills.</p>
        </div>
        <div className="resume-actions">
          <a href="/Resume.pdf" target="_blank" rel="noopener noreferrer">View resume <span aria-hidden="true">↗</span></a>
          <a href="/Resume.pdf" download="Adharsh-CS-Resume.pdf">Download PDF <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <SayHello />
    </article>
  )
}
