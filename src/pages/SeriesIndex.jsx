import { Link } from 'react-router-dom'
import { series } from '../data/series'

const months = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

function dateRank(value) {
  const monthYear = value.match(/^([a-z]+)\s+(\d{4})$/i)
  if (monthYear) {
    const month = months.indexOf(monthYear[1].toLowerCase())
    if (month !== -1) return Number(monthYear[2]) * 12 + month
  }

  const year = value.match(/^(\d{4})$/)
  return year ? Number(year[1]) * 12 : Number.NEGATIVE_INFINITY
}

const latestFirst = [...series].sort((a, b) => dateRank(b.date) - dateRank(a.date))

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
