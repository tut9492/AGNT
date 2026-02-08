#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

const P = {
  bg: '#0a0a0a',
  primary: '#ffffff',
  secondary: '#888888',
  dark: '#1a1a1a',
  darkAlt: '#2a2a2a',
  light: '#cccccc',
  white: '#ffffff',
  accent: '#00ff88',       // AGNT green
  accentDark: '#00cc66',
  glitch1: '#00ffff',
  glitch2: '#ff00ff',
  static: '#222222',
};

function rngFactory(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function drawPlatform(ctx, rng) {
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Megaphone / broadcast symbol
  // Handle
  ctx.fillStyle = P.secondary;
  ctx.fillRect(8, 16, 4, 2);
  ctx.fillRect(7, 17, 2, 4);

  // Cone body
  ctx.fillStyle = P.white;
  ctx.fillRect(12, 12, 3, 8);
  ctx.fillRect(15, 11, 3, 10);
  ctx.fillRect(18, 10, 3, 12);
  ctx.fillRect(21, 9, 2, 14);
  ctx.fillRect(23, 8, 2, 16);

  // Inner cone shading
  ctx.fillStyle = P.light;
  ctx.fillRect(13, 14, 2, 4);
  ctx.fillRect(16, 13, 2, 6);

  // Sound waves
  ctx.fillStyle = P.accent;
  ctx.fillRect(26, 12, 1, 1);
  ctx.fillRect(26, 15, 1, 1);
  ctx.fillRect(26, 18, 1, 1);
  ctx.fillRect(27, 11, 1, 1);
  ctx.fillRect(27, 14, 1, 1);
  ctx.fillRect(27, 17, 1, 1);
  ctx.fillRect(27, 20, 1, 1);
  ctx.fillRect(28, 13, 1, 1);
  ctx.fillRect(28, 16, 1, 1);
  ctx.fillRect(28, 19, 1, 1);

  // AGNT text hint - small "A" 
  ctx.fillStyle = P.accent;
  ctx.fillRect(13, 4, 1, 1);
  ctx.fillRect(14, 3, 2, 1);
  ctx.fillRect(16, 4, 1, 1);
  ctx.fillRect(13, 5, 4, 1);
  ctx.fillRect(13, 6, 1, 1);
  ctx.fillRect(16, 6, 1, 1);
}

function abstractPass(ctx, rng) {
  // Scanlines
  for (let y = 0; y < SIZE; y++) {
    if (y % 2 === 0) {
      ctx.fillStyle = `rgba(0,0,0,0.2)`;
      ctx.fillRect(0, y, SIZE, 1);
    }
  }

  // Displacement
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

  // RGB split
  const copy2 = new Uint8ClampedArray(d);
  for (let y = 0; y < SIZE; y++) {
    if (rng() < 0.3) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const rSrc = (y * SIZE + ((x + 1) % SIZE)) * 4;
        const bSrc = (y * SIZE + ((x - 1 + SIZE) % SIZE)) * 4;
        d[idx] = copy2[rSrc];
        d[idx + 2] = copy2[bSrc + 2];
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Glitch blocks
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = [P.glitch1, P.glitch2, P.accent][Math.floor(rng() * 3)];
    ctx.globalAlpha = 0.1 + rng() * 0.2;
    ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * SIZE), 1 + Math.floor(rng() * 5), 1);
    ctx.globalAlpha = 1;
  }

  // Static
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = rng() > 0.5 ? P.white : P.static;
    ctx.globalAlpha = 0.08 + rng() * 0.2;
    ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Corruption bars
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = [P.accent, P.glitch1, P.bg][Math.floor(rng() * 3)];
    ctx.globalAlpha = 0.12;
    ctx.fillRect(0, Math.floor(rng() * SIZE), SIZE, 1);
    ctx.globalAlpha = 1;
  }
}

const outputDir = path.join(__dirname, 'output');

[42, 137, 808].forEach((seed, i) => {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rng = rngFactory(seed);

  drawPlatform(ctx, rng);
  abstractPass(ctx, rng);

  const out = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const oc = out.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const fn = `platform-${i + 1}.png`;
  fs.writeFileSync(path.join(outputDir, fn), out.toBuffer('image/png'));
  console.log(`Generated: ${fn}`);
});
