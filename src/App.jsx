import { useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import Header from './components/Header'
import Cursor from './components/Cursor'
import SmoothScroll from './components/SmoothScroll'
import Home from './pages/Home'
import Archive from './pages/Archive'
import Project from './pages/Project'
import About from './pages/About'

function Page({ children }) {
  return (
    <motion.div
      className="page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
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
    document.body.dataset.page =
      pathname === '/' ? 'home' : pathname === '/archive' ? 'archive' : 'page'
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <SmoothScroll />
      <Cursor />
      <ScrollProgress />
      <Header />
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={pathname}>
          <Route path="/" element={<Page><Home /></Page>} />
          <Route path="/archive" element={<Page><Archive /></Page>} />
          <Route path="/work/:slug" element={<Page><Project /></Page>} />
          <Route path="/about" element={<Page><About /></Page>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}
