import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(root, 'public', 'optimized')
const manifestPath = path.join(root, 'src', 'data', 'optimized-images.json')
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
const manifest = {}

async function optimizeDirectory(sourceDir, assetPrefix) {
  const entries = await readdir(sourceDir, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name)
    if (entry.isDirectory()) {
      await optimizeDirectory(sourcePath, `${assetPrefix}/${entry.name}`)
      continue
    }

    const extension = path.extname(entry.name).toLowerCase()
    if (!entry.isFile() || !imageExtensions.has(extension)) continue

    const relativePath = `${assetPrefix}/${entry.name}`
    const outputRelativePath = `${assetPrefix}/${entry.name.slice(0, -extension.length)}.webp`
    const outputPath = path.join(outputDir, outputRelativePath)

    await mkdir(path.dirname(outputPath), { recursive: true })
    await sharp(sourcePath)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toFile(outputPath)

    manifest[`../${relativePath}`] = `/optimized/${outputRelativePath.replaceAll(path.sep, '/')}`
  }
}

await rm(outputDir, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })
await optimizeDirectory(path.join(root, 'src', 'photos'), 'photos')
await optimizeDirectory(path.join(root, 'src', 'series'), 'series')
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`Optimized ${Object.keys(manifest).length} images to WebP.`)
