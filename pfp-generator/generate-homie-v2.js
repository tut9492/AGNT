#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

const P = {
  bg: '#0a0a0a',
  fur: '#888888',       // main grey fur
  furLight: '#aaaaaa',  // lighter grey
  furMed: '#666666',    // medium grey
  furDark: '#444444',   // darker grey
  furDarkest: '#333333',
  black: '#1a1a1a',     // goggles, dark parts
  goggleLens: '#00ffff',// cyan lenses
  goggleLens2: '#00cccc',
  goggleFrame: '#222222',
  nose: '#ff6633',      // orange nose
  accent: '#ffdd00',    // yellow collar/tag
  pink: '#ff88aa',      // inner ear
  glitch1: '#ff00ff',   // magenta
  glitch2: '#00ffff',   // cyan
  white: '#cccccc',
  static: '#222222',
};

function rngFactory(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function drawHomie(ctx) {
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // === EARS ===
  // Left ear
  ctx.fillStyle = P.furDark;
  ctx.fillRect(8, 3, 4, 4);
  ctx.fillRect(9, 2, 3, 1);
  ctx.fillStyle = P.pink;
  ctx.fillRect(9, 4, 2, 2);

  // Right ear
  ctx.fillStyle = P.furDark;
  ctx.fillRect(20, 3, 4, 4);
  ctx.fillRect(21, 2, 3, 1);
  ctx.fillStyle = P.furMed;
  ctx.fillRect(21, 4, 2, 2);

  // === HEAD ===
  ctx.fillStyle = P.fur;
  ctx.fillRect(9, 7, 14, 12);
  ctx.fillRect(8, 8, 16, 10);
  ctx.fillRect(7, 9, 18, 8);

  // Fur texture - lighter patches
  ctx.fillStyle = P.furLight;
  ctx.fillRect(10, 8, 3, 4);
  ctx.fillRect(14, 7, 4, 2);
  ctx.fillRect(19, 9, 3, 3);
  ctx.fillRect(12, 15, 8, 2);

  // Fur texture - darker stripes (tabby)
  ctx.fillStyle = P.furMed;
  ctx.fillRect(13, 7, 1, 3);
  ctx.fillRect(18, 7, 1, 3);
  ctx.fillRect(9, 10, 1, 4);
  ctx.fillRect(22, 10, 1, 4);
  ctx.fillRect(15, 8, 2, 1);

  // === GOGGLES ===
  // Frame
  ctx.fillStyle = P.goggleFrame;
  ctx.fillRect(8, 10, 7, 5);
  ctx.fillRect(17, 10, 7, 5);
  // Bridge
  ctx.fillRect(15, 11, 2, 2);
  // Strap
  ctx.fillStyle = P.black;
  ctx.fillRect(7, 11, 1, 3);
  ctx.fillRect(24, 11, 1, 3);

  // Lenses - cyan
  ctx.fillStyle = P.goggleLens;
  ctx.fillRect(9, 11, 5, 3);
  ctx.fillRect(18, 11, 5, 3);

  // Lens shine
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.4;
  ctx.fillRect(9, 11, 2, 1);
  ctx.fillRect(18, 11, 2, 1);
  ctx.globalAlpha = 1;

  // Lens darker edge
  ctx.fillStyle = P.goggleLens2;
  ctx.fillRect(12, 13, 2, 1);
  ctx.fillRect(21, 13, 2, 1);

  // === NOSE ===
  ctx.fillStyle = P.nose;
  ctx.fillRect(15, 15, 2, 1);
  ctx.fillRect(14, 16, 4, 1);

  // === MOUTH ===
  ctx.fillStyle = P.furDark;
  ctx.fillRect(14, 17, 1, 1);
  ctx.fillRect(17, 17, 1, 1);
  ctx.fillStyle = P.furMed;
  ctx.fillRect(15, 17, 2, 1);

  // Whisker dots
  ctx.fillStyle = P.furLight;
  ctx.fillRect(8, 15, 1, 1);
  ctx.fillRect(8, 17, 1, 1);
  ctx.fillRect(23, 15, 1, 1);
  ctx.fillRect(23, 17, 1, 1);

  // === BODY (upper) ===
  ctx.fillStyle = P.fur;
  ctx.fillRect(9, 19, 14, 5);
  ctx.fillRect(8, 20, 16, 4);
  
  ctx.fillStyle = P.furLight;
  ctx.fillRect(12, 19, 8, 3);
  ctx.fillRect(13, 22, 6, 2);

  ctx.fillStyle = P.furMed;
  ctx.fillRect(9, 20, 2, 3);
  ctx.fillRect(21, 20, 2, 3);

  // === COLLAR ===
  ctx.fillStyle = P.accent;
  ctx.fillRect(11, 19, 10, 1);
  // Tag
  ctx.fillStyle = P.accent;
  ctx.fillRect(15, 20, 2, 2);
  ctx.fillStyle = P.nose;
  ctx.fillRect(15, 21, 2, 1);

  // === ARMS/PAWS hints ===
  ctx.fillStyle = P.furDark;
  ctx.fillRect(7, 22, 2, 4);
  ctx.fillRect(23, 22, 2, 4);
  ctx.fillStyle = P.furLight;
  ctx.fillRect(7, 25, 2, 1);
  ctx.fillRect(23, 25, 2, 1);
}

function extremeAbstract(ctx, rng) {
  // Scanlines
  for (let y = 0; y < SIZE; y++) {
    if (y % 2 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, y, SIZE, 1);
    }
  }

  // Moderate displacement (30%)
  const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = imgData.data;
  const orig = new Uint8ClampedArray(d);

  for (let y = 0; y < SIZE; y++) {
    if (rng() < 0.30) {
      const shift = (rng() > 0.5 ? 1 : -1) * (1 + Math.floor(rng() * 3));
      for (let x = 0; x < SIZE; x++) {
        const srcX = ((x - shift) + SIZE) % SIZE;
        const di = (y * SIZE + x) * 4;
        const si = (y * SIZE + srcX) * 4;
        d[di]=orig[si]; d[di+1]=orig[si+1]; d[di+2]=orig[si+2]; d[di+3]=orig[si+3];
      }
    }
  }

  // RGB split
  const copy2 = new Uint8ClampedArray(d);
  for (let y = 0; y < SIZE; y++) {
    if (rng() < 0.20) {
      const split = 1;
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
    if (rng() < 0.08) {
      const vShift = (rng() > 0.5 ? 1 : -1) * (1 + Math.floor(rng() * 3));
      for (let y = 0; y < SIZE; y++) {
        const srcY = ((y - vShift) + SIZE) % SIZE;
        const di = (y * SIZE + x) * 4;
        const si = (srcY * SIZE + x) * 4;
        d[di]=copy3[si]; d[di+1]=copy3[si+1]; d[di+2]=copy3[si+2]; d[di+3]=copy3[si+3];
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Magenta corruption bar (signature Homie element)
  ctx.fillStyle = P.glitch1;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, 13, SIZE, 1);
  ctx.globalAlpha = 0.25;
  ctx.fillRect(0, 14, SIZE, 1);
  ctx.globalAlpha = 0.12;
  ctx.fillRect(0, 12, SIZE, 1);
  ctx.globalAlpha = 1;

  // Glitch blocks
  const colors = [P.glitch1, P.glitch2, P.nose, P.accent];
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.globalAlpha = 0.15 + rng() * 0.25;
    ctx.fillRect(Math.floor(rng()*SIZE), Math.floor(rng()*SIZE), 1+Math.floor(rng()*4), 1);
    ctx.globalAlpha = 1;
  }

  // Static
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = rng() > 0.5 ? '#ffffff' : P.static;
    ctx.globalAlpha = 0.06 + rng() * 0.15;
    ctx.fillRect(Math.floor(rng()*SIZE), Math.floor(rng()*SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Corruption bars
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = [P.glitch2, P.bg][Math.floor(rng() * 2)];
    ctx.globalAlpha = 0.1;
    ctx.fillRect(0, Math.floor(rng()*SIZE), SIZE, 1);
    ctx.globalAlpha = 1;
  }

  // Sparks
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = [P.glitch1, P.glitch2, P.accent, '#fff'][Math.floor(rng()*4)];
    ctx.globalAlpha = 0.3 + rng() * 0.4;
    ctx.fillRect(Math.floor(rng()*SIZE), Math.floor(rng()*SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Drips
  for (let i = 0; i < 3; i++) {
    const x = 9 + Math.floor(rng() * 14);
    const len = 2 + Math.floor(rng() * 4);
    ctx.fillStyle = [P.glitch1, P.glitch2, P.fur][Math.floor(rng() * 3)];
    ctx.globalAlpha = 0.3;
    for (let dy = 0; dy < len && 22+dy < SIZE; dy++) ctx.fillRect(x, 22+dy, 1, 1);
    ctx.globalAlpha = 1;
  }
}

const outputDir = path.join(__dirname, 'output');

const seeds = [42, 137, 303, 808, 2026, 1337];

seeds.forEach((seed, i) => {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rng = rngFactory(seed);

  drawHomie(ctx);
  extremeAbstract(ctx, rng);

  const out = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const oc = out.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const fn = `homie-v2-${i + 1}.png`;
  fs.writeFileSync(path.join(outputDir, fn), out.toBuffer('image/png'));
  console.log(`Generated: ${fn}`);
});
