import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { allItems, series } from '../data/series'
import { site } from '../data/site'
import { sound } from '../utils/soundEngine'
import TearTicket from '../components/TearTicket/TearTicket'
import './Home.css'

gsap.registerPlugin(ScrollTrigger)

const MODEL_URL = '/earth.glb' // put the file in /public
const MODEL_BYTES = 20361636 // fallback when the server sends no Content-Length
const TEX_URL = '/earth/' // high-resolution maps live in /public/earth/
// [key, file, isColour]: these replace the model's built-in 1024px textures
const TEXTURES = [
  ['day', 'day_4k.jpg', true], // NASA Blue Marble
  ['lights', 'lights_4k.jpg', true], // city lights (NASA Black Marble, lights only)
  ['normal', 'normal_4k.jpg', false], // mountain relief, derived from elevation data
  ['rough', 'rough_4k.jpg', false], // oceans glossy, land + ice matte
  ['clouds', 'clouds_4k.jpg', false], // cloud coverage
]
const D = 20 // the globe (atmosphere shell included) is scaled to this diameter in world units
const R = D / 2 // outer radius
const SURF = R * 0.985 // radius of the actual land/ocean surface (inside the cloud + air shells)

// The model's texture is a standard equirectangular map. Measured from the mesh:
// longitude = atan2(x, z) + 72deg, latitude = world Y. This turns a real place into a direction.
const dirOf = (lat, lon, out = new THREE.Vector3()) => {
  const la = THREE.MathUtils.degToRad(lat)
  const ph = THREE.MathUtils.degToRad(lon - 72)
  return out.set(Math.cos(la) * Math.sin(ph), Math.sin(la), Math.cos(la) * Math.cos(ph))
}

// The journey. One key per scroll chapter.
//   lat/lon      the place the camera looks at
//   cLat/cLon    how far the camera hangs from that place (so you see the horizon, not straight down)
//   dist         camera distance from the globe centre, in globe radii
//   look         0 = look at the globe centre (whole planet), 1 = look at the place on the surface
//   elev         the number the HUD elevation counter shows at this stop
const KEYS = [
  { lat: 10.08, lon: 77.06, cLat: 0, cLon: 0, dist: 1.85, look: 0, elev: 2695, name: 'Western Ghats · Kerala' },
  { lat: 45.83, lon: 6.86, cLat: -13, cLon: -4, dist: 1.46, look: 1, elev: 4808, name: 'Mont Blanc · Alps' },
  { lat: 27.99, lon: 86.93, cLat: -13, cLon: -5, dist: 1.42, look: 1, elev: 8849, name: 'Everest · Himalaya' },
  { lat: -32.65, lon: -70.01, cLat: -13, cLon: 6, dist: 1.46, look: 1, elev: 6961, name: 'Aconcagua · Andes' },
  { lat: 63.07, lon: -151.0, cLat: -13, cLon: 4, dist: 1.46, look: 1, elev: 6190, name: 'Denali · Alaska' },
  { lat: 14, lon: 77.5, cLat: 0, cLon: 0, dist: 1.58, look: 0, elev: 0, name: 'Base camp · India' },
]

// spherical interpolation between two unit vectors
const slerp = (a, b, u, out) => {
  const om = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))
  if (om < 1e-4) return out.copy(a)
  const s = Math.sin(om)
  return out
    .copy(a)
    .multiplyScalar(Math.sin((1 - u) * om) / s)
    .addScaledVector(b, Math.sin(u * om) / s)
}

