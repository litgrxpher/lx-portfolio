// Studio-grade Cinematic Soundscape & Tactile Haptics Engine using Web Audio API.
// Generates a warm, luxurious analog ambient soundscape, elegant chapter transitions,
// and precision camera/acoustic micro-haptic clicks for interactive elements.
// Replaces harsh wind noise with warm cinematic depth and refined tactile feedback.

class SoundEngine {
  constructor() {
    this.ctx = null
    this.enabled = typeof window !== 'undefined' && sessionStorage.getItem('site_sound') === 'true'
    this.mode = 'mountain' // 'mountain' (cinematic depth on Home) | 'subtle' (warm gallery ambient on other pages)
    this.masterGain = null
    this.sfxGain = null
    this.compressor = null

    // Harmonic ambient drone layers
    this.droneGain = null
    this.droneFilter = null
    this.droneOscs = []
    this.droneLfo = null

    // Velvet room air texture (warm, gentle, non-hissing room tone)
    this.airGain = null
    this.airFilter = null
    this.airFilter2 = null
    this.airSource = null
    this.airLfo = null

    // Shimmer harmonic layer
    this.shimmerGain = null
    this.shimmerOsc = null

    this.initialized = false

    // Subscribers for reactive UI updates
    this.listeners = new Set()
  }

  subscribe(listener) {
    this.listeners.add(listener)
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
      this.sfxGain.gain.setValueAtTime(0.55, this.ctx.currentTime)
      if (this.compressor) {
        this.sfxGain.connect(this.compressor)
      } else {
        this.sfxGain.connect(this.ctx.destination)
      }
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

    const now = this.ctx.currentTime

    // Studio Mastering Limiter / Soft Dynamics Compressor
    // Keeps sound silky and smooth, gluing the layers together with zero distortion
    if (!this.compressor) {
      this.compressor = this.ctx.createDynamicsCompressor()
      this.compressor.threshold.setValueAtTime(-18, now)
      this.compressor.knee.setValueAtTime(12, now)
      this.compressor.ratio.setValueAtTime(4, now)
      this.compressor.attack.setValueAtTime(0.003, now)
      this.compressor.release.setValueAtTime(0.25, now)
      this.compressor.connect(this.ctx.destination)
    }

    // Master bus for atmospheric ambient bed
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain()
      const initialTarget = this.enabled ? (this.mode === 'subtle' ? 0.09 : 0.22) : 0
      this.masterGain.gain.setValueAtTime(initialTarget, now)
      this.masterGain.connect(this.compressor)
    }

    // Dedicated bus for tactile UI clicks and cinematic transition swells
    if (!this.sfxGain) {
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.setValueAtTime(0.55, now)
      this.sfxGain.connect(this.compressor)
    }

