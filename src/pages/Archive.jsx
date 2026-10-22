import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { archiveItems } from '../data/series'

const N = archiveItems.length
const mod = (a, n) => ((a % n) + n) % n

function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

// Random order of every photo and video (new shuffle on every visit).
// Each block holds everything once, so nothing is left out and repeats are spread apart.
function extendOrder(order, total) {
  while (order.length < total) {
    const block = shuffle(archiveItems.map((_, i) => i))
    if (order.length && block.length > 1 && block[0] === order[order.length - 1]) {
      ;[block[0], block[1]] = [block[1], block[0]]
    }
    order.push(...block)
  }
  return order
}

function computeLayout(vw, vh, order) {
  const cw = Math.max(150, Math.min(250, vw * 0.19))
  const ch = cw * 1.3
  const sx = cw * 1.14
  const sy = ch * 1.1
  const cols = Math.max(4, Math.ceil((vw + 2 * cw) / sx))
  const rows = Math.max(3, Math.ceil((vh + 2 * ch) / sy), Math.ceil(N / cols))
  extendOrder(order, cols * rows)
  const cells = []
  for (let k = 0; k < cols * rows; k++) {
    const col = k % cols
    const row = Math.floor(k / cols)
    cells.push({
      k,
      i: order[k],
      bx: col * sx,
      by: row * sy,
      rot: (((k * 29) % 9) - 4) * 0.45,
    })
  }
  return { cw, ch, bw: cols * sx + sx * 0.3, bh: rows * sy, cells }
}

function createInitialOrder(heroImages, vw, vh) {
  const order = shuffle(archiveItems.map((_, index) => index))
  if (!heroImages.length) return order

  const cw = Math.max(150, Math.min(250, vw * 0.19))
  const ch = cw * 1.3
  const sx = cw * 1.14
  const sy = ch * 1.1
  const cols = Math.max(4, Math.ceil((vw + 2 * cw) / sx))
  const rows = Math.max(3, Math.ceil((vh + 2 * ch) / sy), Math.ceil(N / cols))
  const visibleSlots = []
  for (let row = 0; row < rows && row * sy <= vh; row++) {
    for (let col = 0; col < cols && col * sx <= vw; col++) {
      visibleSlots.push(row * cols + col)
    }
  }

  const itemIndices = heroImages
    .map((heroImage) => archiveItems.findIndex((item) => item.id === heroImage.id))
    .filter((index) => index !== -1)
  const uniqueIndices = [...new Set(itemIndices)].slice(0, visibleSlots.length)
  const placements = new Map()
  uniqueIndices.forEach((itemIndex, index) => {
    const slotIndex = Math.round((index * (visibleSlots.length - 1)) / Math.max(1, uniqueIndices.length - 1))
    placements.set(visibleSlots[slotIndex], itemIndex)
  })

  const selectedIndices = new Set(uniqueIndices)
  const remaining = order.filter((itemIndex) => !selectedIndices.has(itemIndex))
  const arranged = new Array(archiveItems.length).fill(undefined)
  placements.forEach((itemIndex, slotIndex) => {
    if (slotIndex < arranged.length) arranged[slotIndex] = itemIndex
  })
  let nextIndex = 0
  return arranged.map((itemIndex) =>
    itemIndex === undefined ? remaining[nextIndex++] : itemIndex
  )
}

function getCellPlacement(cell, layout, position, vw, vh, flat = false) {
  const { cw, ch, bw, bh } = layout
  const x = mod(cell.bx + position.x + cw, bw) - cw
  const y = mod(cell.by + position.y + ch, bh) - ch
  if (x > vw || x < -cw || y > vh || y < -ch) return { visibility: 'hidden' }

  if (flat) {
    return {
      transform: `translate3d(${x}px,${y}px,0)`,
      opacity: 1,
      visibility: 'visible',
    }
  }

  const nx = (x + cw / 2 - vw / 2) / (vw / 2)
  const ny = (y + ch / 2 - vh / 2) / (vh / 2)
  const r = Math.min(1.4, Math.hypot(nx, ny * 0.9))
  return {
    transform: `translate3d(${x}px,${y}px,0) rotateY(${-nx * 14}deg) rotateX(${ny * 10}deg) rotate(${cell.rot}deg) scale(${1 - (0.2 * r * r) / 1.4})`,
    opacity: Math.max(0.15, 1 - Math.max(0, r - 0.65) * 0.9),
    visibility: 'visible',
  }
}

