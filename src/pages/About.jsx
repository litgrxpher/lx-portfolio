import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { allItems, series } from '../data/series'
import { site } from '../data/site'
import { Words, FadeUp } from '../components/Reveal'
import SayHello from '../components/SayHello'
import ApertureDial from '../components/ApertureDial'

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
  const photos = allItems.filter((item) => item.type === 'image')
  const featuredSeries =
    series
      .map((item) => ({ item, date: Date.parse(`1 ${item.date}`) }))
      .filter(({ date }) => Number.isFinite(date))
      .sort((a, b) => b.date - a.date)[0]?.item || series[0]
  const featuredCover =
    featuredSeries?.items.find(
      (item) => item.file === featuredSeries.cover && item.type === 'image'
    ) || featuredSeries?.items.find((item) => item.type === 'image')
  const words = ['Design', 'Video', 'Photography', 'Engineering']

  return (
    <article className="view about">
      <ApertureDial />
      <p className="crumb">About</p>
      <div className="ab">
        <div className="ab-text">
          <h1 className="ab-title">
            <Words text="Querying data by day," />
            <br />
            <Words text="Framing stories by night." delay={0.2} />
          </h1>
          <FadeUp as="p" className="lead" delay={0.3}>{site.about}</FadeUp>
        </div>
        {aboutImage && (
          <div className="ab-art" aria-hidden="true">
            <Float p={aboutImage} className="about-feature" range={['6%', '-10%']} />
          </div>
        )}
        {featuredSeries && (
          <FadeUp delay={0.4} className="about-widgets-wrap">
            <section className="about-widgets" aria-label="Photography widgets">
              <Link
                to={`/series/${featuredSeries.slug}/1`}
                className="about-widget about-featured-widget"
                aria-label={`Explore ${featuredSeries.title} series`}
              >
                {featuredCover && (
                  <img
                    src={featuredCover.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <span className="about-featured-copy">
                  <small>LATEST SERIES · {featuredSeries.date}</small>
                  <b>{featuredSeries.title}</b>
                  <small>{featuredSeries.location || featuredSeries.category} · {featuredSeries.items.filter((item) => item.type === 'image').length} PHOTOS</small>
                </span>
                <span className="about-widget-arrow" aria-hidden="true">↗</span>
              </Link>
              <div className="about-widget about-stat-widget">
                <small>COLLECTIONS</small>
                <b>{String(series.length).padStart(2, '0')}</b>
              </div>
              <div className="about-widget about-stat-widget">
                <small>PHOTOGRAPHS</small>
                <b>{String(photos.length).padStart(3, '0')}</b>
              </div>
            </section>
          </FadeUp>
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
