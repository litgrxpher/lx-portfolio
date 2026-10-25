import { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DomeGallery from '../components/DomeGallery'
import { allItems } from '../data/series'
import { site } from '../data/site'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()

  const images = useMemo(() => {
    const list = allItems
      .filter((item) => item.type === 'image' && item.src)
      .map((item) => ({
        src: item.src,
        alt: `${item.series?.title || 'Archive'} - ${item.series?.location || ''}`,
        title: item.series?.title || 'Archive',
        location: item.series?.location || '',
        date: item.series?.date || '',
        category: item.series?.category || '',
        slug: item.series?.slug || '',
        index: item.index ?? 0,
        series: item.series,
      }))

    // Randomize image order so photos from different series are scattered across the dome
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = list[i]
      list[i] = list[j]
      list[j] = temp
    }

    return list
  }, [])

  const handleOpenItem = useCallback(
    (item) => {
      if (item?.slug) {
        navigate(`/series/${item.slug}/${(item.index ?? 0) + 1}`)
      } else {
        navigate('/series')
      }
    },
    [navigate]
  )

  return (
    <div className="home-dome-hero" style={{ width: '100vw', height: '100vh' }}>
      <DomeGallery
        images={images}
        minRadius={1000}
        dragDampening={3}
        grayscale={false}
        overlayBlurColor="#000000"
        openedImageWidth="min(86vw, 500px)"
        openedImageHeight="min(74vh, 540px)"
        imageBorderRadius="18px"
        openedImageBorderRadius="24px"
        onItemOpen={handleOpenItem}
      />

      <div className="home-dome-hud" aria-hidden="true">
        <div className="home-dome-hud-bottom">
          <span>{site.role}</span>
          <span>Kerala, India</span>
        </div>
      </div>
    </div>
  )
}
