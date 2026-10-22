import { site } from './site'
import optimizedImages from './optimized-images.json'

// HOW CONTENT WORKS
// Each folder inside src/series is one series (a place or a topic):
//   src/series/03-munnar/
//     info.json     <- place name, location, date, description, extra details
//     01.jpg 02.jpg ...   <- photos
//     clip.mp4            <- optional looping videos (also shown as video cards)
// Folders are shown in name order. Everything is picked up automatically.

const media = import.meta.glob(
  '../series/*/*.{mp4,webm,mov,MP4,WEBM,MOV}',
  { eager: true, query: '?url', import: 'default' }
)
const imagePaths = Object.keys(optimizedImages).filter((path) => path.startsWith('../series/'))
const infos = import.meta.glob('../series/*/info.json', { eager: true, import: 'default' })

const isVideo = (file) => /\.(mp4|webm|mov)$/i.test(file)
const pretty = (s) =>
  s
    .replace(/^\d+[-_]\s*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())

const groups = {}
for (const [path, src] of Object.entries(media)) {
  const parts = path.split('/')
  const folder = parts[parts.length - 2]
  const file = parts[parts.length - 1]
  ;(groups[folder] = groups[folder] || []).push({ file, src, type: isVideo(file) ? 'video' : 'image' })
}
for (const path of imagePaths) {
  const parts = path.split('/')
  const folder = parts[parts.length - 2]
  const file = parts[parts.length - 1]
  ;(groups[folder] = groups[folder] || []).push({
    file,
    src: optimizedImages[path],
    type: 'image',
  })
}

const folders = Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

export const series = folders.map((folder, si) => {
  const info = infos[`../series/${folder}/info.json`] || {}
  const slug =
    folder.toLowerCase().replace(/^\d+[-_]/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ||
    `series-${si + 1}`
  const s = {
    id: si,
    folder,
    slug,
    title: info.title || pretty(folder),
    location: info.location || '',
    date: info.date || '',
    category: info.category || '',
    cameras: info.cameras || ['iPhone 16'],
    description: info.description || '',
    cover: info.cover || '',
    details: info.details || {},
    link: info.link || site.behance,
    items: [],
  }
  const order = Array.isArray(info.order) ? info.order : []
  s.items = groups[folder]
    .sort((a, b) => {
      const aOrder = order.indexOf(a.file)
      const bOrder = order.indexOf(b.file)
      if (aOrder !== -1 || bOrder !== -1) {
        if (aOrder === -1) return 1
        if (bOrder === -1) return -1
        if (aOrder !== bOrder) return aOrder - bOrder
      }
      return (
        Number(a.type === 'video') - Number(b.type === 'video') ||
        a.file.localeCompare(b.file, undefined, { numeric: true })
      )
    })
    .map((it, k) => ({
      id: `${slug}-${k}`,
      file: it.file,
      src: it.src,
      type: it.type,
      index: k,
      series: s,
    }))
  return s
})

export const allItems = series.flatMap((s) => s.items)
export const hasVideo = allItems.some((i) => i.type === 'video')

// The archive only shows photos (videos made it laggy). A series that has no photos
// at all still gets a text tile so it can be reached.
export const archiveItems = [
  ...allItems.filter((i) => i.type === 'image'),
  ...series
    .filter((s) => !s.items.some((i) => i.type === 'image'))
    .map((s) => ({ id: `${s.slug}-title`, type: 'title', index: 0, series: s, src: '' })),
]
