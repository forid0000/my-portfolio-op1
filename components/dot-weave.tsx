'use client';

import React, { useEffect, useRef } from 'react';

export default function DotWeave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let particles: {
      originX: number;
      originY: number;
      angle: number;
      speed: number;
      dist: number;
      size: number;
    }[] = [];

    // Mouse tracking for the radial center
    let targetCenterX = width / 2;
    let targetCenterY = height / 2;
    let currentCenterX = width / 2;
    let currentCenterY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      targetCenterX = e.clientX;
      targetCenterY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const initParticles = () => {
      particles = [];
      const spacing = 50; // Wider spacing for full screen to optimize performance
      const cols = Math.floor(width / spacing) + 1;
      const rows = Math.floor(height / spacing) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing + spacing / 2;
          const y = j * spacing + spacing / 2;

          particles.push({
            originX: x,
            originY: y,
            angle: Math.random() * Math.PI * 2, // Random initial phase
            speed: 0.015,
            dist: 0, // Will be calculated dynamically based on mouse
            size: Math.random() * 1.5 + 1,
          });
        }
      }
    };

    initParticles();

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.45)'; // Tech green

      // Smoothly move the center of the radial wave towards the mouse
      currentCenterX += (targetCenterX - currentCenterX) * 0.05;
      currentCenterY += (targetCenterY - currentCenterY) * 0.05;

      time += 0.02;

      particles.forEach((p) => {
        const dx = p.originX - currentCenterX;
        const dy = p.originY - currentCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Phase based on distance from current center creates the radial wave from mouse
        const angle = dist * 0.008 - time;
        const wave = Math.sin(angle);

        // Amplitude decreases the further you are from the center, giving the "bouncing jellyfish" effect near the mouse
        const bounceOffset = wave * Math.max(0, 25 - dist * 0.01);

        const currentDist = dist || 1; // avoid division by zero
        const nx = dx / currentDist;
        const ny = dy / currentDist;

        // Add a slight vertical drift for the "jellyfish" swim globally
        const globalDrift = Math.sin(p.angle + time * 0.5) * 5;

        const x = p.originX + nx * bounceOffset;
        const y = p.originY + ny * bounceOffset + globalDrift;

        // Optimize CPU usage by using fillRect instead of arc, which avoids expensive path calculations
        ctx.fillRect(x - p.size, y - p.size, p.size * 2, p.size * 2);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      targetCenterX = width / 2;
      targetCenterY = height / 2;
      initParticles();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-[-1] opacity-50 mix-blend-screen pointer-events-none"
    />
  );
}
