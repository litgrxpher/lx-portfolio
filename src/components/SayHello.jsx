import { site } from '../data/site'
import Magnetic from './Magnetic'

// Shared footer: the same closing block appears on every content page
export default function SayHello() {
  return (
    <footer className="sayhello">
      <a className="hello" href={`mailto:${site.email}`} data-cursor="Email">
        <span className="roll">
          <span>Say hello by email</span>
          <span aria-hidden="true">Say hello by email</span>
        </span>
        <Magnetic strength={0.5}>
          <i className="arrow">↗</i>
        </Magnetic>
      </a>
      <div className="foot-row">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <span className="foot-links">
          <a href={site.behance} target="_blank" rel="noopener noreferrer">Behance ↗</a>
          <a href={site.instagram} target="_blank" rel="noopener noreferrer">Instagram ↗</a>
          <a href={site.youtube} target="_blank" rel="noopener noreferrer">YouTube ↗</a>
          <a href={site.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
          <a href={site.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a>
        </span>
      </div>
    </footer>
  )
}
