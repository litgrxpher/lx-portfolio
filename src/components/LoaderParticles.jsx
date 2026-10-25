import { useEffect, useRef } from 'react'

export default function LoaderParticles({ active = true }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId = 0
    let width = 0
    let height = 0
    let dpr = 1
    let disposed = false

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    // Generate balanced star/dust particles across the screen
    const count = Math.min(80, Math.max(45, Math.floor((width * height) / 16000)))
    const particles = Array.from({ length: count }, () => {
      const type = Math.random()
      // Size distribution: 65% tiny distant stars, 25% medium motes, 10% luminous dust with halos
      let radius = 0.6 + Math.random() * 0.5
      let isGlow = false
      if (type > 0.9) {
        radius = 1.8 + Math.random() * 0.7
        isGlow = true
      } else if (type > 0.65) {
        radius = 1.1 + Math.random() * 0.5
      }

      const baseAlpha = 0.22 + Math.random() * 0.55
      const isBlue = Math.random() > 0.35

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius,
        isGlow,
        baseAlpha,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.12 - Math.random() * 0.28, // gentle upward cosmic float
        pulseSpeed: 0.0012 + Math.random() * 0.002,
        pulseOffset: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.0008 + Math.random() * 0.0015,
        wobbleOffset: Math.random() * Math.PI * 2,
        wobbleAmp: 0.3 + Math.random() * 0.5,
        rgb: isBlue ? '186, 230, 253' : '248, 250, 252',
      }
    })

    let lastTime = performance.now()

    const render = (now) => {
      if (disposed) return
      const dt = Math.min((now - lastTime) / 1000, 0.06)
      lastTime = now
      const timeScale = dt * 60

      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Drift upwards with gentle organic horizontal sway
        p.y += p.vy * timeScale
        p.x += (p.vx + Math.sin(now * p.wobbleSpeed + p.wobbleOffset) * p.wobbleAmp) * timeScale

        // Seamless screen wrap
        if (p.y < -12) p.y = height + 12
        else if (p.y > height + 12) p.y = -12
        if (p.x < -12) p.x = width + 12
        else if (p.x > width + 12) p.x = -12

        // Breathing twinkle
        const pulse = Math.sin(now * p.pulseSpeed + p.pulseOffset) * 0.24
        const alpha = Math.max(0.08, Math.min(0.92, p.baseAlpha + pulse))

        // Draw particle body
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.rgb}, ${alpha})`
        ctx.fill()

        // Soft celestial aura for larger motes
        if (p.isGlow) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius * 3.2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${p.rgb}, ${alpha * 0.14})`
          ctx.fill()
        }
      }

      rafId = requestAnimationFrame(render)
    }

    rafId = requestAnimationFrame(render)

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      className="mtn-loader-particles"
      aria-hidden="true"
    />
  )
}

