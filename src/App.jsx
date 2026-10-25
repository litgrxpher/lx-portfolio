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
  }, [pathname])

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
