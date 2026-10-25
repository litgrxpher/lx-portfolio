import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { site } from '../data/site'
import { sound } from '../utils/soundEngine'

function NavItem({ to, active, children }) {
  return (
    <Link to={to}>
      {children}
      {active && <motion.i layoutId="nav-underline" className="ul" />}
    </Link>
  )
}

export default function Header() {
  const { pathname } = useLocation()
  const inSeries = pathname === '/series' || pathname.startsWith('/series/')
  const inAbout = pathname === '/about'
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled)

  useEffect(() => {
    return sound.subscribe((enabled) => {
      setSoundEnabled(enabled)
    })
  }, [])

  const handleBrandClick = (e) => {
    if (pathname === '/') {
      e.preventDefault()
      window.__lenis?.scrollTo(0, { duration: 1.2 })
    }
  }

  const handleSoundToggle = async () => {
    await sound.toggle()
  }

  return (
    <header className="top">
      <Link
        to="/"
        state={{ skipIntro: true }}
        onClick={handleBrandClick}
        className="brand"
        aria-label={`${site.name}, home`}
      >
        <b className="brand-mark">CS<span className="brand-dot">.</span></b>
      </Link>
      <div className="top-actions">
        <nav aria-label="Main">
          <NavItem to="/series" active={inSeries}>
            Archives
          </NavItem>
          <NavItem to="/about" active={inAbout}>
            About
          </NavItem>
        </nav>
        <button
          type="button"
          className={`top-sound-btn ${soundEnabled ? 'is-active' : ''}`}
          onClick={handleSoundToggle}
          aria-label={soundEnabled ? 'Disable atmosphere sound' : 'Enable atmospheric sound'}
          title={soundEnabled ? 'Sound on' : 'Sound off'}
          data-cursor="Sound"
        >
          <span className="top-sound-icon" aria-hidden="true">
            {soundEnabled ? (
              <span className="top-sound-wave-bars">
                <span className="bar bar-1" />
                <span className="bar bar-2" />
                <span className="bar bar-3" />
                <span className="bar bar-4" />
              </span>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
          </span>
        </button>
      </div>
    </header>
  )
}
