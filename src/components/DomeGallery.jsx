'use client';

import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import gsap from 'gsap';
import * as THREE from 'three';
import './DomeGallery.css';

const DEFAULT_IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1755331039789-7e5680e26e8f?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Abstract art'
  },
  {
    src: 'https://images.unsplash.com/photo-1755569309049-98410b94f66d?q=80&w=772&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Modern sculpture'
  },
  {
    src: 'https://images.unsplash.com/photo-1755497595318-7e5e3523854f?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Digital artwork'
  },
  {
    src: 'https://images.unsplash.com/photo-1755353985163-c2a0fe5ac3d8?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Contemporary art'
  },
  {
    src: 'https://images.unsplash.com/photo-1745965976680-d00be7dc0377?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Geometric pattern'
  },
  {
    src: 'https://images.unsplash.com/photo-1752588975228-21f44630bb3c?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Textured surface'
  },
  { src: 'https://pbs.twimg.com/media/Gyla7NnXMAAXSo_?format=jpg&name=large', alt: 'Social media image' }
];

const DEFAULTS = {
  maxVerticalRotationDeg: 8,
  dragSensitivity: 22,
  enlargeTransitionMs: 400,
  segments: 35
};

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const normalizeAngle = d => ((d % 360) + 360) % 360;
const wrapAngleSigned = deg => {
  const a = (((deg + 180) % 360) + 360) % 360;
  return a - 180;
};
const getDataNumber = (el, name, fallback) => {
  const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`);
  const n = attr == null ? NaN : parseFloat(attr);
  return Number.isFinite(n) ? n : fallback;
};

function buildItems(pool, seg) {
  const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
  const evenYs = [-4, -2, 0, 2, 4];
  const oddYs = [-3, -1, 1, 3, 5];

  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs;
    return ys.map(y => ({ x, y, sizeX: 2, sizeY: 2 }));
  });

  const totalSlots = coords.length;
  if (pool.length === 0) {
    return coords.map(c => ({ ...c, src: '', alt: '' }));
  }

  const normalizedImages = pool.map(image => {
    if (typeof image === 'string') {
      return { src: image, alt: '' };
    }
    return { ...image, src: image.src || '', alt: image.alt || '' };
  });

  const usedImages = Array.from({ length: totalSlots }, (_, i) => normalizedImages[i % normalizedImages.length]);

  for (let i = 1; i < usedImages.length; i++) {
    if (usedImages[i].src === usedImages[i - 1].src) {
      for (let j = i + 1; j < usedImages.length; j++) {
        if (usedImages[j].src !== usedImages[i].src) {
          const tmp = usedImages[i];
          usedImages[i] = usedImages[j];
          usedImages[j] = tmp;
          break;
        }
      }
    }
  }

  return coords.map((c, i) => ({
    ...c,
    ...usedImages[i],
    src: usedImages[i].src,
    alt: usedImages[i].alt || ''
  }));
}

function computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
  const unit = 360 / segments / 2;
  const rotateY = unit * (offsetX + (sizeX - 1) / 2);
  const rotateX = unit * (offsetY - (sizeY - 1) / 2);
  return { rotateX, rotateY };
}

export default function DomeGallery({
  images = DEFAULT_IMAGES,
  fit = 0.5,
  fitBasis = 'auto',
  minRadius = 1000,
  maxRadius = Infinity,
  padFactor = 0.25,
  overlayBlurColor = '#000000',
  maxVerticalRotationDeg = DEFAULTS.maxVerticalRotationDeg,
  dragSensitivity = DEFAULTS.dragSensitivity,
  segments = DEFAULTS.segments,
  dragDampening = 3,
  dragDivisor = 3,
  openedImageWidth = 'min(86vw, 500px)',
  openedImageHeight = 'min(74vh, 540px)',
  imageBorderRadius = '18px',
  openedImageBorderRadius = '24px',
  grayscale = false,
  onItemOpen
}) {
  const rootRef = useRef(null);
  const mainRef = useRef(null);
  const sphereRef = useRef(null);
  const frameRef = useRef(null);
  const viewerRef = useRef(null);
  const scrimRef = useRef(null);
  const focusedElRef = useRef(null);
  const originalTilePositionRef = useRef(null);
  const closeRef = useRef(null);

  // WebGL Atmospheric Depth refs
  const webglCanvasRef = useRef(null);
  const webglSceneUpdateRef = useRef(null);
  const webglMatRef = useRef(null);

  const rotationRef = useRef({ x: 0, y: 0 });
  const targetRotRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const startRotRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef(null);
  const itemElsRef = useRef([]);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const openingRef = useRef(false);
  const openStartedAtRef = useRef(0);
  const lastDragEndAt = useRef(0);

  const scrollLockedRef = useRef(false);
  const lockScroll = useCallback(() => {
    if (scrollLockedRef.current) return;
    scrollLockedRef.current = true;
    document.body.classList.add('dg-scroll-lock');
  }, []);
  const unlockScroll = useCallback(() => {
    if (!scrollLockedRef.current) return;
    if (rootRef.current?.getAttribute('data-enlarging') === 'true') return;
    scrollLockedRef.current = false;
    document.body.classList.remove('dg-scroll-lock');
  }, []);

  const items = useMemo(() => buildItems(images, segments), [images, segments]);

  const applyTransform = useCallback((xDeg, yDeg) => {
    const el = sphereRef.current;
    if (el) {
      el.style.transform = `translate3d(0, 0, calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
    }
    if (webglSceneUpdateRef.current) {
      webglSceneUpdateRef.current(xDeg, yDeg);
    }
  }, []);

  // Back-hemisphere culling: hides any tiles on the back of the cylinder so no background images show through
  const updateCulling = useCallback(
    rotY => {
      const seg = segments;
      const unit = 360 / seg / 2;
      for (let c = 0; c < seg; c++) {
        const colX = -37 + c * 2;
        const colAngle = (((unit * (colX + 0.5) + rotY) % 360) + 360) % 360;
        // The front hemisphere facing the camera is within [-78deg, +78deg]
        const isFront = colAngle <= 78 || colAngle >= 282;
        const vis = isFront ? 'visible' : 'hidden';

        const baseIdx = c * 5;
        for (let r = 0; r < 5; r++) {
          const el = itemElsRef.current[baseIdx + r];
          if (el && el.style.visibility !== vis) {
            el.style.visibility = vis;
          }
        }
      }
    },
    [segments]
  );

  const lockedRadiusRef = useRef(null);

  // ResizeObserver for responsive dome radius
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      const w = Math.max(1, cr.width),
        h = Math.max(1, cr.height);
      const minDim = Math.min(w, h),
        maxDim = Math.max(w, h),
        aspect = w / h;
      let basis;
      switch (fitBasis) {
        case 'min':
          basis = minDim;
          break;
        case 'max':
          basis = maxDim;
          break;
        case 'width':
          basis = w;
          break;
        case 'height':
          basis = h;
          break;
        default:
          basis = aspect >= 1.3 ? w : minDim;
      }
      let radius = basis * fit;
      const heightGuard = h * 1.35;
      radius = Math.min(radius, heightGuard);

      // Responsive mobile radius: on mobile portrait, scale comfortably so cards don't collide
      const isMobile = w < 768;
      const effectiveMin = isMobile
        ? Math.min(minRadius, Math.max(520, Math.round(w * 1.55)))
        : minRadius;
      radius = clamp(radius, effectiveMin, maxRadius);
      lockedRadiusRef.current = Math.round(radius);

      const viewerPad = Math.max(8, Math.round(minDim * padFactor));
      root.style.setProperty('--radius', `${lockedRadiusRef.current}px`);
      root.style.setProperty('--viewer-pad', `${viewerPad}px`);
      root.style.setProperty('--overlay-blur-color', overlayBlurColor);
      root.style.setProperty('--tile-radius', imageBorderRadius);
      root.style.setProperty('--enlarge-radius', openedImageBorderRadius);
      root.style.setProperty('--image-filter', grayscale ? 'grayscale(1)' : 'none');
      applyTransform(rotationRef.current.x, rotationRef.current.y);
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [
    fit,
    fitBasis,
    minRadius,
    maxRadius,
    padFactor,
    overlayBlurColor,
    grayscale,
    imageBorderRadius,
    openedImageBorderRadius,
    applyTransform
  ]);

  // Initial transform & smooth entrance
  useEffect(() => {
    applyTransform(rotationRef.current.x, rotationRef.current.y);
    updateCulling(rotationRef.current.y);

    if (mainRef.current) {
      gsap.fromTo(
        mainRef.current,
        {
          opacity: 0
        },
        {
          opacity: 1,
          duration: 1.0,
          ease: 'power2.out'
        }
      );
    }
  }, [applyTransform, updateCulling]);

  // WebGL 3D Ambient Dust Particles
  useEffect(() => {
    const canvas = webglCanvasRef.current;
    if (!canvas) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance'
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 10, 4000);
    camera.position.z = 1100;

    const count = 320;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 950 + Math.random() * 380;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi) - 380;

      const tint = 0.75 + Math.random() * 0.25;
      colors[i * 3] = tint;
      colors[i * 3 + 1] = tint * 0.95;
      colors[i * 3 + 2] = tint * 1.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 3.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    webglMatRef.current = material;

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const updateSize = () => {
      const w = canvas.parentElement?.clientWidth || window.innerWidth;
      const h = canvas.parentElement?.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    webglSceneUpdateRef.current = (rotX, rotY) => {
      points.rotation.x = THREE.MathUtils.degToRad(rotX * 0.65);
      points.rotation.y = THREE.MathUtils.degToRad(rotY * 0.65);
      renderer.render(scene, camera);
    };

    renderer.render(scene, camera);

    return () => {
      window.removeEventListener('resize', updateSize);
      webglSceneUpdateRef.current = null;
      webglMatRef.current = null;
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  const stopInertia = useCallback(() => {
    velocityRef.current = { x: 0, y: 0 };
    targetRotRef.current = { ...rotationRef.current };
    gsap.killTweensOf(rotationRef.current);
  }, []);

  // 60FPS Hardware-accelerated Physics & Render loop
  useEffect(() => {
    let rafId;
    let lastTime = performance.now();

    const tick = now => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (!draggingRef.current && !focusedElRef.current) {
        // Natural low-friction momentum coasting
        if (Math.abs(velocityRef.current.y) > 0.001 || Math.abs(velocityRef.current.x) > 0.001) {
          targetRotRef.current.y += velocityRef.current.y;
          targetRotRef.current.x = clamp(
            targetRotRef.current.x + velocityRef.current.x,
            -maxVerticalRotationDeg,
            maxVerticalRotationDeg
          );

          // Very low friction decay (0.96 per frame at 60fps) — glides smoothly and decelerates softly
          const friction = Math.pow(0.96, dt * 60);
          velocityRef.current.y *= friction;
          velocityRef.current.x *= friction;

          if (Math.abs(velocityRef.current.y) < 0.001 && Math.abs(velocityRef.current.x) < 0.001) {
            velocityRef.current.y = 0;
            velocityRef.current.x = 0;
          }
        }
      }

      // Smooth, jitter-free 60fps lerp
      const diffX = targetRotRef.current.x - rotationRef.current.x;
      const diffY = targetRotRef.current.y - rotationRef.current.y;

      if (Math.abs(diffX) > 0.0001 || Math.abs(diffY) > 0.0001) {
        const lerpFactor = Math.min(1, 1 - Math.pow(0.0001, dt));
        rotationRef.current.x += diffX * lerpFactor;
        rotationRef.current.y += diffY * lerpFactor;
        applyTransform(rotationRef.current.x, rotationRef.current.y);
        updateCulling(rotationRef.current.y);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [applyTransform, maxVerticalRotationDeg, updateCulling]);

  // High-performance Gesture Controller for Drag & Wheel Scroll
  useGesture(
    {
      onDragStart: () => {
        if (focusedElRef.current) return;
        stopInertia();
        draggingRef.current = true;
        movedRef.current = false;
        startRotRef.current = { ...targetRotRef.current };
      },
      onDrag: ({ movement: [mx, my], velocity, direction, last }) => {
        if (focusedElRef.current || !draggingRef.current) return;
        if (!movedRef.current) {
          const dist2 = mx * mx + my * my;
          if (dist2 > 16) movedRef.current = true;
        }

        const divisor = Number(dragDivisor) || 3;

        // Directly update target rotation — RAF loop handles 60fps GPU rendering
        targetRotRef.current.x = clamp(
          startRotRef.current.x - my / divisor,
          -maxVerticalRotationDeg,
          maxVerticalRotationDeg
        );
        targetRotRef.current.y = startRotRef.current.y + mx / divisor;

        if (last) {
          draggingRef.current = false;
          if (movedRef.current) lastDragEndAt.current = performance.now();
          movedRef.current = false;

          // Convert gesture release velocity into natural low-friction momentum
          const [vMagX = 0, vMagY = 0] = velocity || [];
          const [dirX = 0, dirY = 0] = direction || [];
          const vx = vMagX * dirX;
          const vy = vMagY * dirY;

          if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
            velocityRef.current.y = clamp((vx * 16.6) / divisor, -3.2, 3.2);
            velocityRef.current.x = clamp((-vy * 16.6) / (divisor * 2), -0.6, 0.6);
          } else {
            velocityRef.current = { x: 0, y: 0 };
          }
        }
      },
      onWheel: ({ event, delta: [dx, dy] }) => {
        if (focusedElRef.current) return;
        if (event && event.cancelable) event.preventDefault();

        // Fluid 60fps wheel scrolling
        const speed = 0.06;
        targetRotRef.current.y -= (dx || 0) * speed;
        targetRotRef.current.x = clamp(
          targetRotRef.current.x - (dy || 0) * speed,
          -maxVerticalRotationDeg,
          maxVerticalRotationDeg
        );
      }
    },
    {
      target: mainRef,
      eventOptions: { passive: false },
      wheel: { eventOptions: { passive: false } }
    }
  );

  // Close Handler (GSAP animated)
  useEffect(() => {
    const scrim = scrimRef.current;
    if (!scrim) return;

    const close = () => {
      if (performance.now() - openStartedAtRef.current < 250) return;
      const el = focusedElRef.current;
      if (!el) return;
      const overlay = viewerRef.current?.querySelector('.enlarge');
      if (!overlay) return;

      const infoCard = overlay.querySelector('.enlarge-info-card');
      if (infoCard) {
        gsap.to(infoCard, { opacity: 0, y: 12, duration: 0.2, ease: 'power2.in' });
      }
      const closeBtn = overlay.querySelector('.enlarge-close-btn');
      if (closeBtn) {
        gsap.to(closeBtn, { opacity: 0, scale: 0.8, duration: 0.2, ease: 'power2.in' });
      }

      if (webglMatRef.current) {
        gsap.to(webglMatRef.current, { opacity: 0.38, duration: 0.65, ease: 'power2.out' });
      }

      if (scrimRef.current) {
        gsap.to(scrimRef.current, { opacity: 0, duration: 0.55, ease: 'power2.inOut' });
      }

      const curTileR = el.getBoundingClientRect();
      const viewerR = viewerRef.current?.getBoundingClientRect();
      const toLeft = viewerR ? curTileR.left - viewerR.left : 0;
      const toTop = viewerR ? curTileR.top - viewerR.top : 0;

      gsap.to(overlay, {
        left: toLeft,
        top: toTop,
        width: curTileR.width,
        height: curTileR.height,
        borderRadius: imageBorderRadius || '18px',
        opacity: 0,
        duration: 0.62,
        ease: 'power2.inOut',
        force3D: true,
        onComplete: () => {
          overlay.remove();
          el.style.opacity = '';
          targetRotRef.current = { ...rotationRef.current };
          velocityRef.current = { x: 0, y: 0 };
          focusedElRef.current = null;
          rootRef.current?.removeAttribute('data-enlarging');
          openingRef.current = false;
          unlockScroll();
        }
      });
    };

    closeRef.current = close;
    scrim.addEventListener('click', close);
    const onKey = e => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      closeRef.current = null;
      scrim.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [imageBorderRadius, unlockScroll]);

  // Open Handler (Smooth, gentle GSAP animation)
  const openItemFromElement = useCallback(
    (el, it) => {
      if (openingRef.current) return;
      openingRef.current = true;
      openStartedAtRef.current = performance.now();
      lockScroll();
      stopInertia();

      focusedElRef.current = el;
      el.setAttribute('data-focused', 'true');

      const tileR = el.getBoundingClientRect();
      const viewerR = viewerRef.current?.getBoundingClientRect();
      const frameR = frameRef.current?.getBoundingClientRect();

      if (!viewerR || !frameR || tileR.width <= 0 || tileR.height <= 0) {
        openingRef.current = false;
        focusedElRef.current = null;
        unlockScroll();
        return;
      }

      // Calculate target centered dimensions & position in one pass relative to viewerR
      let targetWidth = frameR.width;
      let targetHeight = frameR.height;
      if (openedImageWidth && openedImageHeight) {
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = `position: absolute; width: ${openedImageWidth}; height: ${openedImageHeight}; visibility: hidden; pointer-events: none;`;
        document.body.appendChild(tempDiv);
        const tempRect = tempDiv.getBoundingClientRect();
        document.body.removeChild(tempDiv);
        targetWidth = tempRect.width;
        targetHeight = tempRect.height;
      }
      const targetLeft = frameR.left - viewerR.left + (frameR.width - targetWidth) / 2;
      const targetTop = frameR.top - viewerR.top + (frameR.height - targetHeight) / 2;

      const fromLeft = tileR.left - viewerR.left;
      const fromTop = tileR.top - viewerR.top;
      const fromWidth = tileR.width;
      const fromHeight = tileR.height;

      const overlay = document.createElement('div');
      overlay.className = 'enlarge';
      overlay.style.position = 'absolute';
      overlay.style.left = `${fromLeft}px`;
      overlay.style.top = `${fromTop}px`;
      overlay.style.width = `${fromWidth}px`;
      overlay.style.height = `${fromHeight}px`;
      overlay.style.borderRadius = imageBorderRadius || '18px';
      overlay.style.zIndex = '30';
      overlay.style.willChange = 'left, top, width, height, border-radius, opacity';
      overlay.style.overflow = 'hidden';
      overlay.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';

      const rawSrc = el.parentElement?.dataset.src || el.querySelector('img')?.src || '';
      const img = document.createElement('img');
      img.src = rawSrc;
      img.alt = it?.alt || it?.title || '';
      overlay.appendChild(img);

      if (it && (it.title || it.series?.title)) {
        const seriesTitle = it.title || it.series?.title || 'Archive';
        const location = it.location || it.series?.location || '';
        const date = it.date || it.series?.date || '';
        const metaParts = [location, date].filter(Boolean).join(' · ');
        const photoNumber = typeof it.index === 'number' ? `Photo ${(it.index + 1).toString().padStart(2, '0')}` : '';

        const infoCard = document.createElement('div');
        infoCard.className = 'enlarge-info-card';
        infoCard.innerHTML = `
          <div class="enlarge-info-badge">
            <span class="enlarge-info-tag">ARCHIVES</span>
            ${photoNumber ? `<span class="enlarge-info-count">${photoNumber}</span>` : ''}
          </div>
          <h3 class="enlarge-info-title">${seriesTitle}</h3>
          ${metaParts ? `<p class="enlarge-info-meta">${metaParts}</p>` : ''}
          <div class="enlarge-info-action">
            <span>View in Archives</span>
            <span class="enlarge-info-arrow" aria-hidden="true">↗</span>
          </div>
        `;
        infoCard.style.opacity = '0';
        infoCard.style.transform = 'translateY(16px)';
        overlay.appendChild(infoCard);
      }

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'enlarge-close-btn';
      closeBtn.setAttribute('aria-label', 'Close preview');
      closeBtn.innerHTML = '✕';
      closeBtn.style.opacity = '0';
      closeBtn.style.transform = 'scale(0.8)';
      closeBtn.addEventListener('click', ev => {
        ev.stopPropagation();
        closeRef.current?.();
      });
      overlay.appendChild(closeBtn);

      overlay.style.cursor = 'pointer';
      const handleOverlayClick = ev => {
        if (ev.target.closest('.enlarge-close-btn')) return;
        if (performance.now() - openStartedAtRef.current < 350) return;
        if (onItemOpen) {
          onItemOpen(it);
        }
      };
      overlay.addEventListener('click', handleOverlayClick);

      // Hide original tile smoothly
      el.style.opacity = '0';

      viewerRef.current.appendChild(overlay);
      rootRef.current?.setAttribute('data-enlarging', 'true');

      // WebGL background subtle dim
      if (webglMatRef.current) {
        gsap.to(webglMatRef.current, { opacity: 0.1, duration: 0.8, ease: 'power2.out' });
      }

      // Smooth Scrim fade
      if (scrimRef.current) {
        gsap.to(scrimRef.current, { opacity: 1, duration: 0.65, ease: 'power2.out' });
      }

      // Gentle, luxurious GSAP tween from tile to enlarged center
      gsap.to(overlay, {
        left: targetLeft,
        top: targetTop,
        width: targetWidth,
        height: targetHeight,
        borderRadius: openedImageBorderRadius || '24px',
        boxShadow: '0 25px 65px rgba(0,0,0,0.7)',
        duration: 0.82,
        ease: 'power2.out',
        force3D: true,
        onComplete: () => {
          openingRef.current = false;
        }
      });

      // Stagger details card in softly
      const infoCard = overlay.querySelector('.enlarge-info-card');
      if (infoCard) {
        gsap.to(infoCard, {
          opacity: 1,
          y: 0,
          duration: 0.55,
          delay: 0.32,
          ease: 'power2.out'
        });
      }

      // Stagger close button
      gsap.to(closeBtn, {
        opacity: 1,
        scale: 1,
        duration: 0.45,
        delay: 0.28,
        ease: 'power2.out'
      });
    },
    [
      imageBorderRadius,
      lockScroll,
      openedImageBorderRadius,
      openedImageHeight,
      openedImageWidth,
      stopInertia,
      unlockScroll,
      onItemOpen
    ]
  );

  const onTileClick = useCallback(
    (e, it) => {
      if (draggingRef.current) return;
      if (movedRef.current) return;
      if (performance.now() - lastDragEndAt.current < 80) return;
      if (openingRef.current) return;
      openItemFromElement(e.currentTarget, it);
    },
    [openItemFromElement]
  );

  const onTilePointerUp = useCallback(
    (e, it) => {
      if (e.pointerType !== 'touch') return;
      if (draggingRef.current) return;
      if (movedRef.current) return;
      if (performance.now() - lastDragEndAt.current < 80) return;
      if (openingRef.current) return;
      openItemFromElement(e.currentTarget, it);
    },
    [openItemFromElement]
  );

  useEffect(() => {
    return () => {
      document.body.classList.remove('dg-scroll-lock');
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="sphere-root"
      style={{
        ['--segments-x']: segments,
        ['--segments-y']: segments,
        ['--overlay-blur-color']: overlayBlurColor,
        ['--tile-radius']: imageBorderRadius,
        ['--enlarge-radius']: openedImageBorderRadius,
        ['--image-filter']: grayscale ? 'grayscale(1)' : 'none'
      }}
    >
      <main ref={mainRef} className="sphere-main">
        {/* WebGL 3D depth background canvas */}
        <canvas ref={webglCanvasRef} className="sphere-webgl-canvas" />

        <div className="stage">
          <div ref={sphereRef} className="sphere">
            {items.map((it, i) => (
              <div
                key={`${it.x},${it.y},${i}`}
                ref={el => {
                  itemElsRef.current[i] = el;
                }}
                className="item"
                data-src={it.src}
                data-offset-x={it.x}
                data-offset-y={it.y}
                data-size-x={it.sizeX}
                data-size-y={it.sizeY}
                style={{
                  ['--offset-x']: it.x,
                  ['--offset-y']: it.y,
                  ['--item-size-x']: it.sizeX,
                  ['--item-size-y']: it.sizeY
                }}
              >
                <div
                  className="item__image"
                  role="button"
                  tabIndex={0}
                  aria-label={it.alt || it.title || 'Open image'}
                  onClick={e => onTileClick(e, it)}
                  onPointerUp={e => onTilePointerUp(e, it)}
                >
                  <img src={it.src} draggable={false} alt={it.alt || it.title || ''} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overlay" />
        <div className="overlay overlay--blur" />
        <div className="edge-fade edge-fade--top" />
        <div className="edge-fade edge-fade--bottom" />

        <div className="viewer" ref={viewerRef}>
          <div ref={scrimRef} className="scrim" />
          <div ref={frameRef} className="frame" />
        </div>
      </main>
    </div>
  );
}
