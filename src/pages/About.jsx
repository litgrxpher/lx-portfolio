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
      <div className="ab">
        <div className="ab-text">
          <h1 className="ab-title">
            <Words text="Querying data by day," />
            <br />
            <Words text="Framing stories by night." delay={0.2} />
          </h1>
          <FadeUp as="p" className="lead" delay={0.3}>{site.about}</FadeUp>
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

      <SayHello />
    </article>
  )
}