    this.setupHarmonicLayers()
    this.setupVelvetAir()
    this.initialized = true
  }

  // Layer 1: Warm Analog Harmonic Drone (Tuned chordal foundation in D / A)
  setupHarmonicLayers() {
    if (!this.ctx) return
    const now = this.ctx.currentTime

    // Analog Moog-style smooth lowpass filter
    this.droneFilter = this.ctx.createBiquadFilter()
    this.droneFilter.type = 'lowpass'
    this.droneFilter.frequency.setValueAtTime(340, now)
    this.droneFilter.Q.setValueAtTime(0.85, now)

    this.droneGain = this.ctx.createGain()
    this.droneGain.gain.setValueAtTime(0.40, now)

    // Harmonic Chords:
    // Root 1: Sub bass A1 (55.0Hz) - warm cinematic foundation
    // Root 2: Mid body E2 (82.4Hz) - rich fifth warmth (triangle wave for subtle analog overtone)
    // Root 3: Octave A2 (110.0Hz) - spatial presence
    // Root 4: Minor Third C3 (130.8Hz) - deep contemplative cinematic emotion
    const chordNotes = [
      { freq: 55.0, type: 'sine', gain: 0.38 },
      { freq: 82.4, type: 'triangle', gain: 0.22 },
      { freq: 110.0, type: 'sine', gain: 0.18 },
      { freq: 130.8, type: 'sine', gain: 0.12 },
    ]

    this.droneOscs = chordNotes.map(({ freq, type, gain }) => {
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, now)
      g.gain.setValueAtTime(gain, now)

      osc.connect(g)
      g.connect(this.droneFilter)
      osc.start(now)
      return osc
    })

    // High crystalline shimmer overtone (A4: 440Hz, very subtle, like light on water or mountain peaks)
    this.shimmerOsc = this.ctx.createOscillator()
    this.shimmerOsc.type = 'sine'
    this.shimmerOsc.frequency.setValueAtTime(440, now)

    this.shimmerGain = this.ctx.createGain()
    this.shimmerGain.gain.setValueAtTime(0.04, now)

    this.shimmerOsc.connect(this.shimmerGain)
    this.shimmerGain.connect(this.droneFilter)
    this.shimmerOsc.start(now)

    // Slow, meditative LFO (0.05Hz = 20-second breath) that gently swells the harmonic chord
    this.droneLfo = this.ctx.createOscillator()
    this.droneLfo.type = 'sine'
    this.droneLfo.frequency.setValueAtTime(0.05, now)

    const droneLfoGain = this.ctx.createGain()
    droneLfoGain.gain.setValueAtTime(45, now)

    this.droneLfo.connect(droneLfoGain)
    droneLfoGain.connect(this.droneFilter.frequency)
    this.droneLfo.start(now)

    // Route drone to master
    this.droneFilter.connect(this.droneGain)
    this.droneGain.connect(this.masterGain)
  }

  // Layer 2: Velvet Room Air (Replaces harsh whistling wind with warm analog room tone / tape air)
  setupVelvetAir() {
    if (!this.ctx) return
    const now = this.ctx.currentTime

    // 6-second decorrelated stereo noise buffer (pink noise characteristics)
    const bufferSize = this.ctx.sampleRate * 6
    const airBuffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate)
    const ch0 = airBuffer.getChannelData(0)
    const ch1 = airBuffer.getChannelData(1)

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0
    let c0 = 0, c1 = 0, c2 = 0, c3 = 0, c4 = 0, c5 = 0

    for (let i = 0; i < bufferSize; i++) {
      const w0 = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w0 * 0.0555
      b1 = 0.99332 * b1 + w0 * 0.0750
      b2 = 0.96900 * b2 + w0 * 0.1538
      b3 = 0.86650 * b3 + w0 * 0.3104
      b4 = 0.55000 * b4 + w0 * 0.5329
      b5 = -0.7616 * b5 - w0 * 0.0168
      ch0[i] = (b0 + b1 + b2 + b3 + b4 + b5 + w0 * 0.536) * 0.05

      const w1 = Math.random() * 2 - 1
      c0 = 0.99886 * c0 + w1 * 0.0555
      c1 = 0.99332 * c1 + w1 * 0.0750
      c2 = 0.96900 * c2 + w1 * 0.1538
      c3 = 0.86650 * c3 + w1 * 0.3104
      c4 = 0.55000 * c4 + w1 * 0.5329
      c5 = -0.7616 * c5 - w1 * 0.0168
      ch1[i] = (c0 + c1 + c2 + c3 + c4 + c5 + w1 * 0.536) * 0.05
    }

    this.airSource = this.ctx.createBufferSource()
    this.airSource.buffer = airBuffer
    this.airSource.loop = true

    // Two cascaded steep lowpass filters (24dB/oct) to completely eliminate harsh high-frequency noise
    this.airFilter = this.ctx.createBiquadFilter()
    this.airFilter.type = 'lowpass'
    this.airFilter.frequency.setValueAtTime(260, now)
    this.airFilter.Q.setValueAtTime(0.7, now)

    this.airFilter2 = this.ctx.createBiquadFilter()
    this.airFilter2.type = 'lowpass'
    this.airFilter2.frequency.setValueAtTime(420, now)
    this.airFilter2.Q.setValueAtTime(0.7, now)

    this.airGain = this.ctx.createGain()
    this.airGain.gain.setValueAtTime(0.18, now)

    // Gentle breathing LFO (0.07Hz) that imparts organic motion
    this.airLfo = this.ctx.createOscillator()
    this.airLfo.frequency.setValueAtTime(0.07, now)
    const airLfoGain = this.ctx.createGain()
    airLfoGain.gain.setValueAtTime(0.04, now)
    this.airLfo.connect(airLfoGain)
    airLfoGain.connect(this.airGain.gain)

    // Route air layers
    this.airSource.connect(this.airFilter)
    this.airFilter.connect(this.airFilter2)
    this.airFilter2.connect(this.airGain)
    this.airGain.connect(this.masterGain)

    this.airSource.start(now)
    this.airLfo.start(now)

    if (this.mode === 'subtle') {
      this.applySubtleMode(now, 0.01)
    }
  }

  // Switch between cinematic depth (Home) and subtle gallery room tone (other pages)
  setMode(mode = 'mountain') {
    if (this.mode === mode) return
    this.mode = mode

    if (this.ctx && this.initialized && this.enabled) {
      const now = this.ctx.currentTime
      if (mode === 'subtle') {
        this.applySubtleMode(now, 1.4)
      } else {
        this.applyMountainMode(now, 1.4)
      }
    }

    this.notify()
  }

  applySubtleMode(time, duration = 1.0) {
    if (!this.masterGain) return
    this.masterGain.gain.setTargetAtTime(0.09, time, duration * 0.3)
    if (this.droneFilter) {
      this.droneFilter.frequency.setTargetAtTime(220, time, duration * 0.3)
      this.droneFilter.Q.setTargetAtTime(0.7, time, duration * 0.3)
    }
    if (this.droneGain) {
      this.droneGain.gain.setTargetAtTime(0.28, time, duration * 0.3)
    }
    if (this.airGain) {
      this.airGain.gain.setTargetAtTime(0.08, time, duration * 0.3)
    }
    if (this.shimmerGain) {
      this.shimmerGain.gain.setTargetAtTime(0.015, time, duration * 0.3)
    }
  }

  applyMountainMode(time, duration = 1.0) {
    if (!this.masterGain) return
    this.masterGain.gain.setTargetAtTime(0.22, time, duration * 0.3)
    if (this.droneFilter) {
      this.droneFilter.frequency.setTargetAtTime(340, time, duration * 0.3)
      this.droneFilter.Q.setTargetAtTime(0.85, time, duration * 0.3)
    }
    if (this.droneGain) {
      this.droneGain.gain.setTargetAtTime(0.40, time, duration * 0.3)
    }
    if (this.airGain) {
      this.airGain.gain.setTargetAtTime(0.18, time, duration * 0.3)
    }
    if (this.shimmerGain) {
      this.shimmerGain.gain.setTargetAtTime(0.04, time, duration * 0.3)
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
        const target = this.mode === 'subtle' ? 0.09 : 0.22
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
      const targetGain = this.mode === 'subtle' ? 0.09 : 0.22
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value || 0.001, now)
      this.masterGain.gain.linearRampToValueAtTime(targetGain, now + 1.2)

      // Play soft luxury harmonic chime on turn on
      this.playChime(true)
    } else {
      // Play subtle descending release chime on turn off
      this.playChime(false)

      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.6)
    }

    this.notify()
    return this.enabled
  }

  // Modulate soundscape with scroll velocity and elevation (Home mountain journey)
  // Glides harmonic warmth smoothly rather than creating harsh whistling noise
  modulate(speed, altRatio) {
    if (!this.enabled || !this.ctx || !this.droneFilter || this.mode !== 'mountain') return
    const now = this.ctx.currentTime

    const clampedSpeed = Math.min(speed, 2.0)
    // Filter opens smoothly into warm presence without high-frequency whistle
    const targetFreq = 260 + clampedSpeed * 180 + altRatio * 140
    this.droneFilter.frequency.setTargetAtTime(targetFreq, now, 0.25)

    // Higher altitude blooms the subtle crystalline shimmer gently
    if (this.shimmerGain) {
      const targetShimmer = 0.03 + altRatio * 0.08 + clampedSpeed * 0.03
      this.shimmerGain.gain.setTargetAtTime(targetShimmer, now, 0.3)
    }

    // Dynamic presence response
    if (this.droneGain) {
      const targetDrone = 0.38 + clampedSpeed * 0.08
      this.droneGain.gain.setTargetAtTime(targetDrone, now, 0.25)
    }
  }

  // Cinematic Chapter Transition Swell (Replaces harsh wind gust with an elegant acoustic swell)
  playWhoosh(direction = 1) {
    if (!this.enabled || !this.ctx || this.mode !== 'mountain') return
    const now = this.ctx.currentTime

    // 1. Warm Acoustic Sub Swell
    const subOsc = this.ctx.createOscillator()
    const subGain = this.ctx.createGain()
    const startSub = direction > 0 ? 65 : 120
    const peakSub = direction > 0 ? 115 : 70

    subOsc.type = 'sine'
    subOsc.frequency.setValueAtTime(startSub, now)
    subOsc.frequency.exponentialRampToValueAtTime(peakSub, now + 0.32)
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.85)

    subGain.gain.setValueAtTime(0.0001, now)
    subGain.gain.linearRampToValueAtTime(0.35, now + 0.25)
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85)

    subOsc.connect(subGain)
    subGain.connect(this.sfxGain || this.masterGain)
    subOsc.start(now)
    subOsc.stop(now + 0.9)

    // 2. Silky Air Swell (Smooth bandpass sweep without harsh resonance)
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.8)
      const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate)
      const d0 = buffer.getChannelData(0)
      const d1 = buffer.getChannelData(1)
      for (let i = 0; i < bufferSize; i++) {
        d0[i] = (Math.random() * 2 - 1) * 0.3
        d1[i] = (Math.random() * 2 - 1) * 0.3
      }
      const noiseSrc = this.ctx.createBufferSource()
      noiseSrc.buffer = buffer

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.Q.setValueAtTime(1.1, now)
      filter.frequency.setValueAtTime(direction > 0 ? 260 : 540, now)
      filter.frequency.exponentialRampToValueAtTime(direction > 0 ? 580 : 280, now + 0.3)
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.8)

      const noiseGain = this.ctx.createGain()
      noiseGain.gain.setValueAtTime(0.0001, now)
      noiseGain.gain.linearRampToValueAtTime(0.24, now + 0.22)
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8)

      noiseSrc.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(this.sfxGain || this.masterGain)

      noiseSrc.start(now)
      noiseSrc.stop(now + 0.82)
    } catch {
      /* ignore */
    }
  }

  // Soft luxury harmonic chime used when toggling site audio
  playChime(isTurnOn = true) {
    if (!this.ctx || !this.sfxGain) return
    const now = this.ctx.currentTime

    const freq1 = isTurnOn ? 587.33 : 880.0 // D5 or A5
    const freq2 = isTurnOn ? 880.0 : 587.33 // A5 or D5

    ;[freq1, freq2].forEach((freq, i) => {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.12)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(2400, now + i * 0.12)

      gain.gain.setValueAtTime(0.0001, now + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.55)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.sfxGain)

      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.6)
    })
  }

  // Tactile Precision Haptics & Acoustic Click Synthesizer:
  // - 'interactive' / 'shutter': Leica M-series dampened mechanical shutter / tactile microswitch
  // - 'tick': Precision f-stop / lens ratchet detent stepper click
  // - 'tap': Soft acoustic felt thud for subtle background interactions
  playUiClick(type = 'interactive', pitchMultiplier = 1) {
    if (!this.enabled) return
    const ctx = this.ensureContext()
    if (!ctx || !this.sfxGain) return
    const now = ctx.currentTime

    // Subtle micro-pitch jitter (0.98 - 1.02) for organic tactile variation
    const jitter = 0.98 + Math.random() * 0.04
    const p = Math.max(0.3, pitchMultiplier * jitter)

    if (type === 'interactive' || type === 'shutter') {
      // 1. High-precision shutter leaf transient (crisp 1ms contact)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      const filter1 = ctx.createBiquadFilter()

      osc1.type = 'triangle'
      osc1.frequency.setValueAtTime(2600 * p, now)
      osc1.frequency.exponentialRampToValueAtTime(Math.max(20, 520 * p), now + 0.014)

      filter1.type = 'bandpass'
      filter1.frequency.setValueAtTime(2200 * p, now)
      filter1.Q.setValueAtTime(1.6, now)

      gain1.gain.setValueAtTime(0.001, now)
      gain1.gain.linearRampToValueAtTime(0.24, now + 0.001)
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.018)

      osc1.connect(filter1)
      filter1.connect(gain1)
      gain1.connect(this.sfxGain)

      osc1.start(now)
      osc1.stop(now + 0.02)

      // 2. Damped magnesium/wood body resonance (warm acoustic body, 18ms decay)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      const filter2 = ctx.createBiquadFilter()

      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(320 * p, now)
      osc2.frequency.exponentialRampToValueAtTime(Math.max(20, 90 * p), now + 0.032)

      filter2.type = 'lowpass'
      filter2.frequency.setValueAtTime(640 * p, now)

      gain2.gain.setValueAtTime(0.001, now)
      gain2.gain.linearRampToValueAtTime(0.20, now + 0.0015)
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.035)

      osc2.connect(filter2)
      filter2.connect(gain2)
      gain2.connect(this.sfxGain)

      osc2.start(now)
      osc2.stop(now + 0.038)

      // 3. Ultra-short leaf release puff (damped micro-noise)
      try {
        const noiseLen = Math.floor(ctx.sampleRate * 0.012)
        const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate)
        const data = noiseBuf.getChannelData(0)
        for (let i = 0; i < noiseLen; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseLen * 0.28))
        }
        const noiseSrc = ctx.createBufferSource()
        noiseSrc.buffer = noiseBuf

        const nFilter = ctx.createBiquadFilter()
        nFilter.type = 'bandpass'
        nFilter.frequency.setValueAtTime(2400 * p, now)
        nFilter.Q.setValueAtTime(1.2, now)

        const nGain = ctx.createGain()
        nGain.gain.setValueAtTime(0.06, now)
        nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012)

        noiseSrc.connect(nFilter)
        nFilter.connect(nGain)
        nGain.connect(this.sfxGain)

        noiseSrc.start(now)
        noiseSrc.stop(now + 0.014)
      } catch {
        /* ignore */
      }
    } else if (type === 'tick') {
      // Precision aperture ring / dial detent tick
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(2100 * p, now)
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, 820 * p), now + 0.009)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.16, now + 0.0008)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.011)

      osc.connect(gain)
      gain.connect(this.sfxGain)
      osc.start(now)
      osc.stop(now + 0.013)
    } else {
      // 'tap': Warm velvet felt acoustic tap
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(220 * p, now)
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, 75 * p), now + 0.024)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(420, now)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.08, now + 0.0015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.026)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.sfxGain)

      osc.start(now)
      osc.stop(now + 0.028)
    }
  }

  // Backward compatible alias
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
    this.compressor = null
    this.droneOscs = []
    this.droneFilter = null
    this.droneGain = null
    this.airSource = null
    this.airFilter = null
    this.airFilter2 = null
    this.airGain = null
    this.shimmerOsc = null
    this.shimmerGain = null
    this.enabled = false
    this.notify()
  }
}

export const sound = new SoundEngine()