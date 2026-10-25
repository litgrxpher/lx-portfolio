import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createCameraScene } from './cameraScene'
import { site } from '../data/site'
import './CameraHero.css'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

const FSTOPS = ['1.4', '2', '2.8', '4', '5.6', '8', '11', '16']
const PI = Math.PI
let openingHasPlayed = false

/* Camera poses per scroll section (world units). Rotation is continuous: ~1 full turn over the page. */
const POSES = {
  wide: [
    { x: 0,    y: 0,    z: 0, rotX: 0.12, rotY: 0.35,     scale: 1.08, ring: 0 },    // hero
    { x: -2.9, y: 0,    z: 0, rotX: 0.05, rotY: PI * 0.9, scale: 1.05, ring: 2 },    // archive
    { x: 2.9,  y: 0,    z: 0, rotX: 0.1,  rotY: PI * 1.7, scale: 1.05, ring: 4 },    // about
    { x: 0,    y: 1.25, z: 0, rotX: 0,    rotY: PI * 2,   scale: 0.85, ring: 6.28 }, // contact (lens faces you)
  ],
  tall: [
    { x: 0, y: 0,    z: 0, rotX: 0.12, rotY: 0.35,     scale: 0.92, ring: 0 },    // hero
    { x: 0, y: 1.45, z: 0, rotX: 0.05, rotY: PI * 0.9, scale: 0.78, ring: 2 },    // archive
    { x: 0, y: 1.45, z: 0, rotX: 0.1,  rotY: PI * 1.7, scale: 0.78, ring: 4 },    // about
    { x: 0, y: 1.25, z: 0, rotX: 0,    rotY: PI * 2,   scale: 0.85, ring: 6.28 }, // contact
  ],
}

