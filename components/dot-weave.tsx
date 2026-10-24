'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Ambient dot-grid background.
 *
 * - Everyone gets a static CSS dot grid (no JavaScript, no per-frame work).
 * - On a desktop with a mouse, once the page has loaded and the browser is idle,
 *   it is upgraded to a canvas where the dots ripple around the pointer.
 * - The canvas animates ONLY while the pointer is moving (plus a short settle); the dots then
 *   ease back onto the regular grid and the loop stops completely, so an idle page costs nothing
 *   and looks exactly like the static grid (same positions, round dots, same colour and strength).
 * - The colour is the theme's primary colour, read from the live CSS (never a fixed colour), so it
 *   follows whatever the owner picks in Appearance, light or dark.
 * - Skipped entirely for touch devices, reduced-motion, data-saver, and the admin.
 */

const SPACING = 56;
const SETTLE_MS = 1800;

const STATIC_GRID_STYLE: React.CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, color-mix(in srgb, var(--primary) 40%, transparent) 1.25px, transparent 1.75px)',
  backgroundSize: `${SPACING}px ${SPACING}px`,
  backgroundPosition: `${SPACING / 2}px ${SPACING / 2}px`,
};

function canAnimate(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !connection?.saveData;
}

export default function DotWeave() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/administrator');
  const [interactive, setInteractive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Decide whether to upgrade to the canvas - only after load, when idle.
  useEffect(() => {
    if (isAdmin || !canAnimate()) return;
    let cancelled = false;
    let idleHandle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const enable = () => {
      if (!cancelled) setInteractive(true);
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(enable, { timeout: 4000 });
      } else {
        timer = setTimeout(enable, 1500);
      }
    };

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', schedule);
      if (idleHandle !== undefined) window.cancelIdleCallback?.(idleHandle);
      if (timer) clearTimeout(timer);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // A canvas cannot read CSS variables or colour-mix(), so the theme's primary colour is resolved
    // through a throwaway element (any CSS colour format works) and read again whenever the pointer
    // wakes the animation, so a changed theme is picked up without a reload.
    const probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden;color:var(--primary)';
    document.body.appendChild(probe);
    let dotColor = '';
    const readColor = () => {
      dotColor = getComputedStyle(probe).color || 'rgb(52, 211, 153)';
    };
    readColor();

    let width = 0;
    let height = 0;
    let points: { x: number; y: number; phase: number; size: number }[] = [];
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let time = 0;
    let lastActivity = 0;
    // 0 = the dots rest on the regular grid, 1 = fully rippling around the pointer.
    let amp = 0;
    let raf = 0;

    const build = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      points = [];
      for (let i = 0; i <= Math.floor(width / SPACING); i++) {
        for (let j = 0; j <= Math.floor(height / SPACING); j++) {
          points.push({
            x: i * SPACING + SPACING / 2,
            y: j * SPACING + SPACING / 2,
            phase: Math.random() * Math.PI * 2,
            size: 1.25 + Math.random() * 0.5,
          });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = dotColor;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      for (const p of points) {
        let x = p.x;
        let y = p.y;
        if (amp > 0.001) {
          const dx = p.x - currentX;
          const dy = p.y - currentY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          // Ripple radiating from the pointer, fading with distance.
          const wave = Math.sin(dist * 0.008 - time) * Math.max(0, 25 - dist * 0.01) * amp;
          const drift = Math.sin(p.phase + time * 0.5) * 5 * amp;
          x += (dx / dist) * wave;
          y += (dy / dist) * wave + drift;
        }
        ctx.moveTo(x + p.size, y);
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    const frame = () => {
      raf = 0;
      const active = performance.now() - lastActivity < SETTLE_MS;
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      time += 0.03;
      // Swell while the pointer is moving, ease back onto the grid when it stops.
      amp += ((active ? 1 : 0) - amp) * (active ? 0.15 : 0.06);
      if (!active && amp < 0.004) amp = 0;
      draw();
      const moving =
        active ||
        amp > 0 ||
        Math.abs(targetX - currentX) > 0.5 ||
        Math.abs(targetY - currentY) > 0.5;
      // Stop the loop entirely once the dots are back at rest.
      if (moving && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      lastActivity = performance.now();
      if (!raf) {
        readColor();
        raf = requestAnimationFrame(frame);
      }
    };

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      wake();
    };
    // Pointer left the window: let the dots settle instead of rippling around its last position.
    const onLeave = () => {
      lastActivity = performance.now() - SETTLE_MS;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onResize = () => {
      build();
      draw();
    };
    const onVisibility = () => {
      if (!document.hidden) wake();
    };

    build();
    targetX = currentX = width / 2;
    targetY = currentY = height / 2;
    draw(); // the resting grid; nothing runs after this until the pointer moves

    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      if (raf) cancelAnimationFrame(raf);
      probe.remove();
    };
  }, [interactive]);

  if (isAdmin) return null;

  return interactive ? (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 w-full h-full z-[-1] opacity-40 pointer-events-none"
    />
  ) : (
    <div
      aria-hidden
      className="fixed inset-0 z-[-1] opacity-40 pointer-events-none"
      style={STATIC_GRID_STYLE}
    />
  );
}
