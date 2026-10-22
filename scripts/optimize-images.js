import { mkdir, open, readFile, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(root, 'public', 'optimized')
const manifestPath = path.join(root, 'src', 'data', 'optimized-images.json')
const lockPath = path.join(root, '.optimize-images.lock')
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
const manifest = {}

async function acquireLock() {
  const deadline = Date.now() + 5 * 60 * 1000

  while (Date.now() < deadline) {
    try {
      const lock = await open(lockPath, 'wx')
      await lock.writeFile(String(process.pid))
      return lock
    } catch (error) {
      if (error.code !== 'EEXIST') throw error

      let lockIsStale = false
      try {
        const owner = Number(await readFile(lockPath, 'utf8'))
        if (Number.isInteger(owner) && owner > 0) {
          try {
            process.kill(owner, 0)
          } catch (ownerError) {
            if (ownerError.code === 'ESRCH') lockIsStale = true
            else throw ownerError
          }
        } else {
          const lockStats = await stat(lockPath)
          lockIsStale = Date.now() - lockStats.mtimeMs > 60_000
        }
      } catch (lockError) {
        if (lockError.code !== 'ENOENT') throw lockError
      }

      if (lockIsStale) {
        await unlink(lockPath).catch((unlinkError) => {
          if (unlinkError.code !== 'ENOENT') throw unlinkError
        })
        continue
      }

      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  throw new Error('Timed out waiting for another image optimization process to finish.')
}

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
    const temporaryPath = `${outputPath}.${process.pid}.tmp.webp`

    await mkdir(path.dirname(outputPath), { recursive: true })
    try {
      await sharp(sourcePath)
        .rotate()
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toFile(temporaryPath)
      await rename(temporaryPath, outputPath)
    } finally {
      await rm(temporaryPath, { force: true })
    }

    manifest[`../${relativePath}`] = `/optimized/${outputRelativePath.replaceAll(path.sep, '/')}`
  }
}

const lock = await acquireLock()
try {
  await mkdir(outputDir, { recursive: true })
  await optimizeDirectory(path.join(root, 'src', 'photos'), 'photos')
  await optimizeDirectory(path.join(root, 'src', 'series'), 'series')
  const temporaryManifestPath = `${manifestPath}.${process.pid}.tmp`
  try {
    await writeFile(temporaryManifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    await rename(temporaryManifestPath, manifestPath)
  } finally {
    await rm(temporaryManifestPath, { force: true })
  }

  console.log(`Optimized ${Object.keys(manifest).length} images to WebP.`)
} finally {
  await lock.close()
  await unlink(lockPath)
}