export default function CameraHero({
  role = 'Photographer',
  location = 'Kerala, India',
  links = [
    { label: 'Archives', href: '/series' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
  modelUrl = '/models/canon_at1.glb',
  onNavigate,                               // e.g. (path) => navigate(path) from react-router
}) {
  const root = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)

  const go = (e, href) => {
    if (!onNavigate || !href?.startsWith('/')) return
    e.preventDefault()
    onNavigate(href)
  }

  /* "Click" CTA: zoom into the lens, flash, then route to the archive. */
  const openArchive = (e) => {
    e.preventDefault()
    const s = sceneRef.current
    const target = links[0]?.href || '/series'
    const done = () => (onNavigate ? onNavigate(target) : (window.location.href = target))
    if (!s) return done()
    gsap.timeline({ onComplete: done })
      .to(s.state.cta, { z: 6.5, duration: 0.9, ease: 'power3.in' })
      .to('.ch-flash', { opacity: 1, duration: 0.15, ease: 'none' }, '-=0.15')
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const skipOpening = openingHasPlayed
    const html = document.documentElement
    let target = 0
    let active = true
    let scrollInitialized = false
    const counter = { v: 0 }
    const countEl = root.current.querySelector('.ch-intro__count')
    const tickCounter = () => {
      counter.v += (target * 100 - counter.v) * 0.12
      countEl.textContent = String(Math.round(counter.v)).padStart(3, '0')
    }
    const scene = createCameraScene(canvasRef.current, { modelUrl, onProgress: (p) => { target = p } })
    sceneRef.current = scene
    const mm = gsap.matchMedia()

    const ctx = gsap.context(() => {
      html.classList.add('ch-lock')
      window.scrollTo(0, 0)

      /* ---------- scroll-driven rotation ---------- */
      const initScroll = () => {
        if (scrollInitialized) return
        scrollInitialized = true
        const isTouch = window.matchMedia('(pointer: coarse)').matches
        mm.add({
          wide: '(min-width: 821px) and (min-aspect-ratio: 1/1)',
          tall: '(max-width: 820px), (max-aspect-ratio: 1/1)',
        }, (c) => {
          const P = c.conditions.wide ? POSES.wide : POSES.tall
          gsap.set(scene.state.scroll, P[0])
          const tl = gsap.timeline({
            defaults: { ease: 'power1.inOut', duration: 1 },
            scrollTrigger: {
              trigger: '.ch-main',
              start: 'top top',
              end: 'bottom bottom',
              scrub: isTouch ? 0.8 : 1.2,
              onUpdate: (self) => { scene.state.vel = self.getVelocity() },
            },
          })
          P.slice(1).forEach((pose) => tl.to(scene.state.scroll, pose))
        })

        // hero text fades out upward as user scrolls away
        gsap.fromTo('.ch-hero__meta, .ch-hero__scroll',
          { opacity: 1, y: 0 },
          {
            opacity: 0,
            y: -40,
            ease: 'none',
            scrollTrigger: {
              trigger: '.ch-hero',
              start: 'top top',
              end: '30% top',
              scrub: 0.4,
              invalidateOnRefresh: true,
            },
          }
        )

        // copy reveals: triggered by section so the bottom-of-page contact section reveals reliably on all mobile screen heights
        gsap.utils.toArray('.ch-sec').forEach((sec) => {
          const el = sec.querySelector('.ch-reveal')
          if (!el) return
          gsap.from(el.children, {
            opacity: 0,
            y: 32,
            duration: 0.85,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sec,
              start: 'top 75%',
              toggleActions: 'play none none reverse',
            },
          })
        })
      }

      /* ---------- opening animation ---------- */
      const finishInstantly = () => {
        if (!active) return
        openingHasPlayed = true
        gsap.set('.ch-intro', { display: 'none' })
        gsap.set('.ch-fade', { opacity: 1, y: 0 })
        Object.assign(scene.state.intro, { scale: 1, rotY: 0, iris: 1 })
        html.classList.remove('ch-lock')
        initScroll()
      }

      const revealWithoutCamera = (error) => {
        if (!active) return
        console.error('Failed to load the homepage camera model.', error)
        gsap.ticker.remove(tickCounter)
        finishInstantly()
      }

      if (reduce || skipOpening) {
        finishInstantly()
        scene.ready.catch(revealWithoutCamera)
        return
      }

      gsap.ticker.add(tickCounter)
      gsap.set('.ch-fade', { opacity: 0, y: 14 })

      const irisHole = { r: 0 }
      const introEl = root.current.querySelector('.ch-intro')

      openingHasPlayed = true
      scene.ready.then(() => {
        if (!active) return
        target = 1
        const tl = gsap.timeline({
          delay: 0.5,
          defaults: { ease: 'power3.inOut' },
          onComplete: () => {
            gsap.ticker.remove(tickCounter)
            gsap.set('.ch-intro', { display: 'none' })
            html.classList.remove('ch-lock')
            ScrollTrigger.refresh()
            initScroll()
          },
        })
        tl
          // f-stop ring spins and settles
          .to('.ch-intro__ring', { rotation: 720, duration: 1.6, ease: 'power4.inOut' }, 0)
          .to('.ch-intro__count, .ch-intro__label', { opacity: 0, y: -16, duration: 0.4 }, 1.1)
          // iris opens: black overlay gets a growing circular hole
          .to('.ch-intro__ring', { scale: 1.6, opacity: 0, duration: 0.9 }, 1.5)
          .to(irisHole, {
            r: 150, duration: 1.6,
            onUpdate: () => introEl.style.setProperty('--r', `${irisHole.r}vmax`),
          }, 1.5)
          // camera spins in + backdrop iris fades up
          .to(scene.state.intro, { scale: 1, rotY: 0, duration: 2.4, ease: 'expo.out' }, 1.7)
          .to(scene.state.intro, { iris: 1, duration: 1.8, ease: 'power2.out' }, 2.0)
          // shutter "click" flash
          .to('.ch-flash', { opacity: 0.85, duration: 0.06, ease: 'none' }, 2.7)
          .to('.ch-flash', { opacity: 0, duration: 0.5, ease: 'power2.out' }, 2.76)
          .to('.ch-fade', { opacity: 1, y: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out' }, 3.1)
      }, revealWithoutCamera)
    }, root)

    return () => {
      active = false
      gsap.ticker.remove(tickCounter)
      mm.revert()
      ctx.revert()
      ScrollTrigger.getAll().forEach((t) => t.kill())
      html.classList.remove('ch-lock')
      scene.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="ch-root" ref={root}>
      <canvas className="ch-canvas" ref={canvasRef} />
      <div className="ch-grain" aria-hidden />
      <div className="ch-flash" aria-hidden />

      {/* opening animation overlay */}
      <div className="ch-intro" aria-hidden style={openingHasPlayed ? { display: 'none' } : undefined}>
        <svg className="ch-intro__ring" viewBox="0 0 200 200">
          <defs><path id="chCircle" d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0" /></defs>
          <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          <circle cx="100" cy="100" r="68" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <text fill="currentColor" fontSize="9" letterSpacing="3.2">
            <textPath href="#chCircle">{FSTOPS.map((f) => `f/${f}`).join('   ·   ')}   ·   </textPath>
          </text>
        </svg>
        <div className="ch-intro__count">000</div>
        <div className="ch-intro__label">exposing</div>
      </div>

      <main className="ch-main">
        {/* 1 — hero */}
        <section className="ch-hero">
          <p className="ch-hero__meta ch-fade"><span>{role}</span><span>{location}</span></p>
          <p className="ch-hero__scroll ch-fade">Scroll<i /></p>
        </section>

        {/* 2 — archive teaser (camera on the left, copy on the right) */}
        <section className="ch-sec ch-sec--right">
          <div className="ch-reveal">
            <span className="ch-kicker">01 — Archives</span>
            <h2>Frames from places I've been.</h2>
            <p>A drifting field of photographs, grouped as series — one place, one story at a time.</p>
            <a className="ch-link" href={links[0]?.href} onClick={(e) => go(e, links[0]?.href)}>Enter the archive →</a>
          </div>
        </section>

        {/* 3 — about (camera on the right) */}
        <section className="ch-sec ch-sec--left">
          <div className="ch-reveal">
            <span className="ch-kicker">02 — About</span>
            <h2>Light, patience, and a little grain.</h2>
            <p>Photography and visual design, shot on whatever is close — pixels or film.</p>
            <a className="ch-link" href={links[1]?.href} onClick={(e) => go(e, links[1]?.href)}>About me →</a>
          </div>
        </section>

        {/* 4 — contact */}
        <section className="ch-sec ch-sec--center">
          <div className="ch-reveal">
            <span className="ch-kicker">03 — Contact</span>
            <h2>Let's make something.</h2>
            <a className="ch-cta" href={`mailto:${site.email}`}>Say hello</a>
          </div>
        </section>
      </main>
    </div>
  )
}
