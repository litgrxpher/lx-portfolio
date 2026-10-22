const files = import.meta.glob(
  '../videos/*.{mp4,webm,ogg,MP4,WEBM,OGG}',
  { eager: true, query: '?url', import: 'default' }
)

export const videos = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([path, src]) => {
    const file = path.split('/').pop().replace(/\.[^.]+$/, '')
    const title = file.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    return { src, title }
  })
