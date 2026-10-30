import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { allItems, series } from '../data/series'
import { site } from '../data/site'
import { Words, FadeUp } from '../components/Reveal'
import SayHello from '../components/SayHello'
import ApertureDial from '../components/ApertureDial'
import Lanyard from '../components/Lanyard'
import LogoLoop from '../components/LogoLoop'
import { SiBlender, SiDavinciresolve, SiFigma, SiLinux } from 'react-icons/si'
import { TbBrandAdobeAfterEffect, TbBrandAdobePremiere } from 'react-icons/tb'
import { GrOracle } from 'react-icons/gr'

function AntigravityIcon(props) {
  return (
    <svg
      viewBox="0 0 180 180"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M144.248 149.062C151.748 154.688 162.998 150.938 152.685 140.625C121.748 110.625 128.31 28.125 89.8727 28.125C51.4352 28.125 57.9977 110.625 27.0602 140.625C15.8102 151.875 27.9977 154.688 35.4977 149.062C64.5602 129.375 62.6852 94.6875 89.8727 94.6875C117.06 94.6875 115.185 129.375 144.248 149.062Z" />
    </svg>
  )
}

const toolLogos = [
  {
    node: <SiBlender />,
    title: 'Blender',
    href: 'https://www.blender.org',
    hoverColor: '#EA7600'
  },
  {
    node: <TbBrandAdobeAfterEffect />,
    title: 'After Effects',
    href: 'https://www.adobe.com/products/aftereffects.html',
    hoverColor: '#9999FF'
  },
  {
    node: <SiDavinciresolve />,
    title: 'DaVinci Resolve',
    href: 'https://www.blackmagicdesign.com/products/davinciresolve',
    hoverColor: '#FF5353'
  },
  {
    node: <TbBrandAdobePremiere />,
    title: 'Adobe Premiere Pro',
    href: 'https://www.adobe.com/products/premiere.html',
    hoverColor: '#EA77FF'
  },
  {
    node: <SiFigma />,
    title: 'Figma',
    href: 'https://www.figma.com',
    hoverColor: '#F24E1E'
  },
  {
    node: <GrOracle />,
    title: 'Oracle',
    href: 'https://www.oracle.com',
    hoverColor: '#F80000'
  },
  {
    node: <SiLinux />,
    title: 'Linux',
    href: 'https://www.kernel.org',
    hoverColor: '#FCC624'
  },
  {
    node: <AntigravityIcon />,
    title: 'Antigravity',
    href: 'https://antigravity.google',
    hoverColor: '#3186FF'
  }
]

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
  const artRef = useRef(null)
  const [anchorRatio, setAnchorRatio] = useState(0.76)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 821px)').matches : true
  )

  useEffect(() => {
    const media = window.matchMedia('(min-width: 821px)')
    const update = () => {
      setIsDesktop(media.matches)
      if (artRef.current) {
        const rect = artRef.current.getBoundingClientRect()
        const ratio = (rect.left + rect.width / 2) / window.innerWidth
        setAnchorRatio(Math.min(0.85, Math.max(0.15, ratio)))
      }
    }
    update()
    window.addEventListener('resize', update)
    media.addEventListener('change', update)
    return () => {
      window.removeEventListener('resize', update)
      media.removeEventListener('change', update)
    }
  }, [])

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

  return (
    <article className="view about">
      <ApertureDial />
      {isDesktop && (
        <div className="about-lanyard-stage">
          <Lanyard
            frontImage={aboutImage?.src || '/card-front.png'}
            backImage={aboutImage?.src || '/card-back.png'}
            strapImage="/band.png"
            anchor={anchorRatio}
          />
        </div>
      )}
      <p className="crumb">About</p>

      {/* Hero: Identity & Story */}
      <section className="ab" aria-label="Introduction">
        <div className="ab-text">
          <h1 className="ab-title">
            <Words text="Querying data by day," />
            <br />
            <Words text="Framing stories by night." delay={0.2} />
          </h1>
          <FadeUp as="p" className="lead" delay={0.3}>{site.about}</FadeUp>
          <div className="about-badges" aria-label="Key disciplines">
            <span className="about-badge">Computer Science</span>
            <span className="about-badge">Visual Storyteller</span>
            <span className="about-badge">Kerala, India</span>
          </div>
        </div>

        {isDesktop ? (
          <div ref={artRef} className="ab-art about-lanyard-placeholder" aria-hidden="true" />
        ) : (
          <div className="ab-art about-lanyard-mobile-wrap">
            <div className="about-lanyard-mobile">
              <Lanyard
                frontImage={aboutImage?.src || '/card-front.png'}
                backImage={aboutImage?.src || '/card-back.png'}
                strapImage="/band.png"
                anchor="center"
              />
            </div>
          </div>
        )}
      </section>

      {/* Section 01: Core Toolkit */}
      <section className="about-sec about-toolkit" aria-labelledby="toolkit-title">
        <FadeUp>
          <div className="about-sec-header">
            <p className="about-sec-label">01 / Disciplines & Technologies</p>
            <div className="about-sec-title-row">
              <h2 id="toolkit-title" className="about-sec-title">Core Toolkit</h2>
              <p className="about-sec-copy">
                From database systems and developer environments to 3D rendering and film post-production.
              </p>
            </div>
          </div>
        </FadeUp>
        <div className="about-logo-loop">
          <LogoLoop
            logos={toolLogos}
            speed={70}
            direction="left"
            logoHeight={32}
            gap={56}
            hoverSpeed={0}
            scaleOnHover={false}
            labels="inline"
            fadeOut={true}
            fadeOutWidth={0.12}
            ariaLabel="Creative and engineering tools"
          />
        </div>
      </section>

      {/* Section 02: Visual Archives & Photography */}
      <section className="about-sec about-photography" aria-labelledby="archives-title">
        <FadeUp>
          <div className="about-sec-header">
            <p className="about-sec-label">02 / Visual Archives</p>
            <div className="about-sec-title-row">
              <h2 id="archives-title" className="about-sec-title">Stories in Frames</h2>
              <p className="about-sec-copy">
                Documenting highland treks, mist-shrouded ridgelines, and unscripted road journeys across India.
              </p>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.2}>
          <div className="about-archives-grid">
            {featuredSeries && (
              <Link
                to={`/series/${featuredSeries.slug}/1`}
                className="about-archive-card"
                aria-label={`Explore latest series: ${featuredSeries.title}`}
              >
                <div className="archive-card-thumb">
                  {featuredCover && (
                    <img
                      src={featuredCover.src}
                      alt={featuredSeries.title}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <span className="archive-pill">Latest Series</span>
                  <span className="archive-card-arrow" aria-hidden="true">↗</span>
                </div>
                <div className="archive-card-meta">
                  <div>
                    <small className="archive-date">{featuredSeries.date}</small>
                    <h3 className="archive-title">{featuredSeries.title}</h3>
                    <p className="archive-location">{featuredSeries.location || featuredSeries.category}</p>
                  </div>
                  <span className="archive-count">
                    {featuredSeries.items.filter((item) => item.type === 'image').length} Photographs · High-res gallery
                  </span>
                </div>
              </Link>
            )}

            <div className="about-stats-column">
              <div className="about-stat-box">
                <span className="stat-label">Curated Collections</span>
                <b className="stat-value">{String(series.length).padStart(2, '0')}</b>
                <span className="stat-sub">Highland treks, culture, and travels</span>
              </div>
              <div className="about-stat-box">
                <span className="stat-label">Archived Photographs</span>
                <b className="stat-value">{String(photos.length).padStart(3, '0')}</b>
                <span className="stat-sub">Captured with Sony & iPhone rigs</span>
              </div>
              <Link to="/series" className="about-archives-cta">
                <span>Browse entire visual archive</span>
                <span className="cta-arrow" aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* Section 03: Resume & Credentials */}
      <section className="about-sec resume" aria-labelledby="resume-title">
        <FadeUp>
          <div>
            <p className="resume-label">03 / Experience & Credentials</p>
            <h2 id="resume-title" className="resume-title">Resume</h2>
            <p className="resume-copy">
              Explore my technical background, academic journey, professional experience, and full skills breakdown.
            </p>
          </div>
        </FadeUp>
        <div className="resume-actions">
          <a href="/Resume.pdf" target="_blank" rel="noopener noreferrer">
            View resume <span aria-hidden="true">↗</span>
          </a>
          <a href="/Resume.pdf" download="Adharsh-CS-Resume.pdf">
            Download PDF <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <SayHello />
    </article>
  )
}
