#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

const P = {
  bg: '#0a0a0a',
  fur: '#888888',
  furLight: '#aaaaaa',
  furMed: '#666666',
  furDark: '#444444',
  black: '#1a1a1a',
  goggleLens: '#00ffff',
  nose: '#ff6633',
  accent: '#ffdd00',
  pink: '#ff88aa',
  glitch1: '#ff00ff',
  glitch2: '#00ffff',
};

function rngFactory(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function drawHomie(ctx) {
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Sparse cat — only key features, lots of breathing room
  
  // Ears — small triangles
  ctx.fillStyle = P.furDark;
  ctx.fillRect(11, 5, 2, 2);
  ctx.fillRect(12, 4, 1, 1);
  ctx.fillStyle = P.pink;
  ctx.fillRect(11, 5, 1, 1);

  ctx.fillStyle = P.furDark;
  ctx.fillRect(19, 5, 2, 2);
  ctx.fillRect(19, 4, 1, 1);
  ctx.fillStyle = P.furMed;
  ctx.fillRect(20, 5, 1, 1);

  // Head — sparse, not filled solid
  ctx.fillStyle = P.fur;
  ctx.fillRect(12, 7, 8, 2); // top of head
  ctx.fillRect(11, 9, 10, 1);
  ctx.fillRect(10, 10, 12, 1);
  
  // Cheeks
  ctx.fillStyle = P.furLight;
  ctx.fillRect(10, 11, 3, 3);
  ctx.fillRect(19, 11, 3, 3);
  
  // Forehead
  ctx.fillStyle = P.furMed;
  ctx.fillRect(14, 7, 4, 2);

  // Goggles — the key feature
  ctx.fillStyle = P.black;
  ctx.fillRect(11, 11, 4, 3);
  ctx.fillRect(17, 11, 4, 3);
  
  // Cyan lenses
  ctx.fillStyle = P.goggleLens;
  ctx.fillRect(12, 11, 2, 2);
  ctx.fillRect(18, 11, 2, 2);

  // Bridge
  ctx.fillStyle = P.furDark;
  ctx.fillRect(15, 12, 2, 1);

  // Nose
  ctx.fillStyle = P.nose;
  ctx.fillRect(15, 14, 2, 1);

  // Mouth hint
  ctx.fillStyle = P.furDark;
  ctx.fillRect(15, 15, 2, 1);

  // Whisker dots
  ctx.fillStyle = P.furLight;
  ctx.fillRect(9, 13, 1, 1);
  ctx.fillRect(22, 13, 1, 1);

  // Body — very minimal
  ctx.fillStyle = P.furLight;
  ctx.fillRect(12, 17, 8, 2);
  ctx.fillStyle = P.fur;
  ctx.fillRect(11, 19, 10, 2);
  
  // Collar
  ctx.fillStyle = P.accent;
  ctx.fillRect(13, 17, 6, 1);

  // Paw hints
  ctx.fillStyle = P.furMed;
  ctx.fillRect(10, 21, 2, 2);
  ctx.fillRect(20, 21, 2, 2);
  ctx.fillStyle = P.furLight;
  ctx.fillRect(13, 22, 3, 1);
  ctx.fillRect(17, 22, 3, 1);
}

function glitchPass(ctx, rng) {
  // Light scanlines
  for (let y = 0; y < SIZE; y++) {
    if (y % 2 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, y, SIZE, 1);
    }
  }

  const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = imgData.data;
  const orig = new Uint8ClampedArray(d);

  // Moderate displacement — only ~25% of rows, shift 1-3px
  for (let y = 0; y < SIZE; y++) {
    if (rng() < 0.25) {
      const shift = (rng() > 0.5 ? 1 : -1) * (1 + Math.floor(rng() * 2));
      for (let x = 0; x < SIZE; x++) {
        const srcX = ((x - shift) + SIZE) % SIZE;
        const di = (y * SIZE + x) * 4, si = (y * SIZE + srcX) * 4;
        d[di]=orig[si]; d[di+1]=orig[si+1]; d[di+2]=orig[si+2]; d[di+3]=orig[si+3];
      }
    }
  }

  // Subtle RGB split — only ~15% of rows, 1px
  const copy2 = new Uint8ClampedArray(d);
  for (let y = 0; y < SIZE; y++) {
    if (rng() < 0.15) {
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

  // THE magenta bar — Homie's signature
  ctx.fillStyle = P.glitch1;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, 12, SIZE, 1);
  ctx.globalAlpha = 0.3;
  ctx.fillRect(0, 13, 20, 1);
  ctx.globalAlpha = 1;

  // Very few glitch accents
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = [P.glitch1, P.glitch2][Math.floor(rng() * 2)];
    ctx.globalAlpha = 0.15 + rng() * 0.15;
    ctx.fillRect(Math.floor(rng()*SIZE), Math.floor(rng()*SIZE), 1+Math.floor(rng()*2), 1);
    ctx.globalAlpha = 1;
  }

  // Minimal static — just a few dots
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = rng() > 0.5 ? '#ffffff' : '#222222';
    ctx.globalAlpha = 0.06 + rng() * 0.1;
    ctx.fillRect(Math.floor(rng()*SIZE), Math.floor(rng()*SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }
}

const outputDir = path.join(__dirname, 'output');

[42, 137, 303, 808, 2026, 1337].forEach((seed, i) => {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rng = rngFactory(seed);

  drawHomie(ctx);
  glitchPass(ctx, rng);

  const out = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const oc = out.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const fn = `homie-v3-${i + 1}.png`;
  fs.writeFileSync(path.join(outputDir, fn), out.toBuffer('image/png'));
  console.log(`Generated: ${fn}`);
});
