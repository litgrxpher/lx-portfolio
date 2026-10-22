import { site } from './site'

// Every image dropped into src/photos shows up on the site automatically,
// sorted by file name (01.jpg, 02.jpg, ...). Resize big photos to ~1400px wide first.
const files = import.meta.glob(
  '../photos/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}',
  { eager: true, query: '?url', import: 'default' }
)

// Optional: give a photo a real title, category, year, link or short note.
// The key is the file name without its extension.
const OVERRIDES = {
  // '01': { title: 'Above the clouds', category: 'Photography', year: '2026', note: 'Shot at sunrise.', link: site.behance },
}

const entries = Object.entries(files).sort(([a], [b]) =>
  a.localeCompare(b, undefined, { numeric: true })
)

export const projects = entries.map(([path, src], i) => {
  const file = path.split('/').pop().replace(/\.[^.]+$/, '')
  const o = OVERRIDES[file] || {}
  return {
    id: i,
    slug: file.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: o.title || `Photograph ${String(i + 1).padStart(2, '0')}`,
    category: o.category || 'Photography',
    year: o.year || '',
    note: o.note || '',
    link: o.link || site.behance,
    src,
  }
})

export const categories = ['All', ...new Set(projects.map((p) => p.category))]
