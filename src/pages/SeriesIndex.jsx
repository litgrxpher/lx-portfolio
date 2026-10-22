import { Link } from 'react-router-dom'
import { series } from '../data/series'

const latestFirst = [...series].sort(
  (a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)
)

export default function SeriesIndex() {
  return (
    <article className="view series-index">
      <p className="crumb">Browse by collection</p>
      <div className="series-index-heading">
        <h1 className="vtitle">Series</h1>
        <p>Places, people, and moments gathered into frames.</p>
      </div>

      <section className="series-grid" aria-label="Photo series">
        {latestFirst.map((item, index) => {
          const cover =
            item.items.find((media) => media.file === item.cover && media.type === 'image') ||
            item.items.find((media) => media.type === 'image')
          const photos = item.items.filter((media) => media.type === 'image').length
          const videos = item.items.length - photos

          return (
            <Link
              key={item.id}
              to={`/series/${item.slug}/1`}
              className="series-card"
              data-cursor="Open"
            >
              <div className="series-card-image">
                {cover ? (
                  <img
                    src={cover.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span>{item.title}</span>
                )}
                <i aria-hidden="true">↗</i>
              </div>
              <div className="series-card-info">
                <div>
                  <small>{String(index + 1).padStart(2, '0')}</small>
                  <h2>{item.title}</h2>
                  {item.location && <p>{item.location}</p>}
                </div>
                <span>
                  {[photos && `${photos} photo${photos === 1 ? '' : 's'}`, videos && `${videos} video${videos === 1 ? '' : 's'}`]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            </Link>
          )
        })}
      </section>
    </article>
  )
}
