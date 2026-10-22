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
  const inArchive = pathname === '/archive' || pathname.startsWith('/series')
  const inAbout = pathname === '/about'

  return (
    <header className={'top' + (onHome ? ' on-home' : '')}>
      <Link to="/" className="brand" aria-label={`${site.name}, home`}>
        <b>{site.name}</b>
      </Link>
      <nav aria-label="Main">
        <NavItem to="/archive" active={inArchive}>
          Archive
        </NavItem>
        <NavItem to="/about" active={inAbout}>
          About
        </NavItem>
        <a href={site.behance} target="_blank" rel="noopener noreferrer">
          Behance ↗
        </a>
        <a className="ext2" href={site.instagram} target="_blank" rel="noopener noreferrer">
          Instagram ↗
        </a>
        <a className="ext2" href={site.linkedin} target="_blank" rel="noopener noreferrer">
          LinkedIn ↗
        </a>
      </nav>
    </header>
  )
}
