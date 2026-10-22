import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { allItems, series, hasVideo } from '../data/series'

const N = allItems.length
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
    const block = shuffle(allItems.map((_, i) => i))
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
      bx: col * sx + (row % 2) * sx * 0.28 + (((k * 37) % 11) - 5) * 3,
      by: row * sy + (((k * 53) % 9) - 4) * 3,
      rot: (((k * 29) % 9) - 4) * 0.45,
    })
  }
  return { cw, ch, bw: cols * sx + sx * 0.3, bh: rows * sy, cells }
}

const filters = ['All', ...new Set(series.map((s) => s.title)), ...(hasVideo ? ['Video'] : [])]

export default function Archive() {
  const navigate = useNavigate()
  const orderRef = useRef([])
  const [layout, setLayout] = useState(() =>
    N ? computeLayout(window.innerWidth, window.innerHeight, orderRef.current) : { cells: [] }
  )
  const [filter, setFilter] = useState('All')
  const stageRef = useRef(null)
  const capRef = useRef(null)
  const tiles = useRef([])
  const vids = useRef([])
  const pos = useRef({ x: 0, y: 0 })
  const moved = useRef(0)

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
    const { cw, ch, bw, bh, cells } = layout
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
        const v = vids.current[c.k]
        const x = mod(c.bx + p.x + cw, bw) - cw
        const y = mod(c.by + p.y + ch, bh) - ch
        const s = el.style
        if (x > vw || x < -cw || y > vh || y < -ch) {
          s.visibility = 'hidden'
          if (v && !v.paused) v.pause()
          continue
        }
        s.visibility = 'visible'
        if (v && v.paused && !reduce) {
          const pr = v.play()
          if (pr && pr.catch) pr.catch(() => {})
        }
        const nx = (x + cw / 2 - vw / 2) / (vw / 2)
        const ny = (y + ch / 2 - vh / 2) / (vh / 2)
        const r = Math.min(1.4, Math.hypot(nx, ny * 0.9))
        s.transform = `translate3d(${x}px,${y}px,0) rotateY(${-nx * 14}deg) rotateX(${ny * 10}deg) rotate(${c.rot}deg) scale(${1 - (0.2 * r * r) / 1.4})`
        s.opacity = Math.max(0.15, 1 - Math.max(0, r - 0.65) * 0.9)
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
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    stage.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    draw()

    return () => {
      cancelAnimationFrame(raf)
      stage.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      stage.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [layout])

  const setCap = (text) => {
    if (capRef.current) capRef.current.textContent = text
  }
  const isDim = (it) =>
    filter !== 'All' && (filter === 'Video' ? it.type !== 'video' : it.series.title !== filter)
  const count = allItems.filter((it) => !isDim(it)).length

  if (!N) {
    return (
      <section className="archive empty">
        <p>
          Add a folder with photos to <code>src/series</code> and it will appear here.
        </p>
      </section>
    )
  }

  return (
    <section className="archive" aria-label="Photo and video archive">
      <div
        ref={stageRef}
        className="stage"
        tabIndex={0}
        aria-label="Photo grid. Drag, scroll or use the arrow keys to move around."
        data-cursor="Drag"
      >
        <motion.div
          className="world"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {layout.cells.map((c) => {
            const it = allItems[c.i]
            const label = `${it.series.title}${it.series.location ? ' · ' + it.series.location : ''}`
            return (
              <button
                key={c.k}
                ref={(el) => {
                  tiles.current[c.k] = el
                }}
                className={'tile' + (isDim(it) ? ' dim' : '')}
                style={{ width: layout.cw, height: layout.ch }}
                data-cursor="Open"
                aria-label={`${label}, ${it.type}`}
                tabIndex={c.k < N ? 0 : -1}
                aria-hidden={c.k >= N ? true : undefined}
                onMouseEnter={() => setCap(label)}
                onFocus={() => setCap(label)}
                onMouseLeave={() => setCap('')}
                onBlur={() => setCap('')}
                onClick={() => {
                  if (moved.current < 6) navigate(`/series/${it.series.slug}/${it.index + 1}`)
                }}
              >
                <span className="in">
                  {it.type === 'video' ? (
                    <>
                      <video
                        ref={(el) => {
                          vids.current[c.k] = el
                        }}
                        src={it.src}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                      />
                      <i className="badge">Video</i>
                    </>
                  ) : (
                    <img src={it.src} alt="" draggable={false} decoding="async" />
                  )}
                </span>
              </button>
            )
          })}
        </motion.div>
      </div>
      <div className="vig" />
      <div className="bottom">
        <div className="hint">Scroll or drag to shift</div>
        <div className="mid">
          <div ref={capRef} className="cap" aria-live="polite" />
          <div className="filters">
            {filters.map((f) => (
              <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="count">
          {count} {count === 1 ? 'item' : 'items'}
        </div>
      </div>
    </section>
  )
}
