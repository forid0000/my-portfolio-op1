'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Ambient dot-grid background.
 *
 * - Everyone gets a static CSS dot grid (no JavaScript, no per-frame work).
 * - On a desktop with a mouse, once the page has loaded and the browser is idle,
 *   it is upgraded to a canvas where the dots ripple around the pointer.
 * - The canvas animates ONLY while the pointer is moving (plus a short settle)
 *   and then stops completely, so an idle page costs nothing.
 * - Skipped entirely for touch devices, reduced-motion, data-saver, and the admin.
 */

const SPACING = 56;
const SETTLE_MS = 1800;

const STATIC_GRID_STYLE: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 1.25px, transparent 1.75px)',
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

    let width = 0;
    let height = 0;
    let points: { x: number; y: number; phase: number; size: number }[] = [];
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let time = 0;
    let lastActivity = 0;
    let raf = 0;

    const build = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      points = [];
      for (let i = 0; i <= Math.floor(width / SPACING); i++) {
        for (let j = 0; j <= Math.floor(height / SPACING); j++) {
          points.push({
            x: i * SPACING + SPACING / 2,
            y: j * SPACING + SPACING / 2,
            phase: Math.random() * Math.PI * 2,
            size: Math.random() * 1.25 + 1,
          });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
      for (const p of points) {
        const dx = p.x - currentX;
        const dy = p.y - currentY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        // Ripple radiating from the pointer, fading with distance.
        const wave = Math.sin(dist * 0.008 - time) * Math.max(0, 25 - dist * 0.01);
        const drift = Math.sin(p.phase + time * 0.5) * 5;
        const x = p.x + (dx / dist) * wave;
        const y = p.y + (dy / dist) * wave + drift;
        ctx.fillRect(x - p.size, y - p.size, p.size * 2, p.size * 2);
      }
    };

    const frame = () => {
      raf = 0;
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      time += 0.03;
      draw();
      const settling =
        performance.now() - lastActivity < SETTLE_MS ||
        Math.abs(targetX - currentX) > 0.5 ||
        Math.abs(targetY - currentY) > 0.5;
      // Stop the loop entirely once nothing is moving.
      if (settling && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      lastActivity = performance.now();
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      wake();
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
    draw(); // one static frame; nothing runs after this until the pointer moves

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [interactive]);

  if (isAdmin) return null;

  return interactive ? (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 w-full h-full z-[-1] opacity-50 pointer-events-none"
    />
  ) : (
    <div
      aria-hidden
      className="fixed inset-0 z-[-1] opacity-40 pointer-events-none"
      style={STATIC_GRID_STYLE}
    />
  );
}
