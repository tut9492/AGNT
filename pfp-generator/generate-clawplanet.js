#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

const P = {
  bg: '#0a0808',
  primary: '#ff6b00',      // neon orange
  primaryLight: '#ff9933',
  secondary: '#ff2200',     // red
  secondaryLight: '#ff4444',
  dark: '#1a0a00',
  darkAlt: '#2a1500',
  light: '#ffcc88',
  white: '#ffffff',
  accent: '#ffaa00',        // warm gold
  glow: '#ff8800',
  planet: '#ff5500',
  planetDark: '#cc3300',
  planetLight: '#ff7744',
  static: '#221100',
  glitch1: '#00ffff',       // contrast cyan accent
  glitch2: '#ff00ff',
};

function rngFactory(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function drawClawPlanet(ctx, rng, variant) {
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // === PLANET BODY (sphere-ish) ===
  // Main circle
  ctx.fillStyle = P.primary;
  ctx.fillRect(10, 8, 12, 16);
  ctx.fillRect(9, 9, 14, 14);
  ctx.fillRect(8, 10, 16, 12);
  ctx.fillRect(7, 12, 18, 8);

  // Planet surface shading - darker right side
  ctx.fillStyle = P.planetDark;
  ctx.fillRect(18, 10, 4, 12);
  ctx.fillRect(20, 12, 3, 8);
  ctx.fillRect(17, 9, 4, 14);

  // Lighter left highlight
  ctx.fillStyle = P.planetLight;
  ctx.fillRect(9, 11, 3, 10);
  ctx.fillRect(10, 10, 2, 12);

  // Surface details - craters/terrain
  ctx.fillStyle = P.secondaryLight;
  ctx.fillRect(12, 12, 2, 2);
  ctx.fillRect(16, 16, 3, 2);
  ctx.fillRect(11, 18, 2, 1);
  ctx.fillRect(15, 11, 1, 2);

  // === ORBITAL RING ===
  ctx.fillStyle = P.accent;
  // Horizontal ring across planet
  ctx.fillRect(4, 15, 5, 1);   // left of planet
  ctx.fillRect(5, 14, 3, 1);
  ctx.fillRect(23, 16, 5, 1);  // right of planet
  ctx.fillRect(24, 15, 3, 1);
  // Ring passes behind planet (implied by gap)

  if (variant === 0) {
    // === FRIENDLY FACE ===
    // Eyes - round, warm
    ctx.fillStyle = P.white;
    ctx.fillRect(12, 13, 3, 3);
    ctx.fillRect(18, 13, 3, 3);
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.fillRect(13, 14, 1, 1);
    ctx.fillRect(19, 14, 1, 1);
    // Eye shine
    ctx.fillStyle = P.white;
    ctx.fillRect(12, 13, 1, 1);
    ctx.fillRect(18, 13, 1, 1);
    // Friendly smile
    ctx.fillStyle = '#000000';
    ctx.fillRect(13, 18, 1, 1);
    ctx.fillRect(14, 19, 4, 1);
    ctx.fillRect(18, 18, 1, 1);
  } else if (variant === 1) {
    // === POWERFUL VISOR EYES ===
    ctx.fillStyle = P.glitch1;
    ctx.fillRect(11, 14, 4, 2);
    ctx.fillRect(17, 14, 4, 2);
    // Visor glow
    ctx.fillStyle = P.white;
    ctx.fillRect(12, 14, 1, 1);
    ctx.fillRect(18, 14, 1, 1);
    // Determined mouth
    ctx.fillStyle = '#000000';
    ctx.fillRect(13, 19, 6, 1);
  } else {
    // === GLOWING EYES ===
    ctx.fillStyle = P.accent;
    ctx.fillRect(12, 13, 3, 3);
    ctx.fillRect(18, 13, 3, 3);
    ctx.fillStyle = P.white;
    ctx.fillRect(13, 14, 1, 1);
    ctx.fillRect(19, 14, 1, 1);
    // Small grin
    ctx.fillStyle = '#000000';
    ctx.fillRect(14, 19, 4, 1);
    ctx.fillRect(13, 18, 1, 1);
    ctx.fillRect(18, 18, 1, 1);
    // Teeth
    ctx.fillStyle = P.white;
    ctx.fillRect(15, 19, 1, 1);
    ctx.fillRect(17, 19, 1, 1);
  }

  // === CLAW MARKS (power symbol) ===
  ctx.fillStyle = P.secondary;
  // Three diagonal claw scratches on the planet surface
  ctx.fillRect(20, 10, 1, 1);
  ctx.fillRect(21, 11, 1, 1);
  ctx.fillRect(22, 12, 1, 1);
  
  ctx.fillRect(21, 10, 1, 1);
  ctx.fillRect(22, 11, 1, 1);
  ctx.fillRect(23, 12, 1, 1);
}

function addEffects(ctx, rng, level) {
  // Scanlines
  for (let y = 0; y < SIZE; y += 2) {
    ctx.fillStyle = `rgba(0,0,0,0.1)`;
    ctx.fillRect(0, y, SIZE, 1);
  }

  // Subtle displacement
  const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = imgData.data;
  const orig = new Uint8ClampedArray(d);

  for (let i = 0; i < level * 2; i++) {
    const y = Math.floor(rng() * SIZE);
    const shift = rng() > 0.5 ? 1 : -1;
    for (let x = 0; x < SIZE; x++) {
      const srcX = ((x - shift) + SIZE) % SIZE;
      const di = (y * SIZE + x) * 4;
      const si = (y * SIZE + srcX) * 4;
      d[di] = orig[si]; d[di+1] = orig[si+1]; d[di+2] = orig[si+2]; d[di+3] = orig[si+3];
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Glow particles (warm colors floating around planet)
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = [P.primary, P.accent, P.glow, P.secondary][Math.floor(rng() * 4)];
    ctx.globalAlpha = 0.3 + rng() * 0.4;
    ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Stars in background
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(rng() * SIZE);
    const y = Math.floor(rng() * SIZE);
    ctx.fillStyle = P.white;
    ctx.globalAlpha = 0.2 + rng() * 0.5;
    ctx.fillRect(x, y, 1, 1);
    ctx.globalAlpha = 1;
  }

  // Subtle cyan accent glitch
  if (level >= 2) {
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = P.glitch1;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * SIZE), 1 + Math.floor(rng() * 3), 1);
      ctx.globalAlpha = 1;
    }
  }
}

const outputDir = path.join(__dirname, 'output');

const variants = [
  { name: 'friendly', variant: 0, seed: 42, level: 1 },
  { name: 'visor', variant: 1, seed: 137, level: 2 },
  { name: 'glow', variant: 2, seed: 303, level: 1 },
  { name: 'friendly-alt', variant: 0, seed: 808, level: 2 },
  { name: 'visor-alt', variant: 1, seed: 420, level: 2 },
  { name: 'glow-alt', variant: 2, seed: 1337, level: 2 },
];

variants.forEach(({ name, variant, seed, level }) => {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rng = rngFactory(seed);

  drawClawPlanet(ctx, rng, variant);
  addEffects(ctx, rng, level);

  const out = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const oc = out.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const fn = `clawplanet-${name}.png`;
  fs.writeFileSync(path.join(outputDir, fn), out.toBuffer('image/png'));
  console.log(`Generated: ${fn}`);
});
