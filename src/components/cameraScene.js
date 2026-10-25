import * as THREE from 'three'
import gsap from 'gsap'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

/* Aperture-blade outline drawn behind the camera (7 blades, like a real iris). */
const IRIS_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const IRIS_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uRot;
uniform float uOpacity;
uniform vec3 uColor;
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float seg = 6.28318530718 / 7.0;
  float a = atan(p.y, p.x) + uRot;
  float d = cos(floor(0.5 + a / seg) * seg - a) * r;
  float R = 0.62;
  float ring  = 1.0 - smoothstep(0.0, 0.008, abs(d - R));
  float ring2 = (1.0 - smoothstep(0.0, 0.005, abs(d - R * 0.72))) * 0.55;
  float ring3 = (1.0 - smoothstep(0.0, 0.004, abs(d - R * 1.12))) * 0.25;
  float edge  = abs(fract(a / seg + 0.5) - 0.5) * r;
  float spoke = (1.0 - smoothstep(0.0, 0.004, edge)) * step(R * 0.72, r) * step(r, R);
  float fade  = 1.0 - smoothstep(0.55, 1.0, r);
  float alpha = (ring + ring2 + ring3 + spoke * 0.6) * fade * uOpacity;
  gl_FragColor = vec4(uColor, alpha);
}
`

export function createCameraScene(canvas, { modelUrl, onProgress } = {}) {
  /* Everything GSAP animates lives in `state`. Intro and scroll are kept apart so they never fight. */
  const state = {
    intro:  { scale: 0, rotY: -Math.PI * 1.5, iris: 0 },
    scroll: { x: 0, y: 0, z: 0, rotX: 0.12, rotY: 0.35, scale: 1, ring: 0 },
    cta:    { z: 0 },
    vel: 0,
  }

  const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820
  const getPixelRatio = () => Math.min(window.devicePixelRatio || 1, isTouchDevice() ? 1.75 : 2)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(getPixelRatio())
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0, 9)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex
  scene.environmentIntensity = 0.9

  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 6)
  const rim = new THREE.DirectionalLight(0xffd9b0, 1.5); rim.position.set(-4, 2, -3)
  scene.add(key, rim)

  /* iris backdrop */
  const iris = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.ShaderMaterial({
      vertexShader: IRIS_VERT,
      fragmentShader: IRIS_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uRot: { value: 0 },
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color('#f2efe9') },
      },
    })
  )
  iris.position.z = -1.6
  scene.add(iris)

  /* camera rig: rig (pose) > holder (normalise size) > gltf */
  const rig = new THREE.Group()
  scene.add(rig)

  let disposed = false
  const ready = new GLTFLoader()
    .loadAsync(modelUrl, (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total) })
    .then((gltf) => {
      if (disposed) return gltf
      const model = gltf.scene
      model.traverse((o) => {
        if (!o.isMesh) return
        const m = o.material
        m.transparent = false          // the source material is BLEND; force opaque
        m.depthWrite = true
        m.alphaTest = 0
        ;[m.map, m.normalMap, m.metalnessMap, m.roughnessMap].forEach((t) => {
          if (t) t.anisotropy = renderer.capabilities.getMaxAnisotropy()
        })
      })
      // centre + normalise to ~3 world units wide
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      model.position.copy(center).multiplyScalar(-1)
      const holder = new THREE.Group()
      holder.add(model)
      holder.scale.setScalar(3.35 / size.x)
      rig.add(holder)
      renderer.compile(scene, camera)
      return gltf
    })

  /* pointer parallax: only track mouse/fine pointer, ignore touch drag to avoid jarring tilts while scrolling */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
  const onMove = (e) => {
    if (e.pointerType === 'touch') return
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2
  }
  window.addEventListener('pointermove', onMove, { passive: true })

  /* sizing */
  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight
    renderer.setPixelRatio(getPixelRatio())
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // Narrow mobile screens (e.g. 19.5:9 aspect) need slightly wider FOV so the camera is fully framed
    camera.fov = w / h < 0.65 ? 50 : w / h < 1 ? 46 : 35
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  /* frame loop (shares GSAP's ticker so it stays in sync with ScrollTrigger) */
  const clock = new THREE.Clock()
  const rootStyle = getComputedStyle(document.documentElement)
  let frame = 0, roll = 0
  const update = () => {
    const t = clock.getElapsedTime()
    const { scroll: s, intro: i, cta: c } = state

    mouse.x += (mouse.tx - mouse.x) * 0.06
    mouse.y += (mouse.ty - mouse.y) * 0.06
    roll += (THREE.MathUtils.clamp(state.vel * -0.00018, -0.35, 0.35) - roll) * 0.08

    rig.position.set(s.x, s.y + Math.sin(t * 0.8) * 0.05, s.z + c.z)
    rig.rotation.set(s.rotX + mouse.y * 0.08, s.rotY + i.rotY + mouse.x * 0.18, roll)
    rig.scale.setScalar(Math.max(s.scale * i.scale, 0.0001))

    iris.material.uniforms.uRot.value = s.ring + t * 0.03
    iris.material.uniforms.uOpacity.value = i.iris * 0.55
    iris.position.x = s.x * 0.6
    iris.position.y = s.y * 0.15

    // follow the site's ink colour so the aperture dial / theme toggle recolours the iris
    if (++frame % 12 === 0) {
      const v = (rootStyle.getPropertyValue('--ink') || rootStyle.getPropertyValue('--fg')).trim()
      if (v) {
        try {
          iris.material.uniforms.uColor.value.set(v)
        } catch { /* ignore */ }
      }
    }

    renderer.render(scene, camera)
  }
  gsap.ticker.add(update)

  const dispose = () => {
    disposed = true
    gsap.ticker.remove(update)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('resize', resize)
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
    envTex.dispose()
    pmrem.dispose()
    renderer.dispose()
  }

  return { state, ready, dispose }
}
