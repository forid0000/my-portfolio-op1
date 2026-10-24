'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { buildLook, parseRgb, rgba, type Look, type Rgb } from '@/lib/dot-look';
import {
  TIERS,
  cheaper,
  networkAllowsAnimation,
  startTier,
  tooExpensive,
  type Tier,
} from '@/lib/dot-quality';

/**
 * Ambient dot-grid background that reacts to the mouse, to touch and to scrolling.
 *
 * - Everyone gets a static CSS dot grid (no JavaScript, no per-frame work).
 * - Once the page has loaded and the browser is idle, it is upgraded to a canvas with a small
 *   physics model: every dot sits on a spring and the page's "energy" moves it.
 *     mouse    the pointer pushes dots away like a fingertip in water, leaves a trail that rings back,
 *              lights the dots near it and joins them with fine lines, with a soft glow underneath;
 *     touch    a finger does the same while it is down (also while it scrolls the page), a tap sends
 *              a shockwave across the page;
 *     scroll   scrolling sends a travelling wave through the dots: faster scrolling, stronger wave;
 *     click    a shockwave ring.
 * - It reads the page's tone from the live theme: on a dark page the glow adds light, on a light
 *   page the same effect is drawn in deeper, inkier versions of the theme colours (lib/dot-look.ts).
 * - It is built to be harmless:
 *     idle      the canvas animates ONLY while something moves; a moment after the input stops the
 *               dots ease back onto the regular grid and the loop stops completely, so an idle page
 *               costs nothing and looks exactly like the static grid;
 *     cheap     dots that are not touched sleep (no maths), drawing is batched into a handful of
 *               calls, the canvas is only as sharp as the tier allows;
 *     adaptive  every frame is timed; when the effect costs more than its budget the quality steps
 *               down (no trail, then no lines/halo and 30 fps) and, if even that is too slow, it
 *               switches itself off and leaves the plain CSS dots (lib/dot-quality.ts). Weak
 *               devices (few cores, little memory, phones) start on a lighter tier.
 * - Skipped entirely for reduced-motion, data-saver, slow connections and the admin.
 */

const SPACING = 48;
/** The pointer keeps its effect this long after it last moved, then the dots settle. */
const SETTLE_MS = 2200;
/** Strength of a resting dot; the CSS grid draws the same (40% colour at 40% opacity). */
const BASE_ALPHA = 0.16;
/** How far the pointer reaches, in pixels. */
const REACH = 190;
const REACH_SQ = REACH * REACH;
/** Push away from the pointer, spring back to the grid, damping, and drag by the pointer's speed. */
const PUSH = 1.7;
const SPRING = 0.05;
const DAMPING = 0.86;
const WAKE = 0.14;
/** A dot never travels further than this from its place. */
const MAX_SHIFT = SPACING * 0.62;
/** Shockwave (click, tap): speed, thickness of the ring that pushes, and how far it travels. */
const SHOCK_SPEED = 10;
const SHOCK_BAND = 70;
const SHOCK_RANGE = 800;
/** Scrolling: how hard it drags the dots, how much they sway sideways, and when it counts as fast. */
const SCROLL_DRAG = 0.05;
const SCROLL_SWAY = 0.014;
const SCROLL_FAST = 28;
/** The trail behind a moving pointer: how many points are kept, and how far each reaches. */
const TRAIL = 12;
const TRAIL_REACH = REACH * 0.55;
/** Quantised strengths: dots with a similar glow are drawn together in one path. */
const LEVELS = 4;
const LINE_MAX = SPACING * 1.9;
/** How many expensive frames in a row (roughly) make the effect step down a tier. */
const STRIKES_TO_EASE_OFF = 24;

const STATIC_GRID_STYLE: React.CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, color-mix(in srgb, var(--primary) 40%, transparent) 1.25px, transparent 1.75px)',
  backgroundSize: `${SPACING}px ${SPACING}px`,
  backgroundPosition: `${SPACING / 2}px ${SPACING / 2}px`,
};

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

function canAnimate(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return networkAllowsAnimation(connection);
}

interface Dot {
  col: number;
  row: number;
  /** Place on the grid. */
  hx: number;
  hy: number;
  /** Offset from the place, and its speed. */
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  size: number;
  /** 0..1: how excited the dot is right now (near the pointer, hit by a wave, or swinging). */
  glow: number;
  /** Resting on its place and not touched: skipped by the physics. */
  asleep: boolean;
}

