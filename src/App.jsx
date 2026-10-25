import { useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import Header from './components/Header'
import Cursor from './components/Cursor'
import SmoothScroll from './components/SmoothScroll'
import Home from './pages/Home'
import About from './pages/About'
import Series from './pages/Series'
import SeriesIndex from './pages/SeriesIndex'
import { sound } from './utils/soundEngine'

function Page({ children }) {
  return (
    <motion.div
      className="page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.65, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  return <motion.div className="progress" style={{ scaleX }} />
}

export default function App() {
  const location = useLocation()
  const { pathname } = location

  useEffect(() => {
    document.body.dataset.page = pathname === '/' ? 'home' : 'page'
    window.scrollTo(0, 0)
    // Seamlessly adjust audio atmosphere between Home (mountain wind) and other pages (subtle ambient)
    sound.setMode(pathname === '/' ? 'mountain' : 'subtle')
  }, [pathname])

  // If audio is saved as enabled from a previous visit, resume cleanly on first interaction
  useEffect(() => {
    const handleUnlock = () => {
      sound.unlock()
    }
    window.addEventListener('pointerdown', handleUnlock, { once: true })
    window.addEventListener('keydown', handleUnlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', handleUnlock)
      window.removeEventListener('keydown', handleUnlock)
    }
  }, [])

  // Global tactile SFX on user clicks across the website (only when site sound toggle is active)
  useEffect(() => {
    let lastClickTime = 0

    const handleGlobalClick = (e) => {
      if (!sound.enabled) return
      const now = performance.now()
      // Micro-debounce (35ms) to prevent synthetic or duplicated bubble triggers
      if (now - lastClickTime < 35) return
      lastClickTime = now

      // Check if clicked element or its ancestor is interactive
      const interactive = e.target.closest?.(
        'a, button, [role="button"], input, select, textarea, label, ' +
        '.series-card, .sr-card, .sr-ctrl button, .mtn-link, .mtn-loader-sound, ' +
        '.top-sound-btn, .brand, .brand-mark, .theme-toggle, .aperture-dial, .dial-body, ' +
        '.tear-ticket, [data-cursor], [data-clickable], .cursor-pointer, .hello'
      )

      if (interactive) {
        sound.playUiClick('interactive')
      } else {
        sound.playUiClick('tap')
      }
    }

    window.addEventListener('click', handleGlobalClick, { capture: true, passive: true })
    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true })
    }
  }, [])

  return (
    <>
      <SmoothScroll />
      <ScrollProgress />
      <Header />
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={pathname}>
          <Route path="/" element={<Page><Home /></Page>} />
          <Route path="/series" element={<Page><SeriesIndex /></Page>} />
          <Route path="/series/:slug/:n?" element={<Page><Series /></Page>} />
          <Route path="/archive" element={<Navigate to="/series" replace />} />
          <Route path="/work/*" element={<Navigate to="/series" replace />} />
          <Route path="/about" element={<Page><About /></Page>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      <Cursor />
    </>
  )
}
