'use client';

import { useEffect, useState } from 'react';

export default function Loading() {
  const [progress, setProgress] = useState(10);

  // Fake progress counter: starts fast, slows down as it reaches 99
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99) {
          clearInterval(interval);
          return 99; // Hangs at 99 until navigation actually completes
        }

        let increment = 1;
        if (prev < 50)
          increment = Math.floor(Math.random() * 15) + 8; // Very fast early on
        else if (prev < 80)
          increment = Math.floor(Math.random() * 8) + 4; // Slows down in middle
        else if (prev < 95)
          increment = Math.floor(Math.random() * 3) + 1; // Creeps up near the end
        else increment = 1; // Drops to 1 at the very end

        return Math.min(99, prev + increment);
      });
    }, 60); // 60ms interval for smooth but fast ticks
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050505] text-primary flex flex-col items-center justify-center select-none overflow-hidden cursor-wait font-mono">
      {/* Glowing Core Background (blur radius trimmed for mobile GPU cost) */}
      <div className="absolute w-[90vw] h-[90vw] md:w-[60vw] md:h-[60vw] bg-primary/10 rounded-full blur-3xl animate-pulse" />

      {/* Screen CRT/Scanline Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none z-50 opacity-30" />

      {/* Massive HUD Rings */}
      <div className="relative flex items-center justify-center w-[280px] h-[280px] md:w-[500px] md:h-[500px]">
        {/* Outer Tech Ring */}
        <div className="absolute inset-0 rounded-full border-[2px] border-primary/20 border-t-primary/80 border-b-primary/80 shadow-[0_0_40px_rgba(var(--primary),0.3)] animate-spin [animation-duration:12s]" />

        {/* Middle Dashed Ring (Reverse) */}
        <div className="absolute inset-6 md:inset-12 rounded-full border-[3px] border-primary/10 border-l-primary border-r-primary border-dashed opacity-70 animate-spin [animation-duration:8s] [animation-direction:reverse]" />

        {/* Inner Hex/Data Ring */}
        <div className="absolute inset-16 md:inset-28 rounded-full border border-primary/40 border-dotted opacity-50 animate-spin [animation-duration:20s]" />

        {/* Core Glow Pulse */}
        <div className="absolute inset-24 md:inset-40 bg-primary/20 rounded-full blur-2xl animate-pulse" />

        {/* Central Data Counter */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-primary">
          <div className="flex items-end">
            <span className="text-6xl md:text-8xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-primary drop-shadow-[0_0_10px_rgba(var(--primary),1)]">
              {progress}
            </span>
            <span className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">%</span>
          </div>
          <span className="text-[10px] md:text-sm tracking-[0.4em] opacity-70 mt-4 text-white">
            SYS_INITIALIZING
          </span>
        </div>
      </div>

      {/* Decorative HUD Elements (Desktop) */}
      <div className="absolute top-8 left-8 hidden md:block text-xs text-primary/60 tracking-wider">
        <p className="animate-pulse mb-1 text-white">ROOT_ACCESS: GRANTED</p>
        <p>SECURE_CONNECTION: ESTABLISHED</p>
        <p>ENCRYPTION: AES-256-GCM</p>
        <p>PORT: 443 [HTTPS]</p>
      </div>

      <div className="absolute bottom-8 right-8 hidden md:block text-xs text-primary/60 tracking-wider text-right">
        <p>DATA_STREAM_PROTOCOL: ACTIVE</p>
        <p>MEMORY_ALLOCATION: OPTIMAL</p>
        <div className="flex justify-end items-center gap-2 mt-1">
          <span className="text-white">AWAITING_HANDSHAKE</span>
          <div className="w-2 h-4 bg-primary animate-pulse" />
        </div>
      </div>

      {/* Mobile Footer Status */}
      <div className="absolute bottom-12 md:bottom-20 text-sm md:text-xl tracking-[0.4em] font-medium text-white uppercase drop-shadow-[0_0_8px_rgba(var(--primary),0.8)] animate-pulse">
        Establishing Link...
      </div>
    </div>
  );
}
