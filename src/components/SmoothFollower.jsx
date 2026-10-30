'use client';
import { useState, useEffect, useRef } from 'react';

export default function SmoothFollower() {
  const mousePosition = useRef({ x: -100, y: -100 });
  const dotPosition = useRef({ x: -100, y: -100 });
  const borderDotPosition = useRef({ x: -100, y: -100 });
  const [renderPos, setRenderPos] = useState({
    dot: { x: -100, y: -100 },
    border: { x: -100, y: -100 },
  });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const DOT_SMOOTHNESS = 0.2;
  const BORDER_DOT_SMOOTHNESS = 0.1;

  useEffect(() => {
    // Only enable on desktop pointer devices
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const root = document.documentElement;
    root.classList.add('has-cursor');

    const handleMouseMove = (e) => {
      mousePosition.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) {
        dotPosition.current = { x: e.clientX, y: e.clientY };
        borderDotPosition.current = { x: e.clientX, y: e.clientY };
        setRenderPos({
          dot: { x: e.clientX, y: e.clientY },
          border: { x: e.clientX, y: e.clientY },
        });
        setIsVisible(true);
      }
    };

    const handleWindowLeave = () => setIsVisible(false);
    const handleWindowEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleWindowLeave);
    document.addEventListener('mouseenter', handleWindowEnter);

    // Event delegation handles dynamic elements, routing, and all interactive targets
    const handleMouseOver = (e) => {
      const target = e.target;
      const interactive = target.closest?.(
        'a, button, img, input, textarea, select, [role="button"], [data-cursor], [data-clickable], .cursor-pointer'
      );
      setIsHovering(!!interactive);
    };

    window.addEventListener('mouseover', handleMouseOver, { passive: true });

    let animationId;
    const animate = () => {
      const lerp = (start, end, factor) => {
        return start + (end - start) * factor;
      };

      dotPosition.current.x = lerp(
        dotPosition.current.x,
        mousePosition.current.x,
        DOT_SMOOTHNESS
      );
      dotPosition.current.y = lerp(
        dotPosition.current.y,
        mousePosition.current.y,
        DOT_SMOOTHNESS
      );

      borderDotPosition.current.x = lerp(
        borderDotPosition.current.x,
        mousePosition.current.x,
        BORDER_DOT_SMOOTHNESS
      );
      borderDotPosition.current.y = lerp(
        borderDotPosition.current.y,
        mousePosition.current.y,
        BORDER_DOT_SMOOTHNESS
      );

      setRenderPos({
        dot: { x: dotPosition.current.x, y: dotPosition.current.y },
        border: {
          x: borderDotPosition.current.x,
          y: borderDotPosition.current.y,
        },
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseleave', handleWindowLeave);
      document.removeEventListener('mouseenter', handleWindowEnter);
      cancelAnimationFrame(animationId);
      root.classList.remove('has-cursor');
    };
  }, [isVisible]);

  if (typeof window === 'undefined') return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
      aria-hidden="true"
    >
      {/* Center inner solid dot */}
      <div
        className="absolute rounded-full dark:bg-white bg-black"
        style={{
          width: '8px',
          height: '8px',
          backgroundColor: 'var(--ink)',
          transform: 'translate(-50%, -50%)',
          left: `${renderPos.dot.x}px`,
          top: `${renderPos.dot.y}px`,
        }}
      />

      {/* Outer fluid trailing ring */}
      <div
        className="absolute rounded-full border dark:border-white border-black"
        style={{
          width: isHovering ? '44px' : '28px',
          height: isHovering ? '44px' : '28px',
          borderColor: 'var(--ink)',
          transform: 'translate(-50%, -50%)',
          left: `${renderPos.border.x}px`,
          top: `${renderPos.border.y}px`,
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </div>
  );
}
