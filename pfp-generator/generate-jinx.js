#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

const P = {
  bg: '#08080a',
  primary: '#ffe100',       // electric yellow
  primaryLight: '#fff44f',
  primaryDark: '#ccb400',
  secondary: '#ffaa00',     // warm amber
  accent: '#00eeff',        // electric blue accent
  dark: '#1a1a00',
  light: '#fffff0',
  white: '#ffffff',
  skin: '#2a2a2a',          // dark tech body
  skinLight: '#3a3a3a',
  skinDark: '#1a1a1a',
  bolt: '#ffe100',
  glitch1: '#00ffff',
  glitch2: '#ff00ff',
  static: '#222222',
};

function rngFactory(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function drawJinx(ctx, rng, variant) {
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Head - rounded tech shape
  ctx.fillStyle = P.skin;
  ctx.fillRect(10, 7, 12, 16);
  ctx.fillRect(9, 8, 14, 14);
  ctx.fillRect(8, 9, 16, 12);
  ctx.fillRect(11, 6, 10, 1);

  // Lighter side
  ctx.fillStyle = P.skinLight;
  ctx.fillRect(9, 9, 3, 12);
  ctx.fillRect(10, 8, 2, 14);

  // Darker side
  ctx.fillStyle = P.skinDark;
  ctx.fillRect(20, 9, 3, 12);
  ctx.fillRect(21, 10, 2, 10);

  // Lightning bolt on forehead
  ctx.fillStyle = P.bolt;
  ctx.fillRect(15, 7, 2, 1);
  ctx.fillRect(14, 8, 2, 1);
  ctx.fillRect(13, 9, 3, 1);
  ctx.fillRect(14, 10, 2, 1);
  ctx.fillRect(15, 11, 2, 1);
  ctx.fillRect(16, 12, 1, 1);

  if (variant === 0) {
    // Friendly eyes - bright yellow
    ctx.fillStyle = P.primary;
    ctx.fillRect(11, 13, 3, 3);
    ctx.fillRect(18, 13, 3, 3);
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.fillRect(12, 14, 1, 1);
    ctx.fillRect(19, 14, 1, 1);
    // Eye shine
    ctx.fillStyle = P.white;
    ctx.fillRect(11, 13, 1, 1);
    ctx.fillRect(18, 13, 1, 1);
    // Friendly smile
    ctx.fillStyle = P.primary;
    ctx.fillRect(13, 19, 1, 1);
    ctx.fillRect(14, 20, 4, 1);
    ctx.fillRect(18, 19, 1, 1);
  } else if (variant === 1) {
    // Electric visor eyes
    ctx.fillStyle = P.primary;
    ctx.fillRect(10, 13, 5, 2);
    ctx.fillRect(17, 13, 5, 2);
    // Glow center
    ctx.fillStyle = P.white;
    ctx.fillRect(12, 13, 1, 1);
    ctx.fillRect(19, 13, 1, 1);
    // Straight confident mouth
    ctx.fillStyle = P.primary;
    ctx.fillRect(14, 19, 4, 1);
  } else {
    // Spark eyes - small intense
    ctx.fillStyle = P.primaryLight;
    ctx.fillRect(12, 13, 2, 2);
    ctx.fillRect(18, 13, 2, 2);
    ctx.fillStyle = P.white;
    ctx.fillRect(12, 13, 1, 1);
    ctx.fillRect(18, 13, 1, 1);
    // Grin with spark
    ctx.fillStyle = P.primary;
    ctx.fillRect(13, 19, 6, 1);
    ctx.fillRect(12, 18, 1, 1);
    ctx.fillRect(19, 18, 1, 1);
    // Spark teeth
    ctx.fillStyle = P.white;
    ctx.fillRect(14, 19, 1, 1);
    ctx.fillRect(17, 19, 1, 1);
  }

  // Electric accents on sides
  ctx.fillStyle = P.primary;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(7, 13, 1, 1);
  ctx.fillRect(6, 14, 1, 1);
  ctx.fillRect(24, 13, 1, 1);
  ctx.fillRect(25, 14, 1, 1);
  ctx.globalAlpha = 1;

  // Antenna/spark on top
  ctx.fillStyle = P.primary;
  ctx.fillRect(15, 4, 1, 2);
  ctx.fillRect(16, 5, 1, 1);
  ctx.fillRect(14, 5, 1, 1);
}

function extremeAbstract(ctx, rng) {
  // Scanlines
  for (let y = 0; y < SIZE; y++) {
    if (y % 2 === 0) {
      ctx.fillStyle = `rgba(0,0,0,0.2)`;
      ctx.fillRect(0, y, SIZE, 1);
    }
  }

  // Heavy displacement
  const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = imgData.data;
  const orig = new Uint8ClampedArray(d);

  for (let y = 0; y < SIZE; y++) {
    if (rng() < 0.45) {
      const shift = (rng() > 0.5 ? 1 : -1) * (1 + Math.floor(rng() * 4));
      for (let x = 0; x < SIZE; x++) {
        const srcX = ((x - shift) + SIZE) % SIZE;
        const di = (y * SIZE + x) * 4;
        const si = (y * SIZE + srcX) * 4;
        d[di] = orig[si]; d[di+1] = orig[si+1]; d[di+2] = orig[si+2]; d[di+3] = orig[si+3];
      }
    }
  }

  // RGB split on rows
  const copy2 = new Uint8ClampedArray(d);
  for (let y = 0; y < SIZE; y++) {
    if (rng() < 0.35) {
      const split = 1 + Math.floor(rng() * 2);
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const rSrc = (y * SIZE + ((x + split) % SIZE)) * 4;
        const bSrc = (y * SIZE + ((x - split + SIZE) % SIZE)) * 4;
        d[idx] = copy2[rSrc];
        d[idx + 2] = copy2[bSrc + 2];
      }
    }
  }

  // Vertical corruption
  const copy3 = new Uint8ClampedArray(d);
  for (let x = 0; x < SIZE; x++) {
    if (rng() < 0.12) {
      const vShift = (rng() > 0.5 ? 1 : -1) * (1 + Math.floor(rng() * 3));
      for (let y = 0; y < SIZE; y++) {
        const srcY = ((y - vShift) + SIZE) % SIZE;
        const di = (y * SIZE + x) * 4;
        const si = (srcY * SIZE + x) * 4;
        d[di] = copy3[si]; d[di+1] = copy3[si+1]; d[di+2] = copy3[si+2]; d[di+3] = copy3[si+3];
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Glitch blocks
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = [P.glitch1, P.glitch2, P.primary, P.accent][Math.floor(rng() * 4)];
    ctx.globalAlpha = 0.1 + rng() * 0.2;
    ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * SIZE), 1 + Math.floor(rng() * 5), 1);
    ctx.globalAlpha = 1;
  }

  // Static
  for (let i = 0; i < 35; i++) {
    ctx.fillStyle = rng() > 0.5 ? P.white : P.static;
    ctx.globalAlpha = 0.08 + rng() * 0.2;
    ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Corruption bars
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = [P.glitch1, P.primary, P.bg][Math.floor(rng() * 3)];
    ctx.globalAlpha = 0.12;
    ctx.fillRect(0, Math.floor(rng() * SIZE), SIZE, 1);
    ctx.globalAlpha = 1;
  }

  // Electric sparks floating
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = [P.primary, P.primaryLight, P.accent, P.white][Math.floor(rng() * 4)];
    ctx.globalAlpha = 0.3 + rng() * 0.5;
    ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Drips
  for (let i = 0; i < 4; i++) {
    const x = 9 + Math.floor(rng() * 14);
    const len = 2 + Math.floor(rng() * 5);
    ctx.fillStyle = [P.primary, P.accent, P.glitch2][Math.floor(rng() * 3)];
    ctx.globalAlpha = 0.35;
    for (let dy = 0; dy < len && 22 + dy < SIZE; dy++) {
      ctx.fillRect(x, 22 + dy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

const outputDir = path.join(__dirname, 'output');

const variants = [
  { name: 'friendly', variant: 0, seed: 42 },
  { name: 'friendly-b', variant: 0, seed: 888 },
  { name: 'visor', variant: 1, seed: 137 },
  { name: 'visor-b', variant: 1, seed: 2026 },
  { name: 'spark', variant: 2, seed: 303 },
  { name: 'spark-b', variant: 2, seed: 1337 },
];

variants.forEach(({ name, variant, seed }) => {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rng = rngFactory(seed);

  drawJinx(ctx, rng, variant);
  extremeAbstract(ctx, rng);

  const out = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const oc = out.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const fn = `jinx-${name}.png`;
  fs.writeFileSync(path.join(outputDir, fn), out.toBuffer('image/png'));
  console.log(`Generated: ${fn}`);
});
