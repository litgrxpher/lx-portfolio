// Mountain ridge wind sound synthesizer using Web Audio API.
// Generates realistic alpine wind gusts, low mountain rumble, organic air turbulence whooshes,
// and high-altitude whistle accents modulated in real-time by scroll speed and elevation.

class WindSoundEngine {
  constructor() {
    this.ctx = null
    this.enabled = false
    this.masterGain = null

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
  }

  init() {
    if (this.initialized) return
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    this.ctx = new AudioContext()

    // Master bus
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime)
    this.masterGain.connect(this.ctx.destination)

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
    this.windGain.gain.setValueAtTime(0.5, this.ctx.currentTime)

    // Layer 2: Deep mountain pass sub rumble (cavernous bass air)
    this.rumbleFilter = this.ctx.createBiquadFilter()
    this.rumbleFilter.type = 'lowpass'
    this.rumbleFilter.frequency.setValueAtTime(95, this.ctx.currentTime)
    this.rumbleFilter.Q.setValueAtTime(2.0, this.ctx.currentTime)

    this.rumbleGain = this.ctx.createGain()
    this.rumbleGain.gain.setValueAtTime(0.65, this.ctx.currentTime)

    // Layer 3: High-altitude thin air whistle / hiss
    this.whistleFilter = this.ctx.createBiquadFilter()
    this.whistleFilter.type = 'bandpass'
    this.whistleFilter.frequency.setValueAtTime(1200, this.ctx.currentTime)
    this.whistleFilter.Q.setValueAtTime(3.8, this.ctx.currentTime)

    this.whistleGain = this.ctx.createGain()
    this.whistleGain.gain.setValueAtTime(0.12, this.ctx.currentTime)

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
  }

  // Toggle sound ON / OFF
  async toggle() {
    this.init()
    if (!this.ctx) return false

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }

    this.enabled = !this.enabled
    const now = this.ctx.currentTime

    if (this.enabled) {
      // Fade in master smoothly over 1.4s
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
      this.masterGain.gain.linearRampToValueAtTime(0.78, now + 1.4)

      // Initial organic wind gust on enable
      this.playWhoosh(1)
    } else {
      // Soft fade out
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.6)
    }

    return this.enabled
  }

  // Modulate wind based on scrolling velocity and altitude
  modulate(speed, altRatio) {
    if (!this.enabled || !this.ctx || !this.windFilter) return
    const now = this.ctx.currentTime

    // As user scrolls faster, the wind gusts build up
    const clampedSpeed = Math.min(speed, 2.5)
    const targetFreq = 220 + clampedSpeed * 280 + altRatio * 220
    this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.2)

    // High elevation (e.g. Everest 8849m) boosts the thin air whistle layer
    if (this.whistleGain) {
      const targetWhistleGain = 0.08 + altRatio * 0.28 + clampedSpeed * 0.15
      this.whistleGain.gain.setTargetAtTime(targetWhistleGain, now, 0.25)
    }

    // Fast scrolling increases rumble intensity
    if (this.rumbleFilter) {
      const targetRumbleFreq = 85 + clampedSpeed * 65
      this.rumbleFilter.frequency.setTargetAtTime(targetRumbleFreq, now, 0.2)
    }
  }

  // Mountain ridge wind whoosh / gust sweep when arriving at chapters
  playWhoosh(direction = 1) {
    if (!this.enabled || !this.ctx) return
    const now = this.ctx.currentTime

    // Filtered noise gust sweep
    const bufferSize = this.ctx.sampleRate * 1.4
    const gustBuffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate)
    const g0 = gustBuffer.getChannelData(0)
    const g1 = gustBuffer.getChannelData(1)
    for (let i = 0; i < bufferSize; i++) {
      g0[i] = (Math.random() * 2 - 1) * 0.35
      g1[i] = (Math.random() * 2 - 1) * 0.35
    }

    const gustSrc = this.ctx.createBufferSource()
    gustSrc.buffer = gustBuffer

    const gustFilter = this.ctx.createBiquadFilter()
    gustFilter.type = 'bandpass'
    gustFilter.Q.setValueAtTime(1.8, now)

    const gustGain = this.ctx.createGain()

    const startFreq = direction > 0 ? 200 : 700
    const peakFreq = direction > 0 ? 850 : 250
    const endFreq = 160

    gustFilter.frequency.setValueAtTime(startFreq, now)
    gustFilter.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.45)
    gustFilter.frequency.exponentialRampToValueAtTime(endFreq, now + 1.3)

    gustGain.gain.setValueAtTime(0.001, now)
    gustGain.gain.linearRampToValueAtTime(0.38, now + 0.38)
    gustGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35)

    gustSrc.connect(gustFilter)
    gustFilter.connect(gustGain)
    gustGain.connect(this.masterGain)

    gustSrc.start(now)
    gustSrc.stop(now + 1.4)
  }

  // Soft organic wind drop / mountain pebble click
  playClick(pitchMultiplier = 1) {
    if (!this.enabled || !this.ctx) return
    const now = this.ctx.currentTime

    // Subtle gentle tap like a wind tick / wooden counter
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    const filter = this.ctx.createBiquadFilter()

    osc.type = 'sine'
    const freq = 520 * pitchMultiplier
    osc.frequency.setValueAtTime(freq, now)
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.05)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(600, now)

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)

    osc.start(now)
    osc.stop(now + 0.07)
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
    this.enabled = false
  }
}

export const sound = new WindSoundEngine()
