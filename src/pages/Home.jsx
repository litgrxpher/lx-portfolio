import { useNavigate } from 'react-router-dom'
import CameraHero from '../components/CameraHero'
import { site } from '../data/site'

export default function Home() {
  const navigate = useNavigate()

  return (
    <CameraHero
      role={site.role}
      location="Kerala, India"
      links={[
        { label: 'Archives', href: '/series' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: `mailto:${site.email}` },
      ]}
      onNavigate={navigate}
    />
  )
}
