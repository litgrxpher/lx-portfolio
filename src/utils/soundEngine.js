// Mountain ridge wind sound synthesizer using Web Audio API.
// Generates realistic alpine wind gusts, low mountain rumble, organic air turbulence whooshes,
// and high-altitude whistle accents modulated in real-time by scroll speed and elevation.
// Supports seamless cross-page subtle ambient playback when navigating away from Home.

class WindSoundEngine {
  constructor() {
    this.ctx = null
    this.enabled = typeof window !== 'undefined' && sessionStorage.getItem('site_sound') === 'true'
    this.mode = 'mountain' // 'mountain' (dynamic on Home) | 'subtle' (soft ambient on other pages)
    this.masterGain = null
    this.sfxGain = null

    // Wind layers
    this.windGain = null
    this.rumbleGain = null
    this.whistleGain = null

    // Filters
    this.windFilter = null
    this.windFilter2 = null
    this.rumbleFilter = null
    this.whistleFilter = null

    // Sources & LFOs
    this.windSource = null
    this.lfoGust = null
    this.lfoWhistle = null
    this.initialized = false

    // Subscribers for reactive UI updates
    this.listeners = new Set()
  }

  subscribe(listener) {
    this.listeners.add(listener)
    // Immediately call with current state
    try {
      listener(this.enabled, this.mode)
    } catch {
      /* ignore */
    }
    return () => this.listeners.delete(listener)
  }

  notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.enabled, this.mode)
      } catch {
        /* ignore */
      }
    })
  }

  ensureContext() {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return null
      this.ctx = new AudioContext()
    }
    if (this.ctx.state === 'suspended') {
      try {
        this.ctx.resume()
      } catch {
        /* ignore */
      }
    }
    if (!this.sfxGain) {
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.setValueAtTime(0.42, this.ctx.currentTime)
      this.sfxGain.connect(this.ctx.destination)
    }
    return this.ctx
  }

  init() {
    if (this.initialized) return
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    if (!this.ctx) {
      this.ctx = new AudioContext()
    }

    // Master bus for atmospheric wind (tuned gently so whooshes and clicks sit cleanly on top)
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain()
      const initialTarget = this.enabled ? (this.mode === 'subtle' ? 0.14 : 0.30) : 0
      this.masterGain.gain.setValueAtTime(initialTarget, this.ctx.currentTime)
      this.masterGain.connect(this.ctx.destination)
    }

    // Dedicated bus for tactile UI click sound effects and cinematic gusts
    if (!this.sfxGain) {
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.setValueAtTime(0.42, this.ctx.currentTime)
      this.sfxGain.connect(this.ctx.destination)
    }

    this.setupWindLayers()
    this.initialized = true
  }

  setupWindLayers() {
    if (!this.ctx) return

    // Create a 5-second seamless stereo-like pink/brownian noise buffer for realistic organic wind
    const bufferSize = this.ctx.sampleRate * 5
    const noiseBuffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate)
    const ch0 = noiseBuffer.getChannelData(0)
    const ch1 = noiseBuffer.getChannelData(1)

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    let c0 = 0, c1 = 0, c2 = 0, c3 = 0, c4 = 0, c5 = 0, c6 = 0

    for (let i = 0; i < bufferSize; i++) {
      // Left channel pink noise
      const w0 = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w0 * 0.0555179
      b1 = 0.99332 * b1 + w0 * 0.0750759
      b2 = 0.96900 * b2 + w0 * 0.1538520
      b3 = 0.86650 * b3 + w0 * 0.3104856
      b4 = 0.55000 * b4 + w0 * 0.5329522
      b5 = -0.7616 * b5 - w0 * 0.0168980
      ch0[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w0 * 0.5362) * 0.08
      b6 = w0 * 0.115926

      // Right channel pink noise (slightly decorrelated)
      const w1 = Math.random() * 2 - 1
      c0 = 0.99886 * c0 + w1 * 0.0555179
      c1 = 0.99332 * c1 + w1 * 0.0750759
      c2 = 0.96900 * c2 + w1 * 0.1538520
      c3 = 0.86650 * c3 + w1 * 0.3104856
      c4 = 0.55000 * c4 + w1 * 0.5329522
      c5 = -0.7616 * c5 - w1 * 0.0168980
      ch1[i] = (c0 + c1 + c2 + c3 + c4 + c5 + c6 + w1 * 0.5362) * 0.08
      c6 = w1 * 0.115926
    }

    this.windSource = this.ctx.createBufferSource()
    this.windSource.buffer = noiseBuffer
    this.windSource.loop = true

    // Layer 1: Body wind (gentle howling air)
    this.windFilter = this.ctx.createBiquadFilter()
    this.windFilter.type = 'bandpass'
    this.windFilter.frequency.setValueAtTime(320, this.ctx.currentTime)
    this.windFilter.Q.setValueAtTime(1.4, this.ctx.currentTime)

    this.windFilter2 = this.ctx.createBiquadFilter()
    this.windFilter2.type = 'lowpass'
    this.windFilter2.frequency.setValueAtTime(800, this.ctx.currentTime)

    this.windGain = this.ctx.createGain()
    this.windGain.gain.setValueAtTime(0.28, this.ctx.currentTime)

    // Layer 2: Deep mountain pass sub rumble (cavernous bass air)
    this.rumbleFilter = this.ctx.createBiquadFilter()
    this.rumbleFilter.type = 'lowpass'
    this.rumbleFilter.frequency.setValueAtTime(95, this.ctx.currentTime)
    this.rumbleFilter.Q.setValueAtTime(2.0, this.ctx.currentTime)

    this.rumbleGain = this.ctx.createGain()
    this.rumbleGain.gain.setValueAtTime(0.32, this.ctx.currentTime)

    // Layer 3: High-altitude thin air whistle / hiss
    this.whistleFilter = this.ctx.createBiquadFilter()
    this.whistleFilter.type = 'bandpass'
    this.whistleFilter.frequency.setValueAtTime(1200, this.ctx.currentTime)
    this.whistleFilter.Q.setValueAtTime(3.8, this.ctx.currentTime)

    this.whistleGain = this.ctx.createGain()
    this.whistleGain.gain.setValueAtTime(0.06, this.ctx.currentTime)

    // Natural breathing LFO that creates undulating wind gusts
    this.lfoGust = this.ctx.createOscillator()
    this.lfoGust.frequency.setValueAtTime(0.18, this.ctx.currentTime) // undulating every ~5.5s
    const lfoGustGain = this.ctx.createGain()
    lfoGustGain.gain.setValueAtTime(160, this.ctx.currentTime)
    this.lfoGust.connect(lfoGustGain)
    lfoGustGain.connect(this.windFilter.frequency)

    this.lfoWhistle = this.ctx.createOscillator()
    this.lfoWhistle.frequency.setValueAtTime(0.24, this.ctx.currentTime)
    const lfoWhistleGain = this.ctx.createGain()
    lfoWhistleGain.gain.setValueAtTime(0.08, this.ctx.currentTime)
    this.lfoWhistle.connect(lfoWhistleGain)
    lfoWhistleGain.connect(this.whistleGain.gain)

    // Graph routing
    this.windSource.connect(this.windFilter)
    this.windFilter.connect(this.windFilter2)
    this.windFilter2.connect(this.windGain)
    this.windGain.connect(this.masterGain)

    this.windSource.connect(this.rumbleFilter)
    this.rumbleFilter.connect(this.rumbleGain)
    this.rumbleGain.connect(this.masterGain)

    this.windSource.connect(this.whistleFilter)
    this.whistleFilter.connect(this.whistleGain)
    this.whistleGain.connect(this.masterGain)

    // Start loops
    this.windSource.start()
    this.lfoGust.start()
    this.lfoWhistle.start()

    // Apply current mode styling immediately if initialized in subtle mode
    if (this.mode === 'subtle') {
      this.applySubtleMode(this.ctx.currentTime, 0.01)
    }
  }

  // Switch between mountain ridge wind (Home) and subtle soothing ambient (other pages)
  setMode(mode = 'mountain') {
    if (this.mode === mode) return
    this.mode = mode

    if (this.ctx && this.initialized && this.enabled) {
      const now = this.ctx.currentTime
      if (mode === 'subtle') {
        this.applySubtleMode(now, 1.2)
      } else {
        this.applyMountainMode(now, 1.2)
      }
    }

    this.notify()
  }

  applySubtleMode(time, duration = 1.0) {
    if (!this.masterGain) return
    // Smooth soothing room tone / gentle air
    this.masterGain.gain.setTargetAtTime(0.12, time, duration * 0.3)
    if (this.windFilter) {
      this.windFilter.frequency.setTargetAtTime(190, time, duration * 0.3)
      this.windFilter.Q.setTargetAtTime(0.8, time, duration * 0.3)
    }
    if (this.rumbleFilter) {
      this.rumbleFilter.frequency.setTargetAtTime(65, time, duration * 0.3)
    }
    if (this.rumbleGain) {
      this.rumbleGain.gain.setTargetAtTime(0.15, time, duration * 0.3)
    }
    if (this.whistleGain) {
      this.whistleGain.gain.setTargetAtTime(0.003, time, duration * 0.3)
    }
  }

  applyMountainMode(time, duration = 1.0) {
    if (!this.masterGain) return
    // Balanced background presence (0.28) allowing whooshes (0.60) and clicks (0.42) to cut through cleanly
    this.masterGain.gain.setTargetAtTime(0.28, time, duration * 0.3)
    if (this.windFilter) {
      this.windFilter.frequency.setTargetAtTime(300, time, duration * 0.3)
      this.windFilter.Q.setTargetAtTime(1.3, time, duration * 0.3)
    }
    if (this.rumbleFilter) {
      this.rumbleFilter.frequency.setTargetAtTime(90, time, duration * 0.3)
    }
    if (this.rumbleGain) {
      this.rumbleGain.gain.setTargetAtTime(0.32, time, duration * 0.3)
    }
    if (this.whistleGain) {
      this.whistleGain.gain.setTargetAtTime(0.06, time, duration * 0.3)
    }
  }

  // Auto-resume if enabled in sessionStorage but context was suspended by browser autoplay policy
  async unlock() {
    if (!this.enabled) return
    this.init()
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume()
        const now = this.ctx.currentTime
        const target = this.mode === 'subtle' ? 0.12 : 0.28
        this.masterGain.gain.cancelScheduledValues(now)
        this.masterGain.gain.setValueAtTime(0.001, now)
        this.masterGain.gain.linearRampToValueAtTime(target, now + 1.2)
      } catch {
        /* ignore */
      }
    }
  }

  // Toggle sound ON / OFF
  async toggle() {
    this.init()
    if (!this.ctx) return false

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }

    this.enabled = !this.enabled
    try {
      sessionStorage.setItem('site_sound', this.enabled ? 'true' : 'false')
    } catch {
      /* ignore */
    }

    const now = this.ctx.currentTime

    if (this.enabled) {
      const targetGain = this.mode === 'subtle' ? 0.12 : 0.28
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value || 0.001, now)
      this.masterGain.gain.linearRampToValueAtTime(targetGain, now + 1.2)

      this.playUiClick('interactive', 1.1)

      if (this.mode === 'mountain') {
        this.playWhoosh(1)
      }
    } else {
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.6)
    }

    this.notify()
    return this.enabled
  }

  // Modulate wind based on scrolling velocity and altitude (only in mountain mode)
  modulate(speed, altRatio) {
    if (!this.enabled || !this.ctx || !this.windFilter || this.mode !== 'mountain') return
    const now = this.ctx.currentTime

    // As user scrolls faster, the wind gusts build up gently without overpowering SFX
    const clampedSpeed = Math.min(speed, 2.0)
    const targetFreq = 180 + clampedSpeed * 160 + altRatio * 140
    this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.2)

    // High elevation (e.g. Everest 8849m) boosts the thin air whistle layer gently
    if (this.whistleGain) {
      const targetWhistleGain = 0.04 + altRatio * 0.10 + clampedSpeed * 0.06
      this.whistleGain.gain.setTargetAtTime(targetWhistleGain, now, 0.25)
    }

    // Fast scrolling increases rumble intensity subtly
    if (this.rumbleFilter) {
      const targetRumbleFreq = 75 + clampedSpeed * 35
      this.rumbleFilter.frequency.setTargetAtTime(targetRumbleFreq, now, 0.2)
    }
  }

  // Mountain ridge wind whoosh / gust sweep when arriving at chapters
  playWhoosh(direction = 1) {
    if (!this.enabled || !this.ctx || this.mode !== 'mountain') return
    const now = this.ctx.currentTime

    // Filtered noise gust sweep with clean presence and stereo width
    const bufferSize = this.ctx.sampleRate * 1.3
    const gustBuffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate)
    const g0 = gustBuffer.getChannelData(0)
    const g1 = gustBuffer.getChannelData(1)
    for (let i = 0; i < bufferSize; i++) {
      g0[i] = (Math.random() * 2 - 1) * 0.45
      g1[i] = (Math.random() * 2 - 1) * 0.45
    }

    const gustSrc = this.ctx.createBufferSource()
    gustSrc.buffer = gustBuffer

    const gustFilter = this.ctx.createBiquadFilter()
    gustFilter.type = 'bandpass'
    gustFilter.Q.setValueAtTime(1.9, now)

    const gustGain = this.ctx.createGain()

    const startFreq = direction > 0 ? 220 : 780
    const peakFreq = direction > 0 ? 920 : 280
    const endFreq = 160

    gustFilter.frequency.setValueAtTime(startFreq, now)
    gustFilter.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.38)
    gustFilter.frequency.exponentialRampToValueAtTime(endFreq, now + 1.2)

    gustGain.gain.setValueAtTime(0.001, now)
    gustGain.gain.linearRampToValueAtTime(0.60, now + 0.32)
    gustGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25)

    gustSrc.connect(gustFilter)
    gustFilter.connect(gustGain)
    // Route whoosh through sfxGain so it stays clearly audible above background breeze
    gustGain.connect(this.sfxGain || this.masterGain)

    gustSrc.start(now)
    gustSrc.stop(now + 1.3)
  }

  // Tactile UI click sound effect synthesizer (only active when site sound toggle is on):
  // - 'interactive': Authentic camera shutter actuation / tactile microswitch click
  // - 'tick': Precision f-stop / dial ratchet stepper tick
  // - 'tap': Soft organic tactile feedback for general background clicks
  playUiClick(type = 'interactive', pitchMultiplier = 1) {
    if (!this.enabled) return
    const ctx = this.ensureContext()
    if (!ctx || !this.sfxGain) return
    const now = ctx.currentTime

    // Subtle micro-pitch jitter for organic tactile realism (0.97 - 1.03)
    const jitter = 0.97 + Math.random() * 0.06
    const p = Math.max(0.2, pitchMultiplier * jitter)

    if (type === 'interactive' || type === 'shutter') {
      // 1. Crisp high-frequency contact transient (the "tick")
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      const filter1 = ctx.createBiquadFilter()

      osc1.type = 'triangle'
      osc1.frequency.setValueAtTime(2200 * p, now)
      osc1.frequency.exponentialRampToValueAtTime(Math.max(10, 480 * p), now + 0.016)

      filter1.type = 'bandpass'
      filter1.frequency.setValueAtTime(1900 * p, now)
      filter1.Q.setValueAtTime(1.8, now)

      gain1.gain.setValueAtTime(0.001, now)
      gain1.gain.linearRampToValueAtTime(0.28, now + 0.0015)
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.02)

      osc1.connect(filter1)
      filter1.connect(gain1)
      gain1.connect(this.sfxGain)

      osc1.start(now)
      osc1.stop(now + 0.022)

      // 2. Mechanical body resonance / shutter curtain leaf (the "clack")
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      const filter2 = ctx.createBiquadFilter()

      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(360 * p, now)
      osc2.frequency.exponentialRampToValueAtTime(Math.max(10, 95 * p), now + 0.036)

      filter2.type = 'lowpass'
      filter2.frequency.setValueAtTime(750 * p, now)

      gain2.gain.setValueAtTime(0.001, now)
      gain2.gain.linearRampToValueAtTime(0.22, now + 0.002)
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.04)

      osc2.connect(filter2)
      filter2.connect(gain2)
      gain2.connect(this.sfxGain)

      osc2.start(now)
      osc2.stop(now + 0.042)

      // 3. Ultra-short mechanical noise puff (simulates mirror/shutter leaf motion)
      try {
        const noiseLen = Math.floor(ctx.sampleRate * 0.015)
        const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate)
        const data = noiseBuf.getChannelData(0)
        for (let i = 0; i < noiseLen; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseLen * 0.35))
        }
        const noiseSrc = ctx.createBufferSource()
        noiseSrc.buffer = noiseBuf

        const nFilter = ctx.createBiquadFilter()
        nFilter.type = 'bandpass'
        nFilter.frequency.setValueAtTime(2600 * p, now)
        nFilter.Q.setValueAtTime(1.4, now)

        const nGain = ctx.createGain()
        nGain.gain.setValueAtTime(0.08, now)
        nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015)

        noiseSrc.connect(nFilter)
        nFilter.connect(nGain)
        nGain.connect(this.sfxGain)

        noiseSrc.start(now)
        noiseSrc.stop(now + 0.016)
      } catch {
        /* ignore noise buffer error */
      }
    } else if (type === 'tick') {
      // Precision ratchet/dial tick
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1550 * p, now)
      osc.frequency.exponentialRampToValueAtTime(Math.max(10, 620 * p), now + 0.012)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.18, now + 0.001)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014)

      osc.connect(gain)
      gain.connect(this.sfxGain)
      osc.start(now)
      osc.stop(now + 0.016)
    } else {
      // 'tap': Soft, tactile organic tap for general background clicks
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(280 * p, now)
      osc.frequency.exponentialRampToValueAtTime(Math.max(10, 85 * p), now + 0.026)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(520, now)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.09, now + 0.002)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.sfxGain)

      osc.start(now)
      osc.stop(now + 0.032)
    }
  }

  // Soft organic tactile click (backward compatible with existing callers)
  playClick(pitchMultiplier = 1) {
    if (!this.enabled) return
    this.playUiClick('interactive', pitchMultiplier)
  }

  destroy() {
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close()
      } catch {
        /* ignore */
      }
    }
    this.initialized = false
    this.ctx = null
    this.sfxGain = null
    this.masterGain = null
    this.enabled = false
    this.notify()
  }
}

export const sound = new WindSoundEngine()