export default function Archive() {
  const navigate = useNavigate()
  const location = useLocation()
  const heroImages = Array.isArray(location.state?.heroImages) ? location.state.heroImages : []
  const heroImageIds = new Set(heroImages.map((image) => image.id))
  const [heroTransitionComplete, setHeroTransitionComplete] = useState(!heroImages.length)
  const orderRef = useRef(
    createInitialOrder(heroImages, window.innerWidth, window.innerHeight)
  )
  const [layout, setLayout] = useState(() =>
    N ? computeLayout(window.innerWidth, window.innerHeight, orderRef.current) : { cells: [] }
  )
  const stageRef = useRef(null)
  const capRef = useRef(null)
  const tiles = useRef([])
  const pos = useRef({ x: 0, y: 0 })
  const moved = useRef(0)

  useEffect(() => {
    if (!heroImages.length) return
    const overlays = []
    const animations = []
    const targets = []
    heroImages.forEach((heroImage) => {
      const target = Array.from(document.querySelectorAll('[data-item-id]')).find(
        (el) => el.dataset.itemId === heroImage.id
      )
      if (!target) return

      const targetBox = target.getBoundingClientRect()
      const image = document.createElement('img')
      image.src = heroImage.src
      image.alt = ''
      image.draggable = false
      Object.assign(image.style, {
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        filter: 'grayscale(1) brightness(0.88)',
      })
      const overlay = document.createElement('div')
      overlay.dataset.heroImageId = heroImage.id
      Object.assign(overlay.style, {
        position: 'fixed',
        left: `${heroImage.x}px`,
        top: `${heroImage.y}px`,
        width: `${heroImage.width}px`,
        height: `${heroImage.height}px`,
        transformOrigin: 'top left',
        overflow: 'hidden',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: '45',
        willChange: 'transform',
      })
      overlay.append(image)
      document.body.append(overlay)
      target.dataset.heroTransitionTarget = 'true'
      targets.push(target)
      overlays.push(overlay)
      const scaleX = targetBox.width / heroImage.width
      const scaleY = targetBox.height / heroImage.height
      animations.push(
        overlay.animate(
          [
            { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
            {
              transform: `translate3d(${targetBox.x - heroImage.x}px, ${targetBox.y - heroImage.y}px, 0) scale(${scaleX}, ${scaleY})`,
              opacity: 1,
            },
          ],
          { duration: 1150, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
        )
      )
    })
    if (!animations.length) {
      setHeroTransitionComplete(true)
      return
    }
    let finished = 0
    animations.forEach((animation, index) => {
      animation.onfinish = () => {
        overlays[index].remove()
        targets[index].removeAttribute('data-hero-transition-target')
        finished += 1
        if (finished === animations.length) setHeroTransitionComplete(true)
      }
    })
    return () => {
      animations.forEach((animation) => animation.cancel())
      overlays.forEach((overlay) => overlay.remove())
      targets.forEach((target) => target.removeAttribute('data-hero-transition-target'))
    }
  }, [heroImages])

  useEffect(() => {
    if (!N) return
    let t
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(
        () => setLayout(computeLayout(window.innerWidth, window.innerHeight, orderRef.current)),
        150
      )
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !N) return
    const { cells } = layout
    let vx = 0,
      vy = 0,
      dirty = true,
      raf = 0,
      down = false,
      dragging = false,
      lx = 0,
      ly = 0

    const draw = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const p = pos.current
      for (const c of cells) {
        const el = tiles.current[c.k]
        if (!el) continue
        const isHeroImage = heroImageIds.has(archiveItems[c.i].id)
        const placement = getCellPlacement(
          c,
          layout,
          p,
          vw,
          vh,
          isHeroImage && !heroTransitionComplete
        )
        Object.assign(el.style, placement)
      }
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const tick = () => {
      raf = 0
      if (!dragging && (vx || vy)) {
        pos.current.x += vx
        pos.current.y += vy
        vx *= 0.93
        vy *= 0.93
        if (Math.abs(vx) < 0.05) vx = 0
        if (Math.abs(vy) < 0.05) vy = 0
        dirty = true
      }
      if (dirty) {
        draw()
        dirty = false
      }
      if (vx || vy || dragging) schedule()
    }
    const pan = (dx, dy) => {
      pos.current.x += dx
      pos.current.y += dy
      dirty = true
      schedule()
    }
    const onArchivePan = (event) => {
      const { dx, dy } = event.detail
      vx = dx
      vy = dy
      pan(dx, dy)
    }

    const onDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      down = true
      dragging = true
      moved.current = 0
      lx = e.clientX
      ly = e.clientY
      vx = vy = 0
      stage.classList.add('drag')
      schedule()
    }
    const onMove = (e) => {
      if (!down) return
      const dx = e.clientX - lx
      const dy = e.clientY - ly
      lx = e.clientX
      ly = e.clientY
      moved.current += Math.abs(dx) + Math.abs(dy)
      vx = dx
      vy = dy
      pan(dx, dy)
    }
    const onUp = () => {
      if (!down) return
      down = false
      dragging = false
      stage.classList.remove('drag')
      schedule()
    }
    const onWheel = (e) => {
      e.preventDefault()
      pan(-e.deltaX - (e.shiftKey ? e.deltaY : 0), e.shiftKey ? 0 : -e.deltaY)
    }
    const onKey = (e) => {
      const k = {
        ArrowLeft: [120, 0],
        ArrowRight: [-120, 0],
        ArrowUp: [0, 120],
        ArrowDown: [0, -120],
      }[e.key]
      if (k && document.activeElement === stage) {
        e.preventDefault()
        pan(k[0], k[1])
      }
    }

    stage.addEventListener('pointerdown', onDown)
    stage.addEventListener('archive-pan', onArchivePan)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    stage.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    draw()

    return () => {
      cancelAnimationFrame(raf)
      stage.removeEventListener('pointerdown', onDown)
      stage.removeEventListener('archive-pan', onArchivePan)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      stage.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [heroTransitionComplete, layout])

  const setCap = (text) => {
    if (capRef.current) capRef.current.textContent = text
  }
  const panArchive = (dx, dy) => {
    stageRef.current?.dispatchEvent(new CustomEvent('archive-pan', { detail: { dx, dy } }))
  }
  if (!N) {
    return (
      <section className="archive empty">
        <p>
          Add a folder with photos to <code>src/series</code> and it will appear here.
        </p>
      </section>
    )
  }

  const sharedItems = new Set()

  return (
    <section className="archive" aria-label="Photo archive">
      <div
        ref={stageRef}
        className="stage"
        tabIndex={0}
        aria-label="Photo grid. Drag, scroll or use the arrow keys to move around."
        data-cursor="Drag"
      >
        <motion.div
          className="world"
          initial={heroImages.length ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {layout.cells.map((c) => {
            const it = archiveItems[c.i]
            const label = `${it.series.title}${it.series.location ? ' · ' + it.series.location : ''}`
            const shareImage = heroImageIds.has(it.id) && !sharedItems.has(it.id)
            if (shareImage) sharedItems.add(it.id)
            const image = (
              <img
                src={it.src}
                alt=""
                draggable={false}
                decoding="async"
                loading="lazy"
              />
            )
            return (
              <button
                key={c.k}
                ref={(el) => {
                  tiles.current[c.k] = el
                }}
                className={`tile${shareImage && heroTransitionComplete ? ' hero-arrive' : ''}`}
                data-item-id={shareImage ? it.id : undefined}
                style={{
                  width: layout.cw,
                  height: layout.ch,
                  ...getCellPlacement(
                    c,
                    layout,
                    pos.current,
                    window.innerWidth,
                    window.innerHeight,
                    shareImage && !heroTransitionComplete
                  ),
                }}
                data-cursor="Open"
                aria-label={label}
                tabIndex={c.k < N ? 0 : -1}
                aria-hidden={c.k >= N ? true : undefined}
                onMouseEnter={() => setCap(label)}
                onFocus={() => setCap(label)}
                onMouseLeave={() => setCap('')}
                onBlur={() => setCap('')}
                onClick={() => {
                  if (moved.current < 6) navigate(`/series/${it.series.slug}/${it.index + 1}`)
                }}
                onTransitionEnd={(event) => {
                  if (event.target === event.currentTarget && event.propertyName === 'transform') {
                    event.currentTarget.classList.remove('hero-arrive')
                  }
                }}
              >
                {it.type === 'title' ? (
                  <span className="in">
                    <span className="ph">{it.series.title}</span>
                  </span>
                ) : (
                  <span className="in">{image}</span>
                )}
              </button>
            )
          })}
        </motion.div>
      </div>
      <div className="vig" />
      <div className="bottom">
        <div className="archive-nav">
          <div className="archive-pad" role="group" aria-label="Move around the archive">
            <button type="button" className="pad-up" aria-label="Move archive up" onClick={() => panArchive(0, 120)}>↑</button>
            <button type="button" className="pad-left" aria-label="Move archive left" onClick={() => panArchive(120, 0)}>←</button>
            <span className="pad-center" aria-hidden="true"><i /></span>
            <button type="button" className="pad-right" aria-label="Move archive right" onClick={() => panArchive(-120, 0)}>→</button>
            <button type="button" className="pad-down" aria-label="Move archive down" onClick={() => panArchive(0, -120)}>↓</button>
          </div>
          <span className="hint-copy">Scroll or drag</span>
        </div>
        <div className="mid">
          <div ref={capRef} className="cap" aria-live="polite" />
        </div>
        <div className="count">
          {N} {N === 1 ? 'item' : 'items'}
        </div>
      </div>
    </section>
  )
}