// soft blue rim light for the atmosphere shell (replaces the model's transmission material)
const atmosphereMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
        gl_FragColor = vec4(vec3(0.36, 0.62, 1.0) * f * 1.25, f);
      }`,
  })

// Swap in the high-res maps and tune the three spheres inside the model:
// surface (phong1), clouds (lambert6) and atmosphere (lambert7). Returns the cloud meshes.
function prepareEarth(model, tex, maxAniso) {
  const clouds = []
  model.traverse((o) => {
    if (!o.isMesh) return
    o.frustumCulled = false
    const m = o.material
    if (!m) return
    const first = !m.userData.hd // the two halves of each sphere share one material
    m.userData.hd = true

    if (m.name === 'phong1') {
      if (!first) return
      m.side = THREE.FrontSide
      m.metalness = 0
      m.roughness = 0.85
      if (m.map) m.map.anisotropy = maxAniso
      if (tex.day) {
        m.map?.dispose()
        m.map = tex.day
      }
      if (tex.lights) {
        m.emissiveMap?.dispose()
        m.emissiveMap = tex.lights
        m.emissive.set(0xffffff)
        m.emissiveIntensity = 1.5
      } else {
        m.emissiveIntensity = 0.7
      }
      if (tex.normal) {
        m.normalMap = tex.normal
        m.normalScale.set(1.3, 1.3)
      }
      if (tex.rough) {
        m.roughnessMap = tex.rough
        m.roughness = 1
      }
      m.onBeforeCompile = (shader) => {
        shader.uniforms.uLand = { value: tex.rough || null }
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec2 vDetailUv;')
          .replace('#include <uv_vertex>', '#include <uv_vertex>\nvDetailUv = uv;')
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
            varying vec2 vDetailUv;
            uniform sampler2D uLand;
            float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
            float vnoise(vec2 p) {
              vec2 i = floor(p), f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
            }`
          )
          // fine terrain grain that only fades in when you are close enough for the 4K map to run out of detail
          .replace(
            '#include <map_fragment>',
            `#include <map_fragment>
            {
              vec2 g = vDetailUv * vec2(16384.0, 8192.0);
              float px = length(fwidth(g));
              float fade = 1.0 - smoothstep(0.6, 2.2, px);
              float land = ${tex.rough ? 'smoothstep(0.55, 0.8, texture2D(uLand, vDetailUv).g)' : '1.0'};
              float d = vnoise(g * 0.5) * 0.45 + vnoise(g * 0.16) * 0.35 + vnoise(g * 0.05) * 0.2;
              diffuseColor.rgb *= 1.0 + (d - 0.5) * 0.75 * fade * land;
            }`
          )
          // city lights only on the night side
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
            #if NUM_DIR_LIGHTS > 0
              totalEmissiveRadiance *= smoothstep(0.2, -0.25, dot(normal, directionalLights[0].direction));
            #endif`
          )
      }
      m.needsUpdate = true
    } else if (m.name === 'lambert6') {
      if (first) {
        m.side = THREE.FrontSide
        m.depthWrite = false
        if (tex.clouds) {
          m.map?.dispose()
          m.map = null
          m.color.set(0xffffff)
          m.alphaMap = tex.clouds
          m.transparent = true
          m.opacity = 0.95
          m.needsUpdate = true
        }
      }
      o.renderOrder = 2
      clouds.push(o)
    } else if (m.name === 'lambert7') {
      // atmosphere shell: swap the transmission material for a cheap rim glow
      o.material = atmosphereMaterial()
      o.renderOrder = 3
      if (first) m.dispose()
    }
  })
  return clouds
}

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const shouldSkipIntro = Boolean(
    location.state?.skipIntro ||
    (typeof window !== 'undefined' && sessionStorage.getItem('site_entered') === 'true')
  )

  const canvasHostRef = useRef(null)
  const scrollRef = useRef(null)
  const loaderRef = useRef(null)
  const countRef = useRef(null)
  const altRef = useRef(null)
  const placeRef = useRef(null)
  const lenisRef = useRef(null)
  const state = useRef({ t: 0, dive: 0, intro: shouldSkipIntro ? 0 : 1, leaving: false })
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  )
  const finishLoadingRef = useRef(null)
  const ticketTornRef = useRef(shouldSkipIntro)
  const assetsReadyRef = useRef(false)

  const photoCount = useMemo(() => allItems.filter((i) => i.type === 'image').length, [])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const s = state.current
    s.t = 0
    s.dive = 0
    s.intro = shouldSkipIntro ? 0 : 1
    s.leaving = false

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = window.matchMedia('(max-width: 820px)').matches
    const html = document.documentElement
    let disposed = false
    if (reduce) s.intro = 0

    if (shouldSkipIntro) {
      ticketTornRef.current = true
      try {
        sessionStorage.setItem('site_entered', 'true')
      } catch {
        /* ignore */
      }
      html.classList.remove('loader-active')
      html.style.overflow = ''
      gsap.set('.mtn-line > span', { y: '0%' })
      gsap.set('.mtn-hero [data-intro]', { opacity: 1, y: 0 })
      if (loaderRef.current) {
        loaderRef.current.style.display = 'none'
      }
    } else {
      html.classList.add('loader-active')
    }

    // ---------- renderer ----------
    // A brand-new canvas for every effect run. React StrictMode (and hot reload) mounts,
    // cleans up and re-mounts this effect; reusing one <canvas> after its WebGL context was
    // torn down leaves the new renderer drawing into a dead context (blank canvas).
    const canvas = document.createElement('canvas')
    canvas.className = 'mtn-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    canvasHostRef.current?.appendChild(canvas)

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isMobile,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch (err) {
      console.warn('[Home] WebGL renderer could not be created:', err)
      renderer = null
    }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      window.innerWidth / window.innerHeight < 1 ? 52 : 42,
      1,
      0.1,
      1000
    )
    const rig = new THREE.Group()
    scene.add(rig)

    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75))
      renderer.setClearColor(0x000000, 0)
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.1
    }

    // light: soft ambient + a "sun" that follows the camera so the side you see is always lit
    scene.add(new THREE.HemisphereLight(0xb8cdf0, 0x1b2233, 1.1))
    const sun = new THREE.DirectionalLight(0xfff0d8, 3.1)
    sun.position.set(-20, 18, 14)
    scene.add(sun)

    // stars
    const N = isMobile ? 900 : 2200
    const starPos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = 140 + Math.random() * 200
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th)
      starPos[i * 3 + 1] = r * Math.cos(ph)
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    // ---------- camera path ----------
    let path = null // per-key unit directions, built once the model is in
    let loaded = false
    const clouds = []

    const buildPath = () => {
      path = KEYS.map((k) => ({
        cam: dirOf(k.lat + k.cLat, k.lon + k.cLon),
        look: dirOf(k.lat, k.lon),
      }))
    }

    let lastW = typeof window !== 'undefined' ? window.innerWidth : 1200
    let lastH = typeof window !== 'undefined' ? window.innerHeight : 800

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const isMobileScreen = w <= 768

      // On mobile devices, ignore vertical-only toolbar collapse/expand (height changes < 160px)
      // to prevent the 3D model from stretching, shrinking, or jittering while scrolling.
      if (isMobileScreen && w === lastW && Math.abs(h - lastH) < 160) {
        return
      }
      lastW = w
      lastH = h

      const aspect = w / h
      camera.aspect = aspect
      camera.fov = aspect < 1 ? Math.min(52, 42 / Math.pow(aspect, 0.35)) : 42
      camera.updateProjectionMatrix()
      renderer?.setSize(w, h, false)
    }
    resize()
    window.addEventListener('resize', resize)

    // stars follow the site's ink colour so the aperture dial (light / dark) still works
    const syncTheme = () => {
      try {
        const v = getComputedStyle(html).getPropertyValue('--ink').trim()
        if (v) starMat.color.set(v)
      } catch {
        /* ignore */
      }
    }
    syncTheme()

    // pointer parallax
    const mouse = { x: 0, y: 0, sx: 0, sy: 0 }
    const onPointer = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onPointer, { passive: true })

    // ---------- smooth scroll (home only; SmoothScroll skips "/") ----------
    let lenis = null
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.085, smoothWheel: true })
      lenisRef.current = lenis
      window.__lenis = lenis
      lenis.on('scroll', ScrollTrigger.update)
      if (!shouldSkipIntro) {
        lenis.stop()
      }
    }
    if (!shouldSkipIntro) {
      html.style.overflow = 'hidden' // locked until ticket is torn / model loaded
    } else {
      html.style.overflow = ''
    }

    // ---------- render loop (one clock for gsap + lenis + three) ----------
    const target = new THREE.Vector3()
    const camDir = new THREE.Vector3()
    const lookDir = new THREE.Vector3()
    const right = new THREE.Vector3()
    const up = new THREE.Vector3()
    const Y = new THREE.Vector3(0, 1, 0)
    let lastAlt = -1
    let lastPlace = ''
    let lastTime = 0
    let frame = 0

    const tick = (time) => {
      lenis?.raf(time * 1000)
      if (!renderer) return

      const dt = Math.min(0.05, time - lastTime)
      lastTime = time
      if (++frame % 20 === 0) syncTheme()

      mouse.sx += (mouse.x - mouse.sx) * 0.05
      mouse.sy += (mouse.y - mouse.sy) * 0.05

      // segment + eased progress inside it (eased so the camera settles at each stop while you read)
      const t = Math.min(1, Math.max(0, s.t))
      const f = t * (KEYS.length - 1)
      const i = Math.min(KEYS.length - 2, Math.floor(f))
      const raw = f - i
      const u = raw * raw * (3 - 2 * raw)

      if (loaded && path) {
        const a = KEYS[i]
        const b = KEYS[i + 1]
        slerp(path[i].cam, path[i + 1].cam, u, camDir)
        slerp(path[i].look, path[i + 1].look, u, lookDir)

        const aspect = camera.aspect
        const isPortrait = aspect < 1
        const currentLook = THREE.MathUtils.lerp(a.look, b.look, u)

        // Single stable mobile distance factor based on viewport aspect ratio
        // Avoids jumping, ballooning, or sudden zoom shifts between stops
        const mobileDistFactor = isPortrait
          ? Math.min(1.58, 0.98 / Math.pow(aspect, 0.65))
          : 1

        // Smooth flight between stops without erratic sine bouncing on mobile
        const flyArc = isPortrait ? 0.04 : 0.25
        const dist =
          (THREE.MathUtils.lerp(a.dist, b.dist, u) * mobileDistFactor +
            Math.sin(Math.PI * u) * flyArc +
            s.intro * 0.8) *
          R
        const lookK = currentLook * SURF

        camera.position.copy(camDir).multiplyScalar(dist)
        target.copy(lookDir).multiplyScalar(lookK)

        // slow idle sway so it never feels frozen
        camera.position.y += Math.sin(time * 0.35) * (isPortrait ? 0.05 : 0.1)
        camera.position.x += Math.cos(time * 0.27) * (isPortrait ? 0.05 : 0.1)

        // diving into the globe when a link is clicked
        if (s.dive > 0) {
          camera.position.lerp(target, s.dive * 0.5)
          camera.fov = (isPortrait ? 52 : 42) + s.dive * 28
          camera.updateProjectionMatrix()
        }
        camera.lookAt(target)
        camera.translateX(mouse.sx * (isPortrait ? 0.2 : 0.5))
        camera.translateY(-mouse.sy * (isPortrait ? 0.15 : 0.32))

        if (isPortrait) {
          // At base camp (t approaching 1), shift camera DOWN so the Earth model
          // moves UP to fill the top half (~50%) zoomed in on India/Western Ghats,
          // leaving the lower half open for the Base Camp links and texts.
          // Zero vertical shearing or jumping during the hero or mountain chapters.
          const endShift = THREE.MathUtils.smoothstep(t, 0.78, 1)
          const yOffset = -endShift * 0.32
          camera.translateY(dist * yOffset)
        }

        // the sun sits beside and above the camera, so the visible face is lit with a soft terminator
        camera.updateMatrixWorld()
        right.setFromMatrixColumn(camera.matrixWorld, 0)
        up.setFromMatrixColumn(camera.matrixWorld, 1)
        sun.position.copy(camera.position).normalize().multiplyScalar(60).addScaledVector(right, 34).addScaledVector(up, 20)

        // HUD
        const alt = Math.round(THREE.MathUtils.lerp(a.elev, b.elev, u))
        if (alt !== lastAlt && altRef.current) {
          altRef.current.textContent = String(alt).padStart(4, '0')
          lastAlt = alt
        }
        const place = (u < 0.5 ? a : b).name
        if (place !== lastPlace && placeRef.current) {
          placeRef.current.textContent = place
          lastPlace = place
        }

        // Modulate audio atmospheric synth with scroll velocity and elevation
        const scrollSpeed = Math.abs(s.t - (s.lastT || 0)) / Math.max(dt, 0.001)
        s.lastT = s.t
        sound.modulate(scrollSpeed, alt / 8849)
      }

      // the cloud layer drifts slowly around the polar axis
      clouds.forEach((c) => c.rotateOnWorldAxis(Y, dt * 0.006))
      stars.rotation.y = time * 0.004

      renderer.render(scene, camera)
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    // ---------- scroll choreography (GSAP) ----------
    const ctx = gsap.context(() => {
      gsap.set('.mtn-chap [data-r], .mtn-end [data-r]', { opacity: 0, y: 50 })

      // camera progress follows the scroll position
      gsap.to(s, {
        t: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: scrollRef.current,
          start: 'top top',
          endTrigger: '.mtn-end',
          end: 'top 35%',
          scrub: 0.25,
        },
      })

      // each chapter's text rises in, and out again when scrolling back
      gsap.utils.toArray('.mtn-chap').forEach((el, index) => {
        gsap.to(el.querySelectorAll('[data-r]'), {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.09,
          scrollTrigger: {
            trigger: el,
            start: 'top 62%',
            end: 'bottom 38%',
            toggleActions: 'play reverse play reverse',
            onEnter: () => {
              sound.playWhoosh(1)
              sound.playClick(1 + index * 0.12)
            },
            onEnterBack: () => {
              sound.playWhoosh(-1)
              sound.playClick(0.95 + index * 0.1)
            },
          },
        })
      })

      // Base camp links rise in as the scroll reaches the very bottom and stays settled
      gsap.to('.mtn-end [data-r]', {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: {
          trigger: '.mtn-end',
          start: 'top 70%',
          end: 'bottom bottom',
          toggleActions: 'play none none reverse',
          onEnter: () => {
            sound.playWhoosh(1)
            sound.playClick(1.4)
          },
          onLeaveBack: () => {
            sound.playWhoosh(-1)
          },
        },
      })

      // hero fades as you start travelling
      gsap.to('.mtn-hero-inner', {
        opacity: 0,
        y: -40,
        ease: 'power1.out',
        scrollTrigger: { trigger: '.mtn-hero', start: 'top top', end: '30% top', scrub: true },
      })
    }, scrollRef)

    // ---------- intro: loader -> hero ----------
    const finishLoading = () => {
      if (disposed) return
      html.classList.remove('loader-active')
      html.style.overflow = ''
      ScrollTrigger.refresh()
      const tl = gsap.timeline()
      tl.to(countRef.current, { opacity: 0, duration: 0.3 })
        .to(loaderRef.current, { yPercent: -100, duration: 1.1, ease: 'power4.inOut' }, '>-0.05')
        // the camera glides in from far away while the loader lifts
        .to(s, { intro: 0, duration: 3, ease: 'power3.out' }, '<')
        .fromTo(
          '.mtn-line > span',
          { y: '110%' },
          { y: '0%', duration: 1.2, ease: 'power4.out', stagger: 0.12 },
          '-=0.45'
        )
        .fromTo(
          '.mtn-hero [data-intro]',
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 },
          '-=0.8'
        )
        .add(() => lenis?.start(), '-=0.6')
        .set(loaderRef.current, { display: 'none' })
    }
    finishLoadingRef.current = finishLoading

    const countObj = { v: 0 }
    const setCount = (v) => {
      if (countRef.current) countRef.current.textContent = String(Math.round(v)).padStart(2, '0')
    }

    if (!renderer) {
      // no WebGL: skip straight to the content
      loaded = false
      html.style.overflow = ''
      lenis?.start()
      loaderRef.current && (loaderRef.current.style.display = 'none')
      gsap.set('.mtn-line > span', { y: '0%' })
      gsap.set('.mtn-hero [data-intro]', { opacity: 1 })
      document.querySelector('.mtn')?.classList.add('mtn-nogl')
    } else {
      const maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy())
      const hiRes = renderer.capabilities.maxTextureSize >= 4096
      let glbProgress = 0
      let texDone = 0
      const showProgress = () => {
        const v = Math.min(99, (glbProgress * 0.55 + (texDone / TEXTURES.length) * 0.45) * 100)
        gsap.to(countObj, { v, duration: 0.3, overwrite: true, onUpdate: () => setCount(countObj.v) })
      }

      // high-res maps: if one is missing the model's own built-in texture is kept
      const texLoader = new THREE.TextureLoader()
      const loadTexture = ([key, file, isColour]) =>
        new Promise((resolve) => {
          if (!hiRes) {
            texDone++
            resolve([key, null])
            return
          }
          texLoader.load(
            `${TEX_URL}${file}`,
            (t) => {
              t.anisotropy = maxAniso
              t.wrapS = THREE.RepeatWrapping
              if (isColour && 'colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace
              texDone++
              showProgress()
              resolve([key, t])
            },
            undefined,
            () => {
              console.warn(`[Home] missing ${TEX_URL}${file}, using the model's built-in texture`)
              texDone++
              showProgress()
              resolve([key, null])
            }
          )
        })

      const glbPromise = new Promise((resolve, reject) =>
        new GLTFLoader().load(
          MODEL_URL,
          resolve,
          (e) => {
            glbProgress = Math.min(1, e.loaded / (e.total || MODEL_BYTES))
            showProgress()
          },
          reject
        )
      )

      Promise.all([glbPromise, Promise.all(TEXTURES.map(loadTexture))])
        .then(([gltf, texList]) => {
          if (disposed) {
            texList.forEach(([, t]) => t?.dispose())
            return
          }
          const tex = Object.fromEntries(texList)
          const model = gltf.scene
          clouds.push(...prepareEarth(model, tex, maxAniso))

          // centre it and scale to a known size, whatever the export units were
          const box = new THREE.Box3().setFromObject(model)
          const size = box.getSize(new THREE.Vector3())
          const center = box.getCenter(new THREE.Vector3())
          const k = D / Math.max(size.x, size.y, size.z)
          model.scale.setScalar(k)
          model.position.copy(center).multiplyScalar(-k)
          rig.add(model)
          buildPath()
          loaded = true

          gsap.to(countObj, {
            v: 100,
            duration: 0.5,
            ease: 'power1.out',
            onUpdate: () => setCount(countObj.v),
            onComplete: () => {
              assetsReadyRef.current = true
              if (!shouldSkipIntro && ticketTornRef.current && finishLoadingRef.current) {
                finishLoadingRef.current()
              } else if (shouldSkipIntro) {
                lenis?.start()
                ScrollTrigger.refresh()
              }
            },
          })
        })
        .catch((err) => {
          console.error('Failed to load 3D globe:', err)
          // model failed to load: still show the page
          if (disposed) return
          loaded = false
          html.style.overflow = ''
          lenis?.start()
          document.querySelector('.mtn')?.classList.add('mtn-nogl')
          gsap.set(loaderRef.current, { display: 'none' })
          gsap.set('.mtn-line > span', { y: '0%' })
          gsap.set('.mtn-hero [data-intro]', { opacity: 1 })
        })
    }

    // ---------- cleanup ----------
    return () => {
      disposed = true
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      gsap.ticker.remove(tick)
      gsap.ticker.lagSmoothing(500, 33)
      ctx.revert()
      ScrollTrigger.getAll().forEach((st) => st.kill())
      lenis?.destroy()
      lenisRef.current = null
      delete window.__lenis
      html.style.overflow = ''
      html.classList.remove('loader-active')
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach((m) => {
            Object.values(m).forEach((v) => v && v.isTexture && v.dispose())
            m.dispose()
          })
        }
      })
      renderer?.dispose()
      canvas.remove()
      sound.destroy()
    }
  }, [])

  const handleToggleSound = async () => {
    const isNowOn = await sound.toggle()
    setSoundEnabled(isNowOn)
  }

  const handleTear = () => {
    ticketTornRef.current = true
    try {
      sessionStorage.setItem('site_entered', 'true')
    } catch {
      /* ignore */
    }
    sound.playWhoosh(1)
    sound.playClick(1.2)
    if (finishLoadingRef.current) {
      finishLoadingRef.current()
    }
  }

  // fly into the globe, then change page
  const go = (to) => (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    const s = state.current
    if (s.leaving) return
    s.leaving = true
    try {
      sessionStorage.setItem('site_entered', 'true')
    } catch {
      /* ignore */
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate(to)
      return
    }
    lenisRef.current?.stop()
    gsap.to(scrollRef.current, { opacity: 0, duration: 0.55, ease: 'power2.in' })
    gsap.to(s, { dive: 1, duration: 0.95, ease: 'power2.in', onComplete: () => navigate(to) })
  }

  return (
    <div className="mtn">
      <div ref={canvasHostRef} />
      <div className="mtn-vignette" aria-hidden="true" />

      {/* Opening animation screen with TearTicket and sound option */}
      <div
        ref={loaderRef}
        className="mtn-loader"
        role="status"
        style={shouldSkipIntro ? { display: 'none' } : undefined}
      >
        <div className="mtn-loader-top">
          <div className="mtn-loader-tag">
            <span>{site.name}</span>
            <span className="mtn-loader-dot" />
            <span>Pass</span>
          </div>

          <button
            type="button"
            className={`mtn-loader-sound ${soundEnabled ? 'is-active' : ''}`}
            onClick={handleToggleSound}
            aria-label={soundEnabled ? 'Disable atmosphere sound' : 'Enable atmospheric sound'}
            title={soundEnabled ? 'Sound on' : 'Sound off'}
          >
            <span className="mtn-loader-sound-icon" aria-hidden="true">
              {soundEnabled ? (
                <span className="mtn-sound-wave-bars">
                  <span className="bar bar-1" />
                  <span className="bar bar-2" />
                  <span className="bar bar-3" />
                  <span className="bar bar-4" />
                </span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </span>
          </button>
        </div>

        <div className="mtn-loader-center">
          <TearTicket
            image="/spectrum.jpg"
            imageAlt="Adharsh CS photography — mountain trail in the mist"
            stub={
              <div className="tt-custom-stub">
                <h3>Admit One</h3>
                <p>
                  Visual Archive
                  <br />
                  {series.length} Series · {photoCount} Photos
                </p>
                <span>@litgrxpher</span>
              </div>
            }
            orientation={isMobile ? 'vertical' : 'horizontal'}
            scrim
            imageRadius={8}
            onTear={handleTear}
            width={isMobile ? 280 : 460}
            height={isMobile ? 420 : 250}
            stubSize={isMobile ? 120 : 150}
            radius={16}
            holes={12}
            holeSize={6}
            notch={3}
            roughness={0}
            tearAngle={30}
            stretch={30}
            resistance={0.45}
            rotate={isMobile ? 0 : 4}
            tilt
            tiltMax={9}
            tiltReach={260}
            parallax={6}
            perspective={1000}
            background="#27272a"
            color="#f5f5f5"
            border
            borderWidth={1}
            recenter
          >
            <div className="tt-custom-body">
              <span className="tt-body-tag">Exhibition Pass</span>
              <h2 className="tt-body-title">{site.name}</h2>
              <span className="tt-body-sub">Western Ghats · Highland Trails · Kerala</span>
            </div>
          </TearTicket>

          <div className="mtn-ticket-actions">
            <span className="mtn-ticket-cue">Tear stub to enter</span>
          </div>
        </div>

        <div className="mtn-loader-bottom">
          <span>Loading the world</span>
          <b ref={countRef}>00</b>
        </div>
      </div>

      <div className="mtn-hud" aria-hidden="true">
        <span>
          Location <b ref={placeRef}>Western Ghats · Kerala</b>
        </span>
        <span>
          Elevation <b ref={altRef}>2695</b> m
        </span>
      </div>

      <div ref={scrollRef} className="mtn-scroll">
        {/* ---- hero ---- */}
        <section className="mtn-sec mtn-hero">
          <div className="mtn-hero-inner">
            <p className="mtn-eyebrow" data-intro>
              Western Ghats · Highland Trails · Kerala, India
            </p>
            <h1 className="mtn-title" aria-label="Climb high. Trek far.">
              <span className="mtn-line" aria-hidden="true">
                <span>Climb high.</span>
              </span>
              <span className="mtn-line" aria-hidden="true">
                <span>Trek far.</span>
              </span>
            </h1>
            <p className="mtn-sub" data-intro>
              Photographs by {site.name}, from Kerala, India. Documenting high-altitude treks, mist-draped shola ridgelines, and mountain summits across the Western Ghats and beyond.
            </p>
            <div className="mtn-cue" data-intro>
              <i /> Scroll to explore the trails
            </div>
          </div>
        </section>

        {/* ---- 01 · Alps ---- */}
        <section className="mtn-sec mtn-chap mtn-left">
          <p className="mtn-num" data-r>01 / Departure · The Alps</p>
          <h2 className="mtn-h2" data-r>
            Every journey starts
            <br />
            with a packed bag.
          </h2>
          <p className="mtn-p" data-r>
            A night train, a borrowed map and a ridge on the horizon. The first stop is always the one that teaches you to start early.
          </p>
        </section>

        {/* ---- 02 · Himalaya ---- */}
        <section className="mtn-sec mtn-chap mtn-right">
          <p className="mtn-num" data-r>02 / Himalaya</p>
          <h2 className="mtn-h2" data-r>
            Where the world
            <br />
            touches the sky.
          </h2>
          <p className="mtn-p" data-r>
            Prayer flags, thin air and the long walk to base camp. You stop counting kilometres and start counting breaths.
          </p>
        </section>

        {/* ---- 03 · Andes ---- */}
        <section className="mtn-sec mtn-chap mtn-left">
          <p className="mtn-num" data-r>03 / The Andes</p>
          <h2 className="mtn-h2" data-r>
            Long roads,
            <br />
            high passes.
          </h2>
          <p className="mtn-p" data-r>
            Dusty buses, border queues and a ridgeline that never seems to get closer. Until, suddenly, it does.
          </p>
        </section>

        {/* ---- 04 · Summit ---- */}
        <section className="mtn-sec mtn-chap mtn-right">
          <p className="mtn-num" data-r>04 / Summit</p>
          <h2 className="mtn-h2" data-r>
            Proof that
            <br />
            it was worth it.
          </h2>
          <div className="mtn-stats" data-r>
            <div>
              <b>{String(series.length).padStart(2, '0')}</b>
              <small>Collections</small>
            </div>
            <div>
              <b>{String(photoCount).padStart(3, '0')}</b>
              <small>Photographs</small>
            </div>
          </div>
        </section>

        {/* ---- links ---- */}
        <section className="mtn-sec mtn-end">
          <p className="mtn-num" data-r>Base camp · Back on the ground</p>
          <nav className="mtn-links" aria-label="Explore">
            <Link to="/series" onClick={go('/series')} className="mtn-link" data-r data-cursor="Open">
              <span className="mtn-link-idx">01</span>
              <span className="mtn-link-name">Archives</span>
              <i aria-hidden="true">↗</i>
              <small>
                {series.length} collections · {photoCount} photographs
              </small>
            </Link>
            <Link to="/about" onClick={go('/about')} className="mtn-link" data-r data-cursor="Open">
              <span className="mtn-link-idx">02</span>
              <span className="mtn-link-name">About</span>
              <i aria-hidden="true">↗</i>
              <small>The person behind the lens</small>
            </Link>
          </nav>
        </section>
      </div>
    </div>
  )
}