/**
 * The canvas is divided into tiles; only tiles where something changed (dots that are awake, the
 * light under the pointer, the band a shockwave ring crosses, and where those were a frame ago) are
 * cleared and repainted. 96 px keeps tile edges on whole device pixels at 1x, 1.25x, 1.5x and 2x.
 */
const TILE = 96;
/** Room around the awake dots for their halos and the fine lines. */
const DIRTY_MARGIN = 14;

interface Shock {
  x: number;
  y: number;
  r: number;
  /** 1 for a click, a little less for a tap. */
  power: number;
}

export default function DotWeave() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/administrator');
  const [interactive, setInteractive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Set when the effect proved too heavy for this device: the plain dots stay for this visit. */
  const gaveUp = useRef(false);

  // Decide whether to upgrade to the canvas - only after load, when idle.
  useEffect(() => {
    if (isAdmin || gaveUp.current || !canAnimate()) return;
    let cancelled = false;
    let idleHandle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const enable = () => {
      if (!cancelled && !gaveUp.current) setInteractive(true);
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

    // A canvas cannot read CSS variables or colour-mix(), so the theme colours are resolved through
    // throwaway elements (any CSS colour format works) and read again whenever input wakes the
    // animation, so a changed theme is picked up without a reload.
    const probes = (['--primary', '--secondary', '--foreground', '--background'] as const).map(
      (variable) => {
        const el = document.createElement('span');
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = `position:fixed;width:0;height:0;overflow:hidden;color:var(${variable})`;
        document.body.appendChild(el);
        return el;
      }
    );
    let primary: Rgb = [52, 211, 153];
    let look: Look = buildLook({
      primary,
      secondary: [96, 165, 250],
      foreground: [229, 231, 235],
      background: [29, 35, 42],
    });
    const readColors = () => {
      const read = (i: number, fallback: Rgb) =>
        parseRgb(getComputedStyle(probes[i]).color, fallback);
      primary = read(0, primary);
      look = buildLook({
        primary,
        secondary: read(1, [96, 165, 250]),
        foreground: read(2, [229, 231, 235]),
        background: read(3, [29, 35, 42]),
      });
    };
    readColors();

    let width = 0;
    let height = 0;
    let rows = 0;
    let dots: Dot[] = [];
    /** The dots that are moving or lit this frame; everything else sleeps. */
    const awake: Dot[] = [];
    const shocks: Shock[] = [];
    const trail: { x: number; y: number }[] = [];
    let targetX = 0;
    let targetY = 0;
    let pointerX = 0;
    let pointerY = 0;
    /** The mouse is over the page, or a finger is down. */
    let inside = false;
    let touching = false;
    let touchStart = { x: 0, y: 0, at: 0, moved: false };
    let lastTouchAt = 0;
    /** 0 = the dots rest on the regular grid, 1 = the pointer is fully at work. */
    let power = 0;
    let lastActivity = 0;
    let lastFrame = 0;
    let time = 0;
    let scrollPending = 0;
    let lastScrollY = window.scrollY;
    let scrollSpeed = 0;
    let raf = 0;
    /** Tiles painted this frame and last frame (1 = changed); only these are repainted. */
    let tilesX = 0;
    let tilesY = 0;
    let dirtyNow = new Uint8Array(0);
    let dirtyPrev = new Uint8Array(0);
    let dirtyAll = new Uint8Array(0);

    // Quality: where to start, and what the frames have cost so far.
    const nav = navigator as Navigator & { deviceMemory?: number };
    let tier: Tier = 0;
    let costAvg = 0;
    let intervalAvg = 16.7;
    let framesAtTier = 0;
    /** Consecutive-ish frames that were too expensive: one hitch must never be enough. */
    let strikes = 0;

    // Reused every frame, so drawing allocates nothing.
    const haloBuckets: Dot[][] = Array.from({ length: LEVELS }, () => []);
    const lineBuckets: number[][] = Array.from({ length: LEVELS }, () => []);

    const applySize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, TIERS[tier].dpr);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      canvas.dataset.tier = String(tier);
      // Resizing blanks the canvas: the next frame has to paint all of it.
      dirtyPrev.fill(1);
    };

    const build = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const cols = Math.floor(width / SPACING) + 1;
      rows = Math.floor(height / SPACING) + 1;
      dots = [];
      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          dots.push({
            col,
            row,
            hx: col * SPACING + SPACING / 2,
            hy: row * SPACING + SPACING / 2,
            ox: 0,
            oy: 0,
            vx: 0,
            vy: 0,
            size: 1.25 + Math.random() * 0.5,
            glow: 0,
            asleep: true,
          });
        }
      }
      awake.length = 0;
      tilesX = Math.ceil(width / TILE);
      tilesY = Math.ceil(height / TILE);
      dirtyNow = new Uint8Array(tilesX * tilesY);
      dirtyPrev = new Uint8Array(tilesX * tilesY);
      dirtyAll = new Uint8Array(tilesX * tilesY);
      applySize();
    };

    /** Everything at rest: the same picture as the CSS grid. */
    const drawRest = () => {
      dirtyPrev.fill(0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = rgba(primary, BASE_ALPHA);
      ctx.beginPath();
      for (const d of dots) {
        ctx.moveTo(d.hx + d.size, d.hy);
        ctx.arc(d.hx, d.hy, d.size, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    /** Is something drawn within `m` pixels of (x, y) on a tile that is being repainted? */
    const inDirtyTile = (x: number, y: number, m: number) => {
      for (let i = 0; i < 4; i++) {
        const px = x + (i & 1 ? m : -m);
        const py = y + (i & 2 ? m : -m);
        const tx = Math.min(tilesX - 1, Math.max(0, Math.floor(px / TILE)));
        const ty = Math.min(tilesY - 1, Math.max(0, Math.floor(py / TILE)));
        if (dirtyAll[ty * tilesX + tx]) return true;
      }
      return false;
    };

    /** Repaints only the tiles that changed since the last frame, not the whole page. */
    const draw = (scrollEnergy: number) => {
      const settings = TIERS[tier];
      ctx.save();
      ctx.beginPath();
      for (let ty = 0; ty < tilesY; ty++) {
        for (let tx = 0; tx < tilesX; tx++) {
          if (dirtyAll[ty * tilesX + tx]) ctx.rect(tx * TILE, ty * TILE, TILE, TILE);
        }
      }
      ctx.clip();
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = look.blend;

      // A soft light under the pointer.
      if (settings.spotlight && power > 0.02) {
        const reach = REACH * 1.25;
        const light = ctx.createRadialGradient(pointerX, pointerY, 0, pointerX, pointerY, reach);
        light.addColorStop(0, rgba(look.halo, look.spotAlpha * power));
        light.addColorStop(0.55, rgba(look.core, look.spotAlpha * 0.35 * power));
        light.addColorStop(1, rgba(look.core, 0));
        ctx.fillStyle = light;
        ctx.fillRect(pointerX - reach, pointerY - reach, reach * 2, reach * 2);
      }

      // Shockwave rings (at most four).
      for (const s of shocks) {
        const fade = (1 - s.r / SHOCK_RANGE) * s.power;
        if (fade <= 0) continue;
        ctx.strokeStyle = rgba(look.halo, (look.light ? 0.5 : 0.4) * fade);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Fine lines between neighbouring awake dots, gathered by strength and drawn in a few paths.
      if (settings.lines) {
        for (const bucket of lineBuckets) bucket.length = 0;
        for (const a of awake) {
          if (a.glow < 0.08) continue;
          const ax = a.hx + a.ox;
          const ay = a.hy + a.oy;
          for (let n = 0; n < 4; n++) {
            const dc = n === 1 ? 0 : 1;
            const dr = n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 1 : -1;
            const row = a.row + dr;
            if (row < 0 || row >= rows) continue;
            const b = dots[(a.col + dc) * rows + row];
            if (!b || b.glow < 0.08) continue;
            const bx = b.hx + b.ox;
            const by = b.hy + b.oy;
            const ex = bx - ax;
            const ey = by - ay;
            const dist = Math.sqrt(ex * ex + ey * ey);
            if (dist > LINE_MAX) continue;
            const alpha = Math.min(a.glow, b.glow) * look.lineAlpha * (1 - dist / LINE_MAX) * 1.25;
            if (alpha < 0.04) continue;
            const level = Math.min(LEVELS - 1, Math.floor(alpha * LEVELS * 1.4));
            lineBuckets[level].push(ax, ay, bx, by);
          }
        }
        ctx.lineWidth = look.light ? 1.1 : 1;
        for (let level = 0; level < LEVELS; level++) {
          const segments = lineBuckets[level];
          if (!segments.length) continue;
          ctx.strokeStyle = rgba(look.line, Math.min(0.7, ((level + 1) / LEVELS) * 0.6));
          ctx.beginPath();
          for (let i = 0; i < segments.length; i += 4) {
            ctx.moveTo(segments[i], segments[i + 1]);
            ctx.lineTo(segments[i + 2], segments[i + 3]);
          }
          ctx.stroke();
        }
      }

      // Every dot in the resting strength (excited dots swell a little): one path.
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = rgba(primary, BASE_ALPHA);
      ctx.beginPath();
      for (const d of dots) {
        const x = d.hx + d.ox;
        const y = d.hy + d.oy;
        // Dots on tiles that are not repainted are already on the canvas, exactly as they should be.
        if (!inDirtyTile(x, y, 5)) continue;
        const r = d.glow > 0.01 ? d.size * (1 + d.glow * 0.9) : d.size;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();

      // Excited dots: a halo in the secondary colour and a stronger core, in a few batches by level.
      ctx.globalCompositeOperation = look.blend;
      for (const bucket of haloBuckets) bucket.length = 0;
      for (const d of awake) {
        if (d.glow < 0.08) continue;
        haloBuckets[Math.min(LEVELS - 1, Math.floor(d.glow * LEVELS))].push(d);
      }
      for (let level = 0; level < LEVELS; level++) {
        const group = haloBuckets[level];
        if (!group.length) continue;
        const strength = (level + 0.5) / LEVELS;
        if (settings.halo) {
          ctx.fillStyle = rgba(look.halo, strength * look.haloAlpha);
          ctx.beginPath();
          for (const d of group) {
            const r = d.size * (1.7 + d.glow * (2.4 + scrollEnergy));
            const x = d.hx + d.ox;
            ctx.moveTo(x + r, d.hy + d.oy);
            ctx.arc(x, d.hy + d.oy, r, 0, Math.PI * 2);
          }
          ctx.fill();
        }
        ctx.fillStyle = rgba(look.core, Math.min(0.8, 0.3 + strength * (look.light ? 0.7 : 0.65)));
        ctx.beginPath();
        for (const d of group) {
          const r = d.size * (1 + d.glow * 1.1);
          const x = d.hx + d.ox;
          ctx.moveTo(x + r, d.hy + d.oy);
          ctx.arc(x, d.hy + d.oy, r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      ctx.restore();
    };

    /** Too heavy for this device: step down a tier, or give up and leave the plain CSS dots. */
    const easeOff = () => {
      const next = cheaper(tier);
      costAvg = 0;
      intervalAvg = 16.7;
      framesAtTier = 0;
      strikes = 0;
      if (next === 'off') {
        gaveUp.current = true;
        setInteractive(false);
        return;
      }
      tier = next;
      trail.length = 0;
      applySize();
    };

    const frame = (now: number) => {
      raf = 0;
      const settings = TIERS[tier];
      // The simplest tier runs at about 30 fps: wait for the next frame instead of working twice.
      if (settings.minFrameMs && now - lastFrame < settings.minFrameMs - 2) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const started = performance.now();
      const interval = now - lastFrame;
      const dt = Math.min(interval / 16.667 || 1, 2.5);
      lastFrame = now;
      time += 0.03 * dt;

      // Input: is the pointer or a finger at work? (A finger that stays down without moving
      // settles like a pointer that stopped.)
      const active = (touching || inside) && now - lastActivity < SETTLE_MS;
      power += ((active ? 1 : 0) - power) * Math.min(1, (active ? 0.2 : 0.06) * dt);
      if (!active && power < 0.01) power = 0;

      // The pointer glides to where the mouse or finger is; its speed drags the dots along.
      const prevX = pointerX;
      const prevY = pointerY;
      const follow = Math.min(1, 0.26 * dt);
      pointerX += (targetX - pointerX) * follow;
      pointerY += (targetY - pointerY) * follow;
      const speedX = (pointerX - prevX) / dt;
      const speedY = (pointerY - prevY) / dt;
      const moved = Math.sqrt(speedX * speedX + speedY * speedY);
      if (settings.trail && power > 0 && moved > 0.35) {
        trail.push({ x: pointerX, y: pointerY });
        if (trail.length > TRAIL) trail.shift();
      } else if (trail.length) {
        trail.shift();
      }
      // A box around the trail: dots outside it skip the trail maths entirely.
      let tx0 = Infinity;
      let ty0 = Infinity;
      let tx1 = -Infinity;
      let ty1 = -Infinity;
      for (const p of trail) {
        if (p.x < tx0) tx0 = p.x;
        if (p.y < ty0) ty0 = p.y;
        if (p.x > tx1) tx1 = p.x;
        if (p.y > ty1) ty1 = p.y;
      }
      tx0 -= TRAIL_REACH;
      ty0 -= TRAIL_REACH;
      tx1 += TRAIL_REACH;
      ty1 += TRAIL_REACH;

      // Scrolling: how fast the page moved since the last frame, smoothed.
      const sv = scrollPending / dt;
      scrollPending = 0;
      scrollSpeed += (sv - scrollSpeed) * Math.min(1, 0.3 * dt);
      if (Math.abs(scrollSpeed) < 0.05) scrollSpeed = 0;
      const scrolling = scrollSpeed !== 0;
      const scrollEnergy = Math.min(1, Math.abs(scrollSpeed) / SCROLL_FAST);

      for (let i = shocks.length - 1; i >= 0; i--) {
        shocks[i].r += SHOCK_SPEED * dt;
        if (shocks[i].r > SHOCK_RANGE) shocks.splice(i, 1);
      }
      const pointerOn = power > 0;
      const hasTrail = trail.length > 0;

      const damping = Math.pow(DAMPING, dt);
      awake.length = 0;
      for (const d of dots) {
        const x = d.hx + d.ox;
        const y = d.hy + d.oy;

        // Cheap checks first: is anything reaching this dot? Sleeping dots that nothing reaches
        // cost almost nothing, so a calm page with a small ripple only works on a few dozen dots.
        const dx = x - pointerX;
        const dy = y - pointerY;
        const nearPointer = pointerOn && dx * dx + dy * dy < REACH_SQ;
        const nearTrail = hasTrail && x > tx0 && x < tx1 && y > ty0 && y < ty1;
        let nearShock = false;
        for (const s of shocks) {
          const sx = d.hx - s.x;
          const sy = d.hy - s.y;
          const sd2 = sx * sx + sy * sy;
          const lo = Math.max(0, s.r - SHOCK_BAND);
          const hi = s.r + SHOCK_BAND;
          if (sd2 < hi * hi && sd2 > lo * lo) {
            nearShock = true;
            break;
          }
        }
        if (d.asleep && !nearPointer && !nearTrail && !nearShock && !scrolling) continue;

        let fx = -d.ox * SPRING;
        let fy = -d.oy * SPRING;
        let excite = 0;

        if (nearPointer) {
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const k = 1 - dist / REACH;
          const push = k * k * PUSH * power;
          fx += (dx / dist) * push + speedX * k * WAKE * power;
          fy += (dy / dist) * push + speedY * k * WAKE * power;
          excite = k * k * power;
        }
        if (nearTrail) {
          // The trail behind the pointer: a lighter push that rings out along the path.
          for (let t = 0; t < trail.length; t++) {
            const tp = trail[t];
            const ex = x - tp.x;
            const ey = y - tp.y;
            const td2 = ex * ex + ey * ey;
            if (td2 < TRAIL_REACH * TRAIL_REACH) {
              const td = Math.sqrt(td2) || 1;
              const age = (t + 1) / trail.length;
              const k = (1 - td / TRAIL_REACH) * age;
              fx += (ex / td) * k * k * PUSH * 0.35 * power;
              fy += (ey / td) * k * k * PUSH * 0.35 * power;
              excite = Math.max(excite, k * 0.6 * power);
            }
          }
        }
        if (nearShock) {
          for (const s of shocks) {
            const sx = d.hx - s.x;
            const sy = d.hy - s.y;
            const sd = Math.sqrt(sx * sx + sy * sy) || 1;
            const off = Math.abs(sd - s.r);
            if (off < SHOCK_BAND) {
              const k = (1 - off / SHOCK_BAND) * (1 - s.r / SHOCK_RANGE) * s.power;
              fx += (sx / sd) * k * 2.6;
              fy += (sy / sd) * k * 2.6;
              excite = Math.max(excite, k);
            }
          }
        }
        if (scrolling) {
          // A wave that travels across the grid while the page scrolls, stronger the faster it goes.
          const phase = d.col * 0.5 + d.row * 0.22 + time * 2.4;
          const wave = 0.55 + 0.45 * Math.sin(phase);
          fy += -scrollSpeed * SCROLL_DRAG * wave;
          fx += Math.cos(phase) * Math.abs(scrollSpeed) * SCROLL_SWAY;
          excite = Math.max(excite, scrollEnergy * (0.3 + 0.7 * Math.max(0, Math.sin(phase))));
        }

        d.vx = (d.vx + fx * dt) * damping;
        d.vy = (d.vy + fy * dt) * damping;
        d.ox += d.vx * dt;
        d.oy += d.vy * dt;
        const shift = Math.sqrt(d.ox * d.ox + d.oy * d.oy);
        if (shift > MAX_SHIFT) {
          d.ox *= MAX_SHIFT / shift;
          d.oy *= MAX_SHIFT / shift;
        }
        // Dots that are still swinging stay a little lit, so the wake can be seen ringing out.
        const swing = Math.min(1, (Math.abs(d.vx) + Math.abs(d.vy)) * 0.6);
        d.glow += (Math.max(excite, swing * 0.7) - d.glow) * Math.min(1, 0.3 * dt);

        if (
          Math.abs(d.ox) + Math.abs(d.oy) + Math.abs(d.vx) + Math.abs(d.vy) < 0.02 &&
          d.glow < 0.015 &&
          excite === 0
        ) {
          // Settled: back on its place exactly, and out of the physics until something reaches it.
          d.ox = d.oy = d.vx = d.vy = d.glow = 0;
          d.asleep = true;
        } else {
          d.asleep = false;
          awake.push(d);
        }
      }

      const resting =
        !active && power === 0 && shocks.length === 0 && !scrolling && awake.length === 0;
      if (resting) {
        // Back on the grid exactly, like the CSS version: draw it once and stop the loop.
        drawRest();
        return;
      }

      // The tiles that changed this frame: around the awake dots, under the light that follows
      // the pointer, and along the band each shockwave ring crosses. Those, together with the tiles
      // painted last frame, are repainted; the rest of the page is not touched.
      dirtyNow.fill(0);
      const mark = (x0: number, y0: number, x1: number, y1: number) => {
        const tx0 = Math.max(0, Math.floor(x0 / TILE));
        const ty0 = Math.max(0, Math.floor(y0 / TILE));
        const tx1 = Math.min(tilesX - 1, Math.floor(x1 / TILE));
        const ty1 = Math.min(tilesY - 1, Math.floor(y1 / TILE));
        for (let ty = ty0; ty <= ty1; ty++) {
          for (let tx = tx0; tx <= tx1; tx++) dirtyNow[ty * tilesX + tx] = 1;
        }
      };
      for (const d of awake) {
        const x = d.hx + d.ox;
        const y = d.hy + d.oy;
        mark(x - DIRTY_MARGIN, y - DIRTY_MARGIN, x + DIRTY_MARGIN, y + DIRTY_MARGIN);
      }
      if (settings.spotlight && power > 0.02) {
        const reach = REACH * 1.25;
        mark(pointerX - reach, pointerY - reach, pointerX + reach, pointerY + reach);
      }
      for (const s of shocks) {
        // Only the tiles the ring passes through (a thin band), not the square around it.
        for (let ty = 0; ty < tilesY; ty++) {
          for (let tx = 0; tx < tilesX; tx++) {
            const rx0 = tx * TILE;
            const ry0 = ty * TILE;
            const nx = Math.max(rx0 - s.x, 0, s.x - (rx0 + TILE));
            const ny = Math.max(ry0 - s.y, 0, s.y - (ry0 + TILE));
            const fx = Math.max(Math.abs(s.x - rx0), Math.abs(s.x - (rx0 + TILE)));
            const fy = Math.max(Math.abs(s.y - ry0), Math.abs(s.y - (ry0 + TILE)));
            if (Math.hypot(fx, fy) >= s.r - 4 && Math.hypot(nx, ny) <= s.r + 4) {
              dirtyNow[ty * tilesX + tx] = 1;
            }
          }
        }
      }
      let anyDirty = false;
      for (let i = 0; i < dirtyAll.length; i++) {
        dirtyAll[i] = dirtyNow[i] | dirtyPrev[i];
        if (dirtyAll[i]) anyDirty = true;
      }
      if (anyDirty) draw(scrollEnergy);
      dirtyPrev.set(dirtyNow);

      // Time the frame; a tier that costs too much is stepped down (never back up).
      const cost = performance.now() - started;
      // Single hitches (a garbage collection, a tab switch) are clipped, and it takes a run of
      // expensive frames, not one, before the quality drops.
      costAvg += (Math.min(cost, 40) - costAvg) * 0.12;
      if (interval < 200) intervalAvg += (Math.min(interval, 50) - intervalAvg) * 0.12;
      framesAtTier += 1;
      if (tooExpensive(tier, { costMs: costAvg, intervalMs: intervalAvg, frames: framesAtTier })) {
        // Very slow frames count triple: a struggling device should not suffer for a whole second.
        strikes += intervalAvg > TIERS[tier].slowIntervalMs * 1.5 ? 3 : 1;
      } else {
        strikes = Math.max(0, strikes - 2);
      }
      if (strikes >= STRIKES_TO_EASE_OFF) {
        easeOff();
        if (gaveUp.current) return;
      }

      if (!document.hidden) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      lastActivity = performance.now();
      if (!raf) {
        readColors();
        lastFrame = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const moveTo = (x: number, y: number) => {
      if (!inside) {
        // First movement (or coming back into the window): start there, no sweeping glide.
        pointerX = x;
        pointerY = y;
      }
      inside = true;
      targetX = x;
      targetY = y;
    };

    // Mouse (ignored for a moment after a touch, when the browser makes up mouse events).
    const recentTouch = () => performance.now() - lastTouchAt < 900;
    const onMove = (e: MouseEvent) => {
      if (recentTouch()) return;
      moveTo(e.clientX, e.clientY);
      wake();
    };
    const addShock = (x: number, y: number, strength: number) => {
      if (shocks.length >= 4) shocks.shift();
      shocks.push({ x, y, r: 0, power: strength });
    };
    const onDown = (e: MouseEvent) => {
      if (recentTouch()) return;
      addShock(e.clientX, e.clientY, 1);
      wake();
    };
    // Pointer left the window: stop pushing, let the dots settle.
    const onLeave = () => {
      inside = false;
      wake();
    };

    // Touch: a finger works like the pointer while it is down, also while it scrolls the page.
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      lastTouchAt = performance.now();
      touching = true;
      inside = false;
      pointerX = targetX = t.clientX;
      pointerY = targetY = t.clientY;
      touchStart = { x: t.clientX, y: t.clientY, at: performance.now(), moved: false };
      wake();
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      lastTouchAt = performance.now();
      targetX = t.clientX;
      targetY = t.clientY;
      if (Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 10) {
        touchStart.moved = true;
      }
      wake();
    };
    const onTouchEnd = () => {
      lastTouchAt = performance.now();
      touching = false;
      // A quick tap without moving sends a shockwave.
      if (!touchStart.moved && performance.now() - touchStart.at < 280) {
        addShock(touchStart.x, touchStart.y, 0.85);
      }
      wake();
    };

    // Scrolling (wheel, keys, touch fling): the page's speed becomes a wave through the dots.
    const onScroll = () => {
      const y = window.scrollY;
      scrollPending += y - lastScrollY;
      lastScrollY = y;
      wake();
    };

    const onResize = () => {
      build();
      drawRest();
    };
    // Back on the tab: one frame either carries on or settles the dots onto the grid.
    const onVisibility = () => {
      if (document.hidden || raf) return;
      lastFrame = performance.now();
      raf = requestAnimationFrame(frame);
    };

    build();
    // Weak devices start on a lighter tier; the frames then decide whether even that is affordable.
    tier = startTier({
      cores: navigator.hardwareConcurrency || undefined,
      memoryGb: nav.deviceMemory,
      coarsePointer: window.matchMedia('(pointer: coarse)').matches,
      dotCount: dots.length,
    });
    applySize();
    targetX = pointerX = width / 2;
    targetY = pointerY = height / 2;
    drawRest(); // the resting grid; nothing runs after this until there is input

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      if (raf) cancelAnimationFrame(raf);
      for (const el of probes) el.remove();
    };
  }, [interactive]);

  if (isAdmin) return null;

  return interactive ? (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 w-full h-full z-[-1] pointer-events-none"
    />
  ) : (
    <div
      aria-hidden
      className="fixed inset-0 z-[-1] opacity-40 pointer-events-none"
      style={STATIC_GRID_STYLE}
    />
  );
}
