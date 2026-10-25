import { useEffect, useRef, useState } from 'react'
import { sound } from '../utils/soundEngine'
import './ApertureDial.css'

const C = 100
const F_MIN = 1.4
const F_MAX = 16
const STEPS = 21
const LIGHT = [243, 240, 234]
const DARK = [0, 0, 0]
const FG_LIGHT = [242, 240, 235]
const FG_DARK = [17, 17, 17]

const rad = (degrees) => (degrees * Math.PI) / 180
const point = (radius, degrees) => [C + radius * Math.sin(rad(degrees)), C - radius * Math.cos(rad(degrees))]
const lerp = (a, b, amount) => a + (b - a) * amount
const mix = (a, b, amount) => a.map((value, index) => Math.round(lerp(value, b[index], amount)))
const clamp = (value) => Math.min(1, Math.max(0, value))
const smooth = (a, b, value) => {
  const amount = clamp((value - a) / (b - a))
  return amount * amount * (3 - 2 * amount)
}

const TICKS = Array.from({ length: STEPS + 1 }, (_, index) => {
  const angle = 135 - (270 * index) / STEPS
  const major = index % 3 === 0
  const [x1, y1] = point(major ? 74 : 78, angle)
  const [x2, y2] = point(94, angle)
  return { index, x1, y1, x2, y2, major }
})

function applyTheme(value) {
  const background = mix(LIGHT, DARK, value)
  const foreground = mix(FG_DARK, FG_LIGHT, smooth(0.35, 0.65, value))
  const mute = mix([112, 110, 105], [141, 139, 148], smooth(0.35, 0.65, value))
  const line = mix([205, 202, 195], [40, 40, 44], value)
  const surface = mix([231, 228, 220], [23, 23, 26], value)
  const rgb = (color) => color.join(', ')
  const cssColor = (color) => `rgb(${rgb(color)})`
  const root = document.documentElement

  root.style.setProperty('--bg', cssColor(background))
  root.style.setProperty('--bg-rgb', rgb(background))
  root.style.setProperty('--ink', cssColor(foreground))
  root.style.setProperty('--mute', cssColor(mute))
  root.style.setProperty('--line', cssColor(line))
  root.style.setProperty('--surface', cssColor(surface))
  root.style.colorScheme = value < 0.5 ? 'light' : 'dark'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cssColor(background))
}

