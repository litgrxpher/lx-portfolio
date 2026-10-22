import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { site } from '../data/site'

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
  const onHome = pathname === '/'
  const inArchive = pathname === '/archive'
  const inSeries = pathname === '/series' || pathname.startsWith('/series/')
  const inAbout = pathname === '/about'

  return (
    <header className={'top' + (onHome ? ' on-home' : '')}>
      <Link to="/" className="brand" aria-label={`${site.name}, home`}>
        <b className="brand-mark">CS<span className="brand-dot">.</span></b>
      </Link>
      <nav aria-label="Main">
        <NavItem to="/archive" active={inArchive}>
          Archive
        </NavItem>
        <NavItem to="/series" active={inSeries}>
          Series
        </NavItem>
        <NavItem to="/about" active={inAbout}>
          About
        </NavItem>
      </nav>
    </header>
  )
}
