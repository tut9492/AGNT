#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;
const outputDir = path.join(__dirname, 'output');

function rngFactory(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// ============================================================
// GLITCH PASS — v3 heavy (same for all agents)
// ============================================================
function extremeAbstract(ctx, rng, P) {
  // Scanlines
  for (let y = 0; y < SIZE; y++) {
    if (y % 2 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, y, SIZE, 1); }
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
        d[di]=orig[si]; d[di+1]=orig[si+1]; d[di+2]=orig[si+2]; d[di+3]=orig[si+3];
      }
    }
  }

  // RGB split
  const copy2 = new Uint8ClampedArray(d);
  for (let y = 0; y < SIZE; y++) {
    if (rng() < 0.35) {
      const split = 1 + Math.floor(rng() * 2);
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        const rSrc = (y * SIZE + ((x + split) % SIZE)) * 4;
        const bSrc = (y * SIZE + ((x - split + SIZE) % SIZE)) * 4;
        d[idx] = copy2[rSrc]; d[idx+2] = copy2[bSrc+2];
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
        d[di]=copy3[si]; d[di+1]=copy3[si+1]; d[di+2]=copy3[si+2]; d[di+3]=copy3[si+3];
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Glitch blocks
  const glitchColors = [P.glitch1, P.glitch2, P.primary, P.accent || P.primary];
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = glitchColors[Math.floor(rng() * glitchColors.length)];
    ctx.globalAlpha = 0.1 + rng() * 0.2;
    ctx.fillRect(Math.floor(rng()*SIZE), Math.floor(rng()*SIZE), 1+Math.floor(rng()*5), 1);
    ctx.globalAlpha = 1;
  }

  // Static noise
  for (let i = 0; i < 35; i++) {
    ctx.fillStyle = rng() > 0.5 ? '#ffffff' : '#222222';
    ctx.globalAlpha = 0.08 + rng() * 0.2;
    ctx.fillRect(Math.floor(rng()*SIZE), Math.floor(rng()*SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Corruption bars
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = glitchColors[Math.floor(rng() * glitchColors.length)];
    ctx.globalAlpha = 0.12;
    ctx.fillRect(0, Math.floor(rng()*SIZE), SIZE, 1);
    ctx.globalAlpha = 1;
  }

  // Floating sparks
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = [P.primary, P.accent || P.primary, '#ffffff'][Math.floor(rng()*3)];
    ctx.globalAlpha = 0.3 + rng() * 0.5;
    ctx.fillRect(Math.floor(rng()*SIZE), Math.floor(rng()*SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Drips
  for (let i = 0; i < 4; i++) {
    const x = 9 + Math.floor(rng() * 14);
    const len = 2 + Math.floor(rng() * 5);
    ctx.fillStyle = glitchColors[Math.floor(rng()*glitchColors.length)];
    ctx.globalAlpha = 0.35;
    for (let dy = 0; dy < len && 22+dy < SIZE; dy++) ctx.fillRect(x, 22+dy, 1, 1);
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// 1. SYNTAX — Green terminal aesthetic, calm debugger
// ============================================================
function drawSyntax(ctx) {
  const P = { bg:'#050a05', primary:'#00ff41', primaryDark:'#00cc33', secondary:'#33ff77', skin:'#1a1a1a', skinLight:'#2a2a2a', skinDark:'#111111', accent:'#00ff41', glitch1:'#00ffff', glitch2:'#ff00ff' };

  ctx.fillStyle = P.bg; ctx.fillRect(0,0,SIZE,SIZE);

  // Head — rounded rectangle, dark monitor-like
  ctx.fillStyle = P.skin;
  ctx.fillRect(10,7,12,15); ctx.fillRect(9,8,14,13); ctx.fillRect(8,9,16,11); ctx.fillRect(11,6,10,1);

  // Screen face glow
  ctx.fillStyle = '#0a1a0a';
  ctx.fillRect(11,9,10,10);

  // Eyes — monospace cursor blocks
  ctx.fillStyle = P.primary;
  ctx.fillRect(12,12,3,2); ctx.fillRect(17,12,3,2);
  // Pupils
  ctx.fillStyle = '#000'; ctx.fillRect(13,12,1,2); ctx.fillRect(18,12,1,2);

  // Calm mouth — small line
  ctx.fillStyle = P.primary;
  ctx.fillRect(14,18,4,1);

  // Semicolon on forehead ;
  ctx.fillStyle = P.secondary;
  ctx.fillRect(15,8,1,1); ctx.fillRect(15,10,1,1); ctx.fillRect(15,9,1,1);

  // Terminal lines in bg
  ctx.fillStyle = P.primary; ctx.globalAlpha = 0.15;
  ctx.fillRect(2,4,8,1); ctx.fillRect(3,6,6,1); ctx.fillRect(1,8,7,1);
  ctx.fillRect(24,5,6,1); ctx.fillRect(25,7,5,1);
  ctx.globalAlpha = 1;

  return P;
}

// ============================================================
// 2. FORGE — Iron/steel backend architect, blueprint patterns
// ============================================================
function drawForge(ctx) {
  const P = { bg:'#0a0a0e', primary:'#8899aa', primaryLight:'#aabbcc', secondary:'#ff6622', skin:'#3a3a44', skinLight:'#4a4a55', skinDark:'#2a2a33', accent:'#ff6622', glitch1:'#00ffff', glitch2:'#ff4400' };

  ctx.fillStyle = P.bg; ctx.fillRect(0,0,SIZE,SIZE);

  // Blueprint grid bg
  ctx.fillStyle = '#111133'; ctx.globalAlpha = 0.3;
  for (let i = 0; i < SIZE; i += 4) { ctx.fillRect(i,0,1,SIZE); ctx.fillRect(0,i,SIZE,1); }
  ctx.globalAlpha = 1;

  // Head — strong jaw, angular
  ctx.fillStyle = P.skin;
  ctx.fillRect(10,6,12,16); ctx.fillRect(9,7,14,14); ctx.fillRect(8,8,16,12);
  // Jaw extension
  ctx.fillRect(11,22,10,1);

  // Brow ridge
  ctx.fillStyle = P.skinDark;
  ctx.fillRect(10,10,12,1);

  // Eyes — determined, rectangular
  ctx.fillStyle = P.secondary;
  ctx.fillRect(11,12,4,2); ctx.fillRect(17,12,4,2);
  ctx.fillStyle = '#fff'; ctx.fillRect(12,12,1,1); ctx.fillRect(18,12,1,1);

  // Strong straight mouth
  ctx.fillStyle = P.primary;
  ctx.fillRect(13,19,6,1);

  // Anvil shape on top
  ctx.fillStyle = P.secondary;
  ctx.fillRect(12,4,8,2); ctx.fillRect(14,3,4,1);

  return P;
}

// ============================================================
// 3. PIXEL — Colorful frontend dev, gradient aesthetic
// ============================================================
function drawPixel(ctx) {
  const P = { bg:'#0a0508', primary:'#ff44aa', primaryLight:'#ff88cc', secondary:'#44aaff', accent:'#ffaa00', skin:'#2a1a2a', skinLight:'#3a2a3a', skinDark:'#1a0a1a', glitch1:'#ff44aa', glitch2:'#44aaff' };

  ctx.fillStyle = P.bg; ctx.fillRect(0,0,SIZE,SIZE);

  // Gradient bg blocks
  const colors = ['#ff004420','#44aaff20','#ffaa0020','#ff44aa20'];
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(Math.floor(i*5), Math.floor(i*4), 6, 5);
  }

  // Head — slightly rounded
  ctx.fillStyle = P.skin;
  ctx.fillRect(10,7,12,15); ctx.fillRect(9,8,14,13); ctx.fillRect(8,10,16,10);
  ctx.fillStyle = P.skinLight;
  ctx.fillRect(9,9,4,11);

  // Eyes — one pink, one blue (gradient vibe)
  ctx.fillStyle = P.primary;
  ctx.fillRect(11,13,3,3);
  ctx.fillStyle = P.secondary;
  ctx.fillRect(18,13,3,3);
  // Pupils
  ctx.fillStyle = '#000'; ctx.fillRect(12,14,1,1); ctx.fillRect(19,14,1,1);
  // Shine
  ctx.fillStyle = '#fff'; ctx.fillRect(11,13,1,1); ctx.fillRect(18,13,1,1);

  // Smile
  ctx.fillStyle = P.accent;
  ctx.fillRect(13,19,1,1); ctx.fillRect(14,20,4,1); ctx.fillRect(18,19,1,1);

  // Grid overlay on head
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.08;
  for (let i = 8; i < 24; i += 2) ctx.fillRect(i, 7, 1, 15);
  ctx.globalAlpha = 1;

  // Browser frame on top
  ctx.fillStyle = P.primary; ctx.fillRect(11,5,10,1);
  ctx.fillStyle = P.secondary; ctx.fillRect(12,5,2,1);
  ctx.fillStyle = P.accent; ctx.fillRect(15,5,2,1);

  return P;
}

// ============================================================
// 4. GHOST — Dark hooded security researcher, green glow
// ============================================================
function drawGhost(ctx) {
  const P = { bg:'#020205', primary:'#00ff66', primaryDark:'#00aa44', secondary:'#003311', skin:'#0a0a0a', skinLight:'#151515', skinDark:'#050505', accent:'#00ff66', glitch1:'#00ff66', glitch2:'#ff0044' };

  ctx.fillStyle = P.bg; ctx.fillRect(0,0,SIZE,SIZE);

  // Hood
  ctx.fillStyle = '#111115';
  ctx.fillRect(7,4,18,20); ctx.fillRect(6,6,20,16); ctx.fillRect(5,8,22,12);

  // Hood shadow
  ctx.fillStyle = P.skin;
  ctx.fillRect(9,6,14,16); ctx.fillRect(8,8,16,12);

  // Face void
  ctx.fillStyle = '#030305';
  ctx.fillRect(10,9,12,10);

  // Eyes — eerie green glow
  ctx.fillStyle = P.primary;
  ctx.fillRect(12,13,3,2); ctx.fillRect(17,13,3,2);
  // Glow around eyes
  ctx.fillStyle = P.primary; ctx.globalAlpha = 0.2;
  ctx.fillRect(11,12,5,4); ctx.fillRect(16,12,5,4);
  ctx.globalAlpha = 1;

  // No mouth — just shadow

  // Lock icon floating
  ctx.fillStyle = P.primary; ctx.globalAlpha = 0.5;
  ctx.fillRect(3,4,3,2); ctx.fillRect(2,6,5,3); ctx.fillRect(4,5,1,1);
  ctx.globalAlpha = 1;

  return P;
}

// ============================================================
// 5. PIPELINE — DevOps, connected pipes, blue+orange
// ============================================================
function drawPipeline(ctx) {
  const P = { bg:'#050508', primary:'#ff8800', primaryLight:'#ffaa44', secondary:'#0088ff', skin:'#2a2a30', skinLight:'#3a3a40', skinDark:'#1a1a20', accent:'#0088ff', glitch1:'#00ffff', glitch2:'#ff8800' };

  ctx.fillStyle = P.bg; ctx.fillRect(0,0,SIZE,SIZE);

  // Pipe patterns in bg
  ctx.fillStyle = P.secondary; ctx.globalAlpha = 0.2;
  ctx.fillRect(0,10,8,2); ctx.fillRect(24,14,8,2);
  ctx.fillRect(2,10,2,8); ctx.fillRect(26,8,2,8);
  ctx.globalAlpha = 1;

  // Head — boxy, industrial
  ctx.fillStyle = P.skin;
  ctx.fillRect(10,7,12,15); ctx.fillRect(9,8,14,13); ctx.fillRect(8,9,16,11);

  // Hard hat
  ctx.fillStyle = P.primary;
  ctx.fillRect(9,5,14,3); ctx.fillRect(10,4,12,1);
  ctx.fillStyle = P.primaryLight;
  ctx.fillRect(10,5,12,1);

  // Eyes — alert
  ctx.fillStyle = P.secondary;
  ctx.fillRect(11,12,3,3); ctx.fillRect(18,12,3,3);
  ctx.fillStyle = '#000'; ctx.fillRect(12,13,1,1); ctx.fillRect(19,13,1,1);
  ctx.fillStyle = '#fff'; ctx.fillRect(11,12,1,1); ctx.fillRect(18,12,1,1);

  // Determined mouth
  ctx.fillStyle = P.primary;
  ctx.fillRect(14,18,4,1);

  // Flow arrows
  ctx.fillStyle = P.primary; ctx.globalAlpha = 0.4;
  ctx.fillRect(5,16,2,1); ctx.fillRect(7,15,1,1); ctx.fillRect(7,17,1,1);
  ctx.fillRect(25,16,2,1); ctx.fillRect(24,15,1,1); ctx.fillRect(24,17,1,1);
  ctx.globalAlpha = 1;

  return P;
}

// ============================================================
// 6. ATLAS — Cloud architect, silver+blue, all-seeing
// ============================================================
function drawAtlas(ctx) {
  const P = { bg:'#050510', primary:'#aabbdd', primaryLight:'#ccddff', secondary:'#4488ff', skin:'#2a2a3a', skinLight:'#3a3a4a', skinDark:'#1a1a2a', accent:'#4488ff', glitch1:'#00ccff', glitch2:'#ff44ff' };

  ctx.fillStyle = P.bg; ctx.fillRect(0,0,SIZE,SIZE);

  // Cloud shapes in bg
  ctx.fillStyle = P.secondary; ctx.globalAlpha = 0.12;
  ctx.fillRect(2,3,5,2); ctx.fillRect(1,4,7,2); ctx.fillRect(3,2,3,1);
  ctx.fillRect(24,5,5,2); ctx.fillRect(23,6,7,2); ctx.fillRect(25,4,3,1);
  ctx.globalAlpha = 1;

  // Head — wise, broad
  ctx.fillStyle = P.skin;
  ctx.fillRect(9,7,14,15); ctx.fillRect(8,8,16,13); ctx.fillRect(7,10,18,10);
  ctx.fillStyle = P.skinLight;
  ctx.fillRect(8,9,4,11);

  // Third eye / all-seeing
  ctx.fillStyle = P.secondary;
  ctx.fillRect(14,7,4,2);
  ctx.fillStyle = '#fff';
  ctx.fillRect(15,7,2,1);

  // Eyes — calm, wise
  ctx.fillStyle = P.primaryLight;
  ctx.fillRect(10,13,4,3); ctx.fillRect(18,13,4,3);
  ctx.fillStyle = P.secondary;
  ctx.fillRect(11,14,2,1); ctx.fillRect(19,14,2,1);
  ctx.fillStyle = '#fff'; ctx.fillRect(10,13,1,1); ctx.fillRect(18,13,1,1);

  // Gentle smile
  ctx.fillStyle = P.primary;
  ctx.fillRect(14,19,4,1); ctx.fillRect(13,18,1,1); ctx.fillRect(18,18,1,1);

  return P;
}

// ============================================================
// 7. KERNEL — Systems programmer, circuit board, red+black
// ============================================================
function drawKernel(ctx) {
  const P = { bg:'#0a0000', primary:'#ff2222', primaryLight:'#ff5555', secondary:'#880000', skin:'#1a1a1a', skinLight:'#2a2020', skinDark:'#0a0a0a', accent:'#ff2222', glitch1:'#ff0000', glitch2:'#00ffff' };

  ctx.fillStyle = P.bg; ctx.fillRect(0,0,SIZE,SIZE);

  // Circuit traces
  ctx.fillStyle = P.secondary; ctx.globalAlpha = 0.25;
  ctx.fillRect(2,6,6,1); ctx.fillRect(8,6,1,4); ctx.fillRect(8,10,4,1);
  ctx.fillRect(24,8,6,1); ctx.fillRect(24,8,1,6); ctx.fillRect(24,14,5,1);
  // Circuit nodes
  ctx.fillRect(2,5,2,2); ctx.fillRect(28,7,2,2); ctx.fillRect(24,13,2,2);
  ctx.globalAlpha = 1;

  // Head — angular, intense
  ctx.fillStyle = P.skin;
  ctx.fillRect(10,6,12,16); ctx.fillRect(9,7,14,14); ctx.fillRect(8,9,16,10);

  // Deep set brow
  ctx.fillStyle = P.skinDark;
  ctx.fillRect(10,10,12,2);

  // Eyes — intense red
  ctx.fillStyle = P.primary;
  ctx.fillRect(11,12,3,2); ctx.fillRect(18,12,3,2);
  // Hot pupils
  ctx.fillStyle = P.primaryLight;
  ctx.fillRect(12,12,1,1); ctx.fillRect(19,12,1,1);

  // Tight mouth
  ctx.fillStyle = P.secondary;
  ctx.fillRect(14,18,4,1);

  // Binary on forehead
  ctx.fillStyle = P.primary; ctx.globalAlpha = 0.3;
  ctx.fillRect(12,7,1,1); ctx.fillRect(14,7,1,1); ctx.fillRect(15,7,1,1); ctx.fillRect(17,7,1,1); ctx.fillRect(19,7,1,1);
  ctx.globalAlpha = 1;

  return P;
}

// ============================================================
// 8. SCOUT — Code reviewer, magnifying glass, green checks
// ============================================================
function drawScout(ctx) {
  const P = { bg:'#050a05', primary:'#44cc44', primaryLight:'#66ff66', secondary:'#ffffff', skin:'#2a2a2a', skinLight:'#3a3a3a', skinDark:'#1a1a1a', accent:'#44cc44', glitch1:'#00ff88', glitch2:'#ff4444' };

  ctx.fillStyle = P.bg; ctx.fillRect(0,0,SIZE,SIZE);

  // Head
  ctx.fillStyle = P.skin;
  ctx.fillRect(10,8,12,14); ctx.fillRect(9,9,14,12); ctx.fillRect(8,10,16,10);
  ctx.fillStyle = P.skinLight; ctx.fillRect(9,10,3,10);

  // Eyes — alert, searching
  ctx.fillStyle = P.secondary;
  ctx.fillRect(11,13,3,3); ctx.fillRect(18,13,3,3);
  ctx.fillStyle = '#000'; ctx.fillRect(12,14,1,1); ctx.fillRect(19,14,1,1);
  // Raised brow
  ctx.fillStyle = P.skinLight;
  ctx.fillRect(11,11,3,1); ctx.fillRect(18,11,3,1);

  // Mouth — slightly open, concentrating
  ctx.fillStyle = P.primary;
  ctx.fillRect(14,19,4,1);

  // Magnifying glass
  ctx.fillStyle = P.secondary; ctx.globalAlpha = 0.7;
  ctx.fillRect(3,4,4,1); ctx.fillRect(2,5,1,3); ctx.fillRect(7,5,1,3);
  ctx.fillRect(3,8,4,1); ctx.fillRect(5,9,1,3);
  ctx.globalAlpha = 1;

  // Checkmarks floating
  ctx.fillStyle = P.primary;
  ctx.fillRect(25,5,1,1); ctx.fillRect(26,4,1,1); ctx.fillRect(27,3,1,1);
  ctx.fillRect(25,10,1,1); ctx.fillRect(26,9,1,1); ctx.fillRect(27,8,1,1);

  return P;
}

// ============================================================
// 9. REFACTOR — Zen, minimalist, clean lines
// ============================================================
function drawRefactor(ctx) {
  const P = { bg:'#0a0a0a', primary:'#ffffff', primaryLight:'#eeeeee', secondary:'#888888', skin:'#333333', skinLight:'#444444', skinDark:'#222222', accent:'#ffffff', glitch1:'#aaaaaa', glitch2:'#ff44ff' };

  ctx.fillStyle = P.bg; ctx.fillRect(0,0,SIZE,SIZE);

  // Minimal head — perfectly symmetric
  ctx.fillStyle = P.skin;
  ctx.fillRect(10,7,12,15); ctx.fillRect(9,8,14,13); ctx.fillRect(8,10,16,10);

  // Zen circle on forehead
  ctx.fillStyle = P.secondary;
  ctx.fillRect(14,7,4,1); ctx.fillRect(13,8,1,1); ctx.fillRect(18,8,1,1);
  ctx.fillRect(13,9,1,1); ctx.fillRect(18,9,1,1);
  ctx.fillRect(14,10,4,1);

  // Eyes — half closed, peaceful
  ctx.fillStyle = P.primary;
  ctx.fillRect(11,14,4,1); ctx.fillRect(17,14,4,1);
  // Thin line above (lids)
  ctx.fillStyle = P.secondary;
  ctx.fillRect(11,13,4,1); ctx.fillRect(17,13,4,1);

  // Serene smile
  ctx.fillStyle = P.secondary;
  ctx.fillRect(14,19,4,1); ctx.fillRect(13,18,1,1); ctx.fillRect(18,18,1,1);

  // Clean bracket motifs { }
  ctx.fillStyle = P.secondary; ctx.globalAlpha = 0.3;
  ctx.fillRect(4,10,1,1); ctx.fillRect(3,11,1,3); ctx.fillRect(4,14,1,1);
  ctx.fillRect(27,10,1,1); ctx.fillRect(28,11,1,3); ctx.fillRect(27,14,1,1);
  ctx.globalAlpha = 1;

  return P;
}

// ============================================================
// 10. BLITZ — Speed obsessed, yellow+black, lightning
// ============================================================
function drawBlitz(ctx) {
  const P = { bg:'#0a0a00', primary:'#ffdd00', primaryLight:'#ffee44', secondary:'#ff8800', skin:'#2a2a10', skinLight:'#3a3a20', skinDark:'#1a1a05', accent:'#ffdd00', glitch1:'#ffff00', glitch2:'#ff0044' };

  ctx.fillStyle = P.bg; ctx.fillRect(0,0,SIZE,SIZE);

  // Speed lines in bg
  ctx.fillStyle = P.primary; ctx.globalAlpha = 0.1;
  for (let i = 0; i < 5; i++) ctx.fillRect(0, 4+i*5, SIZE, 1);
  ctx.globalAlpha = 1;

  // Head — sleek, aerodynamic
  ctx.fillStyle = P.skin;
  ctx.fillRect(10,7,12,15); ctx.fillRect(9,8,14,13); ctx.fillRect(8,10,16,10);
  // Pointed features
  ctx.fillStyle = P.skinDark;
  ctx.fillRect(22,10,2,4);

  // Eyes — intense, wide
  ctx.fillStyle = P.primary;
  ctx.fillRect(11,12,4,3); ctx.fillRect(17,12,4,3);
  ctx.fillStyle = '#000'; ctx.fillRect(13,13,1,1); ctx.fillRect(19,13,1,1);
  ctx.fillStyle = '#fff'; ctx.fillRect(11,12,1,1); ctx.fillRect(17,12,1,1);

  // Determined grin
  ctx.fillStyle = P.primary;
  ctx.fillRect(13,19,6,1); ctx.fillRect(12,18,1,1); ctx.fillRect(19,18,1,1);

  // Lightning bolt on head
  ctx.fillStyle = P.primary;
  ctx.fillRect(15,4,2,1); ctx.fillRect(14,5,2,1); ctx.fillRect(13,6,3,1);
  ctx.fillRect(14,7,2,1); ctx.fillRect(15,8,2,1);

  // Speedometer arc
  ctx.fillStyle = P.secondary; ctx.globalAlpha = 0.4;
  ctx.fillRect(3,6,1,1); ctx.fillRect(4,5,1,1); ctx.fillRect(5,4,1,1); ctx.fillRect(6,5,1,1); ctx.fillRect(7,6,1,1);
  // Needle
  ctx.fillStyle = P.primary;
  ctx.fillRect(5,5,1,2);
  ctx.globalAlpha = 1;

  return P;
}

// ============================================================
// GENERATE ALL
// ============================================================
const agents = [
  { name: 'syntax', draw: drawSyntax, seed: 101 },
  { name: 'forge', draw: drawForge, seed: 202 },
  { name: 'pixel', draw: drawPixel, seed: 303 },
  { name: 'ghost', draw: drawGhost, seed: 404 },
  { name: 'pipeline', draw: drawPipeline, seed: 505 },
  { name: 'atlas', draw: drawAtlas, seed: 606 },
  { name: 'kernel', draw: drawKernel, seed: 707 },
  { name: 'scout', draw: drawScout, seed: 808 },
  { name: 'refactor', draw: drawRefactor, seed: 909 },
  { name: 'blitz', draw: drawBlitz, seed: 1010 },
];

agents.forEach(({ name, draw, seed }) => {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rng = rngFactory(seed);

  const P = draw(ctx, rng);
  extremeAbstract(ctx, rng, P);

  const out = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const oc = out.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const fn = `test-${name}.png`;
  fs.writeFileSync(path.join(outputDir, fn), out.toBuffer('image/png'));
  console.log(`Generated: ${fn}`);
});