export default function ApertureDial() {
  const [value, setValue] = useState(1)
  const [compact, setCompact] = useState(false)
  const [open, setOpen] = useState(false)
  const dial = useRef(null)
  const drag = useRef({ on: false, previous: 0 })
  const idle = useRef(0)
  const lastStop = useRef(-1)

  const expanded = !compact || open

  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px), (pointer: coarse)')
    const update = () => setCompact(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    applyTheme(value)
    const stop = Math.floor(value * 7)
    if (lastStop.current !== -1 && stop !== lastStop.current) {
      navigator.vibrate?.(8)
      if (sound.enabled) sound.playUiClick('tick')
    }
    lastStop.current = stop
  }, [value])

  useEffect(() => () => applyTheme(1), [])

  useEffect(() => {
    const node = dial.current
    const onWheel = (event) => {
      event.preventDefault()
      setValue((previous) => clamp(previous + (event.deltaY > 0 ? 1 : -1) / STEPS))
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => () => clearTimeout(idle.current), [])

  const wake = () => {
    setOpen(true)
    clearTimeout(idle.current)
    idle.current = setTimeout(() => setOpen(false), 2500)
  }

  const angleAt = (event) => {
    const bounds = dial.current.getBoundingClientRect()
    return (Math.atan2(
      event.clientY - (bounds.top + bounds.height / 2),
      event.clientX - (bounds.left + bounds.width / 2),
    ) * 180) / Math.PI
  }

  const onPointerDown = (event) => {
    event.stopPropagation()
    wake()
    if (!expanded) return
    drag.current = { on: true, previous: angleAt(event) }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event) => {
    if (!drag.current.on) return
    const angle = angleAt(event)
    let difference = angle - drag.current.previous
    if (difference > 180) difference -= 360
    if (difference < -180) difference += 360
    drag.current.previous = angle
    setValue((previous) => clamp(previous + difference / 270))
    wake()
  }

  const onKeyDown = (event) => {
    const movement = {
      ArrowRight: 1 / STEPS,
      ArrowUp: 1 / STEPS,
      ArrowLeft: -1 / STEPS,
      ArrowDown: -1 / STEPS,
      PageUp: 1 / 7,
      PageDown: -1 / 7,
    }[event.key]
    if (movement !== undefined) {
      event.preventDefault()
      setValue((previous) => clamp(previous + movement))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setValue(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setValue(1)
    }
  }

  const aperture = F_MIN * Math.pow(F_MAX / F_MIN, value)
  const radius = Math.max(4, 61.6 / aperture)
  const rotation = -value * 70
  const facets = Array.from({ length: 8 }, (_, index) => {
    const start = index * 45 + rotation
    const end = (index + 1) * 45 + rotation
    return [point(radius, start), point(radius, end), point(70, end + 40), point(70, start + 40)]
      .map((coordinate) => `${coordinate[0].toFixed(2)},${coordinate[1].toFixed(2)}`)
      .join(' ')
  })
  const label = `f/${aperture < 10 ? aperture.toFixed(1).replace('.0', '') : Math.round(aperture)}`

  return (
    <div className={`lens ${expanded ? 'is-open' : 'is-compact'}`}>
      <div
        ref={dial}
        className="dial"
        tabIndex={0}
        role="slider"
        aria-label="Aperture: sets how light or dark the site is"
        aria-valuemin={F_MIN}
        aria-valuemax={F_MAX}
        aria-valuenow={+aperture.toFixed(1)}
        aria-valuetext={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current.on = false }}
        onPointerCancel={() => { drag.current.on = false }}
        onKeyDown={onKeyDown}
        onFocus={wake}
      >
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <radialGradient id="ap-glass" cx="38%" cy="35%" r="75%">
              <stop offset="0" stopColor="#9fb4ff" />
              <stop offset=".5" stopColor="#3b3f8f" />
              <stop offset="1" stopColor="#0d0d22" />
            </radialGradient>
            <clipPath id="ap-clip"><circle cx="100" cy="100" r="62" /></clipPath>
          </defs>
          <circle cx="100" cy="100" r="99" fill="#151517" />
          <g transform={`rotate(${(-135 + 270 * value).toFixed(2)} 100 100)`}>
            <circle cx="100" cy="100" r="87" fill="none" stroke="#26262a" strokeWidth="16" strokeDasharray="2 3.2" />
            {TICKS.map((tick) => (
              <line
                key={tick.index} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2}
                stroke={tick.major ? '#f2f0eb' : '#77777f'}
                strokeWidth={tick.major ? 2.2 : 1.2} strokeLinecap="round"
              />
            ))}
          </g>
          <circle cx="100" cy="100" r="66" fill="#0b0b0d" />
          <circle cx="100" cy="100" r="62" fill="url(#ap-glass)" />
          <g clipPath="url(#ap-clip)">
            {facets.map((points, index) => (
              <polygon key={index} points={points} fill={index % 2 ? '#1d1d22' : '#26262c'} stroke="#4a4a52" strokeWidth="1" />
            ))}
          </g>
          <circle cx="100" cy="100" r="62" fill="none" stroke="#3a3a40" strokeWidth="2" />
          <path d="M100 3 L94 15 L106 15 Z" fill="#ff5a36" />
        </svg>
      </div>
      <div className="read" aria-hidden="true">{label}</div>
      <div className="dial-hint" aria-hidden="true">TURN ↺ FOR LIGHT</div>
    </div>
  )
}
