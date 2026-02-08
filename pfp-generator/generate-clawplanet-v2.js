#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

const P = {
  bg: '#0a0808',
  primary: '#ff6b00',
  primaryLight: '#ff9933',
  secondary: '#ff2200',
  secondaryLight: '#ff4444',
  dark: '#1a0a00',
  darkAlt: '#2a1500',
  light: '#ffcc88',
  white: '#ffffff',
  accent: '#ffaa00',
  glow: '#ff8800',
  planet: '#ff5500',
  planetDark: '#cc3300',
  planetLight: '#ff7744',
  static: '#221100',
  glitch1: '#00ffff',
  glitch2: '#ff00ff',
};

function rngFactory(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function drawClawPlanet(ctx, rng, variant) {
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Planet body
  ctx.fillStyle = P.primary;
  ctx.fillRect(10, 8, 12, 16);
  ctx.fillRect(9, 9, 14, 14);
  ctx.fillRect(8, 10, 16, 12);
  ctx.fillRect(7, 12, 18, 8);

  // Shading
  ctx.fillStyle = P.planetDark;
  ctx.fillRect(18, 10, 4, 12);
  ctx.fillRect(20, 12, 3, 8);
  ctx.fillRect(17, 9, 4, 14);

  ctx.fillStyle = P.planetLight;
  ctx.fillRect(9, 11, 3, 10);
  ctx.fillRect(10, 10, 2, 12);

  // Surface details
  ctx.fillStyle = P.secondaryLight;
  ctx.fillRect(12, 12, 2, 2);
  ctx.fillRect(16, 16, 3, 2);
  ctx.fillRect(11, 18, 2, 1);
  ctx.fillRect(15, 11, 1, 2);

  // Orbital ring
  ctx.fillStyle = P.accent;
  ctx.fillRect(4, 15, 5, 1);
  ctx.fillRect(5, 14, 3, 1);
  ctx.fillRect(23, 16, 5, 1);
  ctx.fillRect(24, 15, 3, 1);

  if (variant === 0) {
    // Friendly face
    ctx.fillStyle = P.white;
    ctx.fillRect(12, 13, 3, 3);
    ctx.fillRect(18, 13, 3, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(13, 14, 1, 1);
    ctx.fillRect(19, 14, 1, 1);
    ctx.fillStyle = P.white;
    ctx.fillRect(12, 13, 1, 1);
    ctx.fillRect(18, 13, 1, 1);
    ctx.fillStyle = '#000000';
    ctx.fillRect(13, 18, 1, 1);
    ctx.fillRect(14, 19, 4, 1);
    ctx.fillRect(18, 18, 1, 1);
  } else if (variant === 1) {
    // Visor
    ctx.fillStyle = P.glitch1;
    ctx.fillRect(11, 14, 4, 2);
    ctx.fillRect(17, 14, 4, 2);
    ctx.fillStyle = P.white;
    ctx.fillRect(12, 14, 1, 1);
    ctx.fillRect(18, 14, 1, 1);
    ctx.fillStyle = '#000000';
    ctx.fillRect(13, 19, 6, 1);
  } else {
    // Glow eyes
    ctx.fillStyle = P.accent;
    ctx.fillRect(12, 13, 3, 3);
    ctx.fillRect(18, 13, 3, 3);
    ctx.fillStyle = P.white;
    ctx.fillRect(13, 14, 1, 1);
    ctx.fillRect(19, 14, 1, 1);
    ctx.fillStyle = '#000000';
    ctx.fillRect(14, 19, 4, 1);
    ctx.fillRect(13, 18, 1, 1);
    ctx.fillRect(18, 18, 1, 1);
    ctx.fillStyle = P.white;
    ctx.fillRect(15, 19, 1, 1);
    ctx.fillRect(17, 19, 1, 1);
  }

  // Claw marks
  ctx.fillStyle = P.secondary;
  ctx.fillRect(20, 10, 1, 1);
  ctx.fillRect(21, 11, 1, 1);
  ctx.fillRect(22, 12, 1, 1);
  ctx.fillRect(21, 10, 1, 1);
  ctx.fillRect(22, 11, 1, 1);
  ctx.fillRect(23, 12, 1, 1);
}

function heavyAbstract(ctx, rng) {
  // Heavy scanlines
  for (let y = 0; y < SIZE; y += 2) {
    ctx.fillStyle = `rgba(0,0,0,0.15)`;
    ctx.fillRect(0, y, SIZE, 1);
  }

  // Displacement
  const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = imgData.data;
  const orig = new Uint8ClampedArray(d);

  for (let i = 0; i < 8; i++) {
    const y = Math.floor(rng() * SIZE);
    const shift = (rng() > 0.5 ? 1 : -1) * (1 + Math.floor(rng() * 3));
    for (let x = 0; x < SIZE; x++) {
      const srcX = ((x - shift) + SIZE) % SIZE;
      const di = (y * SIZE + x) * 4;
      const si = (y * SIZE + srcX) * 4;
      d[di] = orig[si]; d[di+1] = orig[si+1]; d[di+2] = orig[si+2]; d[di+3] = orig[si+3];
    }
  }

  // Subtle RGB split on some rows
  for (let y = 0; y < SIZE; y++) {
    if (rng() < 0.2) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const rSrc = (y * SIZE + ((x + 1) % SIZE)) * 4;
        const bSrc = (y * SIZE + ((x - 1 + SIZE) % SIZE)) * 4;
        d[idx] = Math.round(d[idx] * 0.7 + orig[rSrc] * 0.3);
        d[idx + 2] = Math.round(d[idx + 2] * 0.7 + orig[bSrc + 2] * 0.3);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Glitch accent blocks
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = [P.glitch1, P.glitch2][Math.floor(rng() * 2)];
    ctx.globalAlpha = 0.15 + rng() * 0.25;
    ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * SIZE), 1 + Math.floor(rng() * 4), 1);
    ctx.globalAlpha = 1;
  }

  // Static
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = rng() > 0.5 ? P.white : P.static;
    ctx.globalAlpha = 0.1 + rng() * 0.3;
    ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Stars
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = P.white;
    ctx.globalAlpha = 0.2 + rng() * 0.5;
    ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Warm particle drip
  for (let i = 0; i < 4; i++) {
    const x = 9 + Math.floor(rng() * 14);
    const len = 2 + Math.floor(rng() * 4);
    ctx.fillStyle = [P.primary, P.accent, P.secondary][Math.floor(rng() * 3)];
    ctx.globalAlpha = 0.4;
    for (let dy = 0; dy < len && 24 + dy < SIZE; dy++) {
      ctx.fillRect(x, 24 + dy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Floating embers
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = [P.primary, P.accent, P.glow][Math.floor(rng() * 3)];
    ctx.globalAlpha = 0.3 + rng() * 0.5;
    ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * 7), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Corruption bars
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = [P.glitch1, P.accent][Math.floor(rng() * 2)];
    ctx.globalAlpha = 0.1;
    ctx.fillRect(0, Math.floor(rng() * SIZE), SIZE, 1);
    ctx.globalAlpha = 1;
  }
}

const outputDir = path.join(__dirname, 'output');

const variants = [
  { name: 'v2-friendly', variant: 0, seed: 42 },
  { name: 'v2-friendly-b', variant: 0, seed: 999 },
  { name: 'v2-visor', variant: 1, seed: 137 },
  { name: 'v2-visor-b', variant: 1, seed: 2026 },
  { name: 'v2-glow', variant: 2, seed: 303 },
  { name: 'v2-glow-b', variant: 2, seed: 1337 },
];

variants.forEach(({ name, variant, seed }) => {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rng = rngFactory(seed);

  drawClawPlanet(ctx, rng, variant);
  heavyAbstract(ctx, rng);

  const out = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const oc = out.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const fn = `clawplanet-${name}.png`;
  fs.writeFileSync(path.join(outputDir, fn), out.toBuffer('image/png'));
  console.log(`Generated: ${fn}`);
});
