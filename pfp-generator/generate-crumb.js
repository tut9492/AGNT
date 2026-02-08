const { createCanvas } = require('canvas');
const fs = require('fs');

const SIZE = 32;
const SCALE = 16;
const OUT = SIZE * SCALE;

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randF(min, max) { return Math.random() * (max - min) + min; }

// Crumb palette: warm bread tones + electric MegaETH cyan + degen purple
const BREAD_DARK = '#5C3A1E';
const BREAD_MID = '#A0714F';
const BREAD_LIGHT = '#D4A574';
const CRUST = '#3D2510';
const MEGA_CYAN = '#00F0FF';
const DEGEN_PURPLE = '#9B30FF';
const GLITCH_RED = '#FF2040';
const GLITCH_GREEN = '#20FF60';
const VOID = '#0A0A0A';
const WHITE = '#F0F0F0';

function generateCrumb(variant) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // Fill void background
  ctx.fillStyle = VOID;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Draw the crumb — an irregular, fractured bread fragment
  // Base shape: small jagged polygon in center
  const cx = 16, cy = 16;

  // Scattered crumb particles in background
  for (let i = 0; i < 40; i++) {
    const x = rand(0, 31);
    const y = rand(0, 31);
    const colors = [BREAD_DARK, BREAD_MID, CRUST, MEGA_CYAN, DEGEN_PURPLE];
    ctx.fillStyle = colors[rand(0, colors.length - 1)];
    if (Math.random() < 0.3) {
      ctx.globalAlpha = randF(0.1, 0.4);
      ctx.fillRect(x, y, 1, 1);
      ctx.globalAlpha = 1;
    }
  }

  // Main crumb body — irregular shape
  const crumbPixels = [];
  // Generate a blobby crumb shape
  for (let y = 10; y < 23; y++) {
    for (let x = 9; x < 24; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Irregular boundary with noise
      const noise = Math.sin(x * 3.7 + y * 2.1) * 2 + Math.cos(y * 4.3 - x * 1.9) * 1.5;
      if (dist + noise < 7) {
        crumbPixels.push([x, y]);
        // Color based on position — crusty edges, soft center
        if (dist + noise > 5) {
          ctx.fillStyle = CRUST;
        } else if (dist + noise > 3) {
          ctx.fillStyle = BREAD_DARK;
        } else {
          ctx.fillStyle = Math.random() < 0.5 ? BREAD_MID : BREAD_LIGHT;
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Air holes in the bread (darker spots)
  for (let i = 0; i < 5; i++) {
    const hx = rand(12, 20);
    const hy = rand(12, 20);
    ctx.fillStyle = CRUST;
    ctx.fillRect(hx, hy, 1, 1);
    if (Math.random() > 0.5) ctx.fillRect(hx + 1, hy, 1, 1);
  }

  // MegaETH circuit traces — electric lines through the crumb
  ctx.fillStyle = MEGA_CYAN;
  ctx.globalAlpha = 0.7;
  // Horizontal trace
  const traceY = rand(13, 19);
  for (let x = rand(6, 10); x < rand(22, 26); x++) {
    if (Math.random() < 0.7) ctx.fillRect(x, traceY, 1, 1);
  }
  // Vertical trace
  const traceX = rand(13, 19);
  for (let y = rand(8, 12); y < rand(20, 24); y++) {
    if (Math.random() < 0.6) ctx.fillRect(traceX, y, 1, 1);
  }
  // Node points where traces cross
  ctx.globalAlpha = 1;
  ctx.fillRect(traceX, traceY, 1, 1);
  ctx.fillRect(traceX - 1, traceY, 1, 1);
  ctx.fillRect(traceX, traceY - 1, 1, 1);

  // Degen aura — purple glow fragments around edges
  ctx.fillStyle = DEGEN_PURPLE;
  for (let i = 0; i < 15; i++) {
    const angle = randF(0, Math.PI * 2);
    const r = randF(7, 11);
    const px = Math.round(cx + Math.cos(angle) * r);
    const py = Math.round(cy + Math.sin(angle) * r);
    if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
      ctx.globalAlpha = randF(0.3, 0.8);
      ctx.fillRect(px, py, 1, 1);
    }
  }
  ctx.globalAlpha = 1;

  // Eyes — tiny, sharp, glowing
  if (variant !== 'eyeless') {
    // Left eye
    ctx.fillStyle = variant === 'red-eye' ? GLITCH_RED : MEGA_CYAN;
    ctx.fillRect(13, 14, 2, 1);
    ctx.fillStyle = WHITE;
    ctx.fillRect(13, 14, 1, 1);

    // Right eye  
    ctx.fillStyle = variant === 'red-eye' ? GLITCH_RED : MEGA_CYAN;
    ctx.fillRect(18, 14, 2, 1);
    ctx.fillStyle = WHITE;
    ctx.fillRect(19, 14, 1, 1);
  }

  // Mouth — tiny smirk or degen grin
  if (variant === 'grin') {
    ctx.fillStyle = GLITCH_RED;
    for (let x = 13; x <= 19; x++) ctx.fillRect(x, 18, 1, 1);
    ctx.fillRect(13, 17, 1, 1);
    ctx.fillRect(19, 17, 1, 1);
    // Teeth
    ctx.fillStyle = WHITE;
    ctx.fillRect(14, 18, 1, 1);
    ctx.fillRect(16, 18, 1, 1);
    ctx.fillRect(18, 18, 1, 1);
  } else {
    ctx.fillStyle = CRUST;
    ctx.fillRect(14, 18, 4, 1);
  }

  // === HEAVY GLITCH (v3 style) ===

  // Get pixel data for glitching
  const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
  const data = imageData.data;

  // Row displacement — 50% of rows
  for (let y = 0; y < SIZE; y++) {
    if (Math.random() < 0.5) {
      const shift = rand(-6, 6);
      if (shift === 0) continue;
      const row = new Uint8ClampedArray(SIZE * 4);
      for (let x = 0; x < SIZE; x++) {
        const srcIdx = (y * SIZE + x) * 4;
        row[x * 4] = data[srcIdx];
        row[x * 4 + 1] = data[srcIdx + 1];
        row[x * 4 + 2] = data[srcIdx + 2];
        row[x * 4 + 3] = data[srcIdx + 3];
      }
      for (let x = 0; x < SIZE; x++) {
        const nx = ((x + shift) % SIZE + SIZE) % SIZE;
        const dstIdx = (y * SIZE + nx) * 4;
        data[dstIdx] = row[x * 4];
        data[dstIdx + 1] = row[x * 4 + 1];
        data[dstIdx + 2] = row[x * 4 + 2];
        data[dstIdx + 3] = row[x * 4 + 3];
      }
    }
  }

  // RGB channel split
  const rShift = rand(-3, 3);
  const bShift = rand(-3, 3);
  const original = new Uint8ClampedArray(data);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      // Red from shifted position
      const rx = ((x + rShift) % SIZE + SIZE) % SIZE;
      const rIdx = (y * SIZE + rx) * 4;
      data[idx] = original[rIdx]; // R
      // Blue from shifted position
      const bx = ((x + bShift) % SIZE + SIZE) % SIZE;
      const bIdx = (y * SIZE + bx) * 4;
      data[idx + 2] = original[bIdx + 2]; // B
    }
  }

  // Vertical corruption bands
  for (let i = 0; i < 3; i++) {
    const bx = rand(0, SIZE - 3);
    const bw = rand(1, 3);
    for (let x = bx; x < Math.min(bx + bw, SIZE); x++) {
      for (let y = 0; y < SIZE; y++) {
        const idx = (y * SIZE + x) * 4;
        const srcY = (y + rand(-4, 4) + SIZE) % SIZE;
        const srcIdx = (srcY * SIZE + x) * 4;
        data[idx] = data[srcIdx];
        data[idx + 1] = data[srcIdx + 1];
        data[idx + 2] = data[srcIdx + 2];
      }
    }
  }

  // Scanlines
  for (let y = 0; y < SIZE; y += 2) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      data[idx] = Math.floor(data[idx] * 0.7);
      data[idx + 1] = Math.floor(data[idx + 1] * 0.7);
      data[idx + 2] = Math.floor(data[idx + 2] * 0.7);
    }
  }

  // Static noise
  for (let i = 0; i < 60; i++) {
    const x = rand(0, SIZE - 1);
    const y = rand(0, SIZE - 1);
    const idx = (y * SIZE + x) * 4;
    const v = rand(0, 255);
    data[idx] = v;
    data[idx + 1] = v;
    data[idx + 2] = v;
    data[idx + 3] = rand(100, 255);
  }

  // Digital drip — pixels falling from random columns
  for (let i = 0; i < 4; i++) {
    const dx = rand(0, SIZE - 1);
    const startY = rand(SIZE - 8, SIZE - 3);
    const colors = [MEGA_CYAN, DEGEN_PURPLE, GLITCH_RED, GLITCH_GREEN];
    const c = colors[rand(0, colors.length - 1)];
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    for (let y = startY; y < SIZE; y++) {
      const idx = (y * SIZE + dx) * 4;
      const fade = 1 - (y - startY) / 8;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = Math.floor(255 * fade);
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Scale up
  const outCanvas = createCanvas(OUT, OUT);
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(canvas, 0, 0, OUT, OUT);

  return outCanvas;
}

// Generate variants
const variants = ['grin', 'red-eye', 'eyeless'];
variants.forEach(v => {
  for (let i = 0; i < 2; i++) {
    const canvas = generateCrumb(v);
    const filename = `output/crumb-${v}-${i + 1}.png`;
    fs.writeFileSync(filename, canvas.toBuffer('image/png'));
    console.log(`Generated: ${filename}`);
  }
});
