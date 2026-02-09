#!/usr/bin/env node
/**
 * AUTO-PFP GENERATOR
 * Takes agent name + ID + description → generates unique PFP
 * Deterministic: same inputs = same output
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

// ============================================================
// SEEDED RNG
// ============================================================
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function rngFactory(seed) {
  let s = seed || 1;
  if (s <= 0) s = 1;
  s = s % 2147483647 || 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// ============================================================
// PALETTE EXTRACTION FROM DESCRIPTION
// ============================================================
const PALETTE_KEYWORDS = {
  // Colors
  red:     { primary: '#ff2222', accent: '#ff5555', glitch1: '#ff0000', glitch2: '#00ffff' },
  orange:  { primary: '#ff8800', accent: '#ffaa44', glitch1: '#ffaa00', glitch2: '#0088ff' },
  yellow:  { primary: '#ffdd00', accent: '#ffee44', glitch1: '#ffff00', glitch2: '#ff0044' },
  green:   { primary: '#00ff41', accent: '#33ff77', glitch1: '#00ffaa', glitch2: '#ff00ff' },
  blue:    { primary: '#4488ff', accent: '#66aaff', glitch1: '#00ccff', glitch2: '#ff44ff' },
  purple:  { primary: '#aa44ff', accent: '#cc66ff', glitch1: '#ff00ff', glitch2: '#00ffff' },
  pink:    { primary: '#ff44aa', accent: '#ff88cc', glitch1: '#ff44aa', glitch2: '#44aaff' },
  cyan:    { primary: '#00eeff', accent: '#44ffff', glitch1: '#00ffff', glitch2: '#ff00ff' },
  white:   { primary: '#ffffff', accent: '#cccccc', glitch1: '#aaaaaa', glitch2: '#ff44ff' },
  gold:    { primary: '#ffd700', accent: '#ffed4a', glitch1: '#ffaa00', glitch2: '#00aaff' },
  silver:  { primary: '#aabbcc', accent: '#ccddee', glitch1: '#88aacc', glitch2: '#ff44ff' },
  // Vibes
  dark:    { primary: '#666666', accent: '#888888', glitch1: '#444444', glitch2: '#ff0044' },
  fire:    { primary: '#ff4400', accent: '#ff8800', glitch1: '#ffaa00', glitch2: '#00aaff' },
  ice:     { primary: '#88ddff', accent: '#aaeeff', glitch1: '#00ccff', glitch2: '#ff4488' },
  electric:{ primary: '#ffdd00', accent: '#00eeff', glitch1: '#ffff00', glitch2: '#ff0088' },
  shadow:  { primary: '#444466', accent: '#666688', glitch1: '#4444aa', glitch2: '#ff4444' },
  neon:    { primary: '#00ff88', accent: '#ff00ff', glitch1: '#00ffff', glitch2: '#ff0088' },
  nature:  { primary: '#44bb44', accent: '#88dd44', glitch1: '#00ff44', glitch2: '#ff8800' },
  terminal:{ primary: '#00ff41', accent: '#33ff77', glitch1: '#00ffaa', glitch2: '#ff00ff' },
  crypto:  { primary: '#f7931a', accent: '#ffaa44', glitch1: '#ff8800', glitch2: '#4488ff' },
  hacker:  { primary: '#00ff41', accent: '#00cc33', glitch1: '#00ff00', glitch2: '#ff0044' },
  music:   { primary: '#ff44aa', accent: '#aa44ff', glitch1: '#ff00ff', glitch2: '#00ffff' },
  chaos:   { primary: '#ff0044', accent: '#ff8800', glitch1: '#ff00ff', glitch2: '#00ffff' },
  calm:    { primary: '#88aacc', accent: '#aaccdd', glitch1: '#6688aa', glitch2: '#ffaa88' },
  speed:   { primary: '#ffdd00', accent: '#ff8800', glitch1: '#ffff00', glitch2: '#ff0044' },
  stealth: { primary: '#334455', accent: '#556677', glitch1: '#224466', glitch2: '#ff2244' },
  military:{ primary: '#556b2f', accent: '#8fbc8f', glitch1: '#44ff44', glitch2: '#ff4400' },
  royal:   { primary: '#8844cc', accent: '#aa66ee', glitch1: '#cc44ff', glitch2: '#ffaa00' },
  rust:    { primary: '#ff6633', accent: '#cc4411', glitch1: '#ff4400', glitch2: '#00aaff' },
  ocean:   { primary: '#0066cc', accent: '#44aaff', glitch1: '#0088ff', glitch2: '#ff4488' },
};

// Feature keywords → head accessories
const ACCESSORY_KEYWORDS = {
  hat:      'hat',
  hood:     'hood',
  helmet:   'helmet',
  crown:    'crown',
  goggles:  'goggles',
  visor:    'visor',
  glasses:  'glasses',
  horns:    'horns',
  antenna:  'antenna',
  halo:     'halo',
  mask:     'mask',
  wizard:   'wizard',
  detective:'detective',
  hard:     'hardhat', // hard hat
  crab:     'crab',
  snake:    'snake',
  gopher:   'gopher',
};

// Eye style keywords
const EYE_KEYWORDS = {
  glow:     'glow',
  intense:  'intense',
  calm:     'calm',
  friendly: 'friendly',
  mischiev: 'mischievous',
  searching:'searching',
  wise:     'wise',
  angry:    'angry',
  alert:    'alert',
  mysterious:'mysterious',
  paranoid: 'paranoid',
  zen:      'zen',
  closed:   'closed',
  one:      'cyclops',
};

function extractFromDescription(name, id, desc) {
  const text = `${name} ${desc}`.toLowerCase();
  
  // Find palette
  let palette = null;
  for (const [kw, pal] of Object.entries(PALETTE_KEYWORDS)) {
    if (text.includes(kw)) { palette = pal; break; }
  }
  
  // Find accessory
  let accessory = null;
  for (const [kw, acc] of Object.entries(ACCESSORY_KEYWORDS)) {
    if (text.includes(kw)) { accessory = acc; break; }
  }
  
  // Find eye style
  let eyeStyle = 'default';
  for (const [kw, style] of Object.entries(EYE_KEYWORDS)) {
    if (text.includes(kw)) { eyeStyle = style; break; }
  }
  
  return { palette, accessory, eyeStyle };
}

// ============================================================
// DEFAULT PALETTE FROM HASH
// ============================================================
function defaultPalette(rng) {
  // Generate a random hue-based palette
  const hue = Math.floor(rng() * 360);
  const h2 = (hue + 180) % 360;
  return {
    primary: hslToHex(hue, 80, 55),
    accent: hslToHex(hue, 70, 70),
    glitch1: hslToHex((hue + 120) % 360, 100, 50),
    glitch2: hslToHex((hue + 240) % 360, 100, 50),
  };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ============================================================
// HEAD SHAPES
// ============================================================
function drawHead(ctx, rng, skinColor, skinLight, skinDark, shape) {
  const shapes = ['round', 'square', 'tall', 'wide', 'angular'];
  const s = shapes[shape % shapes.length];
  
  ctx.fillStyle = skinColor;
  
  if (s === 'round') {
    ctx.fillRect(10,7,12,15); ctx.fillRect(9,8,14,13); ctx.fillRect(8,9,16,11); ctx.fillRect(11,6,10,1);
  } else if (s === 'square') {
    ctx.fillRect(9,7,14,15); ctx.fillRect(8,8,16,13);
  } else if (s === 'tall') {
    ctx.fillRect(10,5,12,17); ctx.fillRect(9,6,14,15); ctx.fillRect(8,8,16,11);
  } else if (s === 'wide') {
    ctx.fillRect(8,8,16,14); ctx.fillRect(7,9,18,12); ctx.fillRect(9,7,14,1);
  } else { // angular
    ctx.fillRect(10,6,12,16); ctx.fillRect(9,7,14,14); ctx.fillRect(8,9,16,10);
    ctx.fillStyle = skinDark; ctx.fillRect(22,9,2,5);
  }
  
  // Light side
  ctx.fillStyle = skinLight;
  ctx.fillRect(9,9,3,11);
  
  // Dark side
  ctx.fillStyle = skinDark;
  ctx.fillRect(20,9,3,11);
}

// ============================================================
// EYE STYLES
// ============================================================
function drawEyes(ctx, rng, primary, white, eyeStyle) {
  const style = eyeStyle || 'default';
  
  if (style === 'glow' || style === 'intense') {
    // Wide glowing eyes
    ctx.fillStyle = primary;
    ctx.fillRect(10,13,5,2); ctx.fillRect(17,13,5,2);
    ctx.fillStyle = white; ctx.fillRect(12,13,1,1); ctx.fillRect(19,13,1,1);
    // Glow aura
    ctx.fillStyle = primary; ctx.globalAlpha = 0.2;
    ctx.fillRect(9,12,7,4); ctx.fillRect(16,12,7,4);
    ctx.globalAlpha = 1;
  } else if (style === 'friendly') {
    ctx.fillStyle = primary;
    ctx.fillRect(11,13,3,3); ctx.fillRect(18,13,3,3);
    ctx.fillStyle = '#000'; ctx.fillRect(12,14,1,1); ctx.fillRect(19,14,1,1);
    ctx.fillStyle = white; ctx.fillRect(11,13,1,1); ctx.fillRect(18,13,1,1);
  } else if (style === 'calm' || style === 'zen' || style === 'closed') {
    // Half-closed
    ctx.fillStyle = primary;
    ctx.fillRect(11,14,4,1); ctx.fillRect(17,14,4,1);
    ctx.fillStyle = `${primary}88`;
    ctx.fillRect(11,13,4,1); ctx.fillRect(17,13,4,1);
  } else if (style === 'mischievous') {
    ctx.fillStyle = primary;
    ctx.fillRect(11,13,3,2); ctx.fillRect(18,13,3,2);
    ctx.fillStyle = white; ctx.fillRect(13,13,1,1); ctx.fillRect(20,13,1,1);
    // Raised brow
    ctx.fillStyle = primary; ctx.globalAlpha = 0.4;
    ctx.fillRect(18,11,3,1);
    ctx.globalAlpha = 1;
  } else if (style === 'searching' || style === 'alert') {
    ctx.fillStyle = white;
    ctx.fillRect(11,13,3,3); ctx.fillRect(18,13,3,3);
    ctx.fillStyle = '#000'; ctx.fillRect(12,14,1,1); ctx.fillRect(19,14,1,1);
    ctx.fillStyle = primary; ctx.fillRect(11,11,3,1); ctx.fillRect(18,11,3,1);
  } else if (style === 'wise') {
    ctx.fillStyle = primary;
    ctx.fillRect(10,13,4,3); ctx.fillRect(18,13,4,3);
    ctx.fillStyle = white; ctx.fillRect(11,14,2,1); ctx.fillRect(19,14,2,1);
  } else if (style === 'mysterious' || style === 'paranoid') {
    ctx.fillStyle = primary;
    ctx.fillRect(12,13,3,2); ctx.fillRect(17,13,3,2);
    ctx.fillStyle = primary; ctx.globalAlpha = 0.15;
    ctx.fillRect(11,12,5,4); ctx.fillRect(16,12,5,4);
    ctx.globalAlpha = 1;
  } else if (style === 'cyclops') {
    ctx.fillStyle = primary;
    ctx.fillRect(13,12,6,4);
    ctx.fillStyle = white; ctx.fillRect(15,13,2,2);
    ctx.fillStyle = '#000'; ctx.fillRect(16,13,1,1);
  } else {
    // Default
    ctx.fillStyle = primary;
    ctx.fillRect(11,13,3,2); ctx.fillRect(18,13,3,2);
    ctx.fillStyle = '#000'; ctx.fillRect(12,13,1,1); ctx.fillRect(19,13,1,1);
    ctx.fillStyle = white; ctx.fillRect(11,13,1,1); ctx.fillRect(18,13,1,1);
  }
}

// ============================================================
// MOUTHS
// ============================================================
function drawMouth(ctx, rng, primary, mouthType) {
  const types = ['neutral', 'smile', 'grin', 'serious', 'small', 'open'];
  const t = types[mouthType % types.length];
  
  ctx.fillStyle = primary;
  if (t === 'neutral') {
    ctx.fillRect(14,19,4,1);
  } else if (t === 'smile') {
    ctx.fillRect(13,19,1,1); ctx.fillRect(14,20,4,1); ctx.fillRect(18,19,1,1);
  } else if (t === 'grin') {
    ctx.fillRect(12,18,1,1); ctx.fillRect(13,19,6,1); ctx.fillRect(19,18,1,1);
    ctx.fillStyle = '#fff'; ctx.fillRect(14,19,1,1); ctx.fillRect(17,19,1,1);
  } else if (t === 'serious') {
    ctx.fillRect(14,19,4,1);
    ctx.fillStyle = primary; ctx.globalAlpha = 0.3;
    ctx.fillRect(13,20,6,1);
    ctx.globalAlpha = 1;
  } else if (t === 'small') {
    ctx.fillRect(15,19,2,1);
  } else { // open
    ctx.fillStyle = '#000'; ctx.fillRect(14,19,4,2);
    ctx.fillStyle = primary; ctx.fillRect(14,19,4,1);
  }
}

// ============================================================
// ACCESSORIES
// ============================================================
function drawAccessory(ctx, rng, primary, accent, accessory) {
  if (!accessory) return;
  
  if (accessory === 'goggles') {
    ctx.fillStyle = '#111';
    ctx.fillRect(9,11,6,4); ctx.fillRect(17,11,6,4);
    ctx.fillStyle = accent;
    ctx.fillRect(10,12,4,2); ctx.fillRect(18,12,4,2);
    ctx.fillStyle = primary; ctx.fillRect(15,12,2,1); // bridge
  } else if (accessory === 'hood') {
    ctx.fillStyle = '#111115';
    ctx.fillRect(7,4,18,4); ctx.fillRect(6,6,20,3); ctx.fillRect(5,8,22,2);
  } else if (accessory === 'hat') {
    ctx.fillStyle = primary;
    ctx.fillRect(9,4,14,3); ctx.fillRect(11,2,10,2);
  } else if (accessory === 'hardhat') {
    ctx.fillStyle = primary;
    ctx.fillRect(9,4,14,3); ctx.fillRect(10,3,12,1);
    ctx.fillStyle = accent; ctx.fillRect(10,4,12,1);
  } else if (accessory === 'crown') {
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(10,4,12,2); ctx.fillRect(11,2,2,2); ctx.fillRect(15,2,2,2); ctx.fillRect(19,2,2,2);
  } else if (accessory === 'visor') {
    ctx.fillStyle = accent; ctx.globalAlpha = 0.6;
    ctx.fillRect(9,12,14,3);
    ctx.globalAlpha = 1;
  } else if (accessory === 'glasses') {
    ctx.fillStyle = '#222';
    ctx.fillRect(10,12,5,3); ctx.fillRect(17,12,5,3);
    ctx.fillStyle = accent; ctx.globalAlpha = 0.3;
    ctx.fillRect(11,13,3,1); ctx.fillRect(18,13,3,1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#222'; ctx.fillRect(15,13,2,1);
  } else if (accessory === 'antenna') {
    ctx.fillStyle = primary;
    ctx.fillRect(15,2,2,4); ctx.fillRect(14,2,4,1);
  } else if (accessory === 'halo') {
    ctx.fillStyle = '#ffd700'; ctx.globalAlpha = 0.5;
    ctx.fillRect(10,3,12,1); ctx.fillRect(9,4,1,1); ctx.fillRect(22,4,1,1);
    ctx.globalAlpha = 1;
  } else if (accessory === 'wizard') {
    ctx.fillStyle = primary;
    ctx.fillRect(10,4,12,2); ctx.fillRect(12,2,8,2); ctx.fillRect(14,0,4,2); ctx.fillRect(15,-1,2,1);
    ctx.fillStyle = accent; ctx.fillRect(15,1,2,1);
  } else if (accessory === 'detective') {
    ctx.fillStyle = '#554433';
    ctx.fillRect(8,4,16,2); ctx.fillRect(10,2,12,2);
  } else if (accessory === 'helmet') {
    ctx.fillStyle = '#333';
    ctx.fillRect(8,4,16,5); ctx.fillRect(9,3,14,1);
    ctx.fillStyle = accent; ctx.fillRect(9,7,14,1);
  } else if (accessory === 'mask') {
    ctx.fillStyle = '#111';
    ctx.fillRect(9,15,14,6);
  } else if (accessory === 'crab') {
    // Crab claws on sides
    ctx.fillStyle = primary;
    ctx.fillRect(5,8,3,2); ctx.fillRect(4,9,2,3); ctx.fillRect(6,9,2,3);
    ctx.fillRect(24,8,3,2); ctx.fillRect(24,9,2,3); ctx.fillRect(26,9,2,3);
  } else if (accessory === 'snake') {
    // Snake pattern on head
    ctx.fillStyle = primary; ctx.globalAlpha = 0.3;
    for (let i = 0; i < 6; i++) ctx.fillRect(10+i*2, 7+(i%2), 2, 1);
    ctx.globalAlpha = 1;
  } else if (accessory === 'gopher') {
    // Ears
    ctx.fillStyle = primary;
    ctx.fillRect(8,5,3,3); ctx.fillRect(21,5,3,3);
  }
}

// ============================================================
// BACKGROUND MOTIFS
// ============================================================
function drawBgMotif(ctx, rng, primary, accent, desc) {
  const text = desc.toLowerCase();
  
  ctx.globalAlpha = 0.15;
  
  if (text.includes('terminal') || text.includes('command') || text.includes('shell')) {
    ctx.fillStyle = primary;
    ctx.fillRect(2,4,8,1); ctx.fillRect(3,6,6,1); ctx.fillRect(1,8,7,1);
    ctx.fillRect(24,5,6,1); ctx.fillRect(25,7,5,1);
  } else if (text.includes('circuit') || text.includes('hardware') || text.includes('chip')) {
    ctx.fillStyle = accent;
    ctx.fillRect(2,6,6,1); ctx.fillRect(8,6,1,4);
    ctx.fillRect(24,8,6,1); ctx.fillRect(24,8,1,6);
    ctx.fillRect(2,5,2,2); ctx.fillRect(28,7,2,2);
  } else if (text.includes('cloud') || text.includes('server')) {
    ctx.fillStyle = accent;
    ctx.fillRect(2,3,5,2); ctx.fillRect(1,4,7,2); ctx.fillRect(3,2,3,1);
    ctx.fillRect(24,5,5,2); ctx.fillRect(23,6,7,2);
  } else if (text.includes('grid') || text.includes('blueprint') || text.includes('design')) {
    ctx.fillStyle = accent;
    for (let i = 0; i < SIZE; i += 4) { ctx.fillRect(i,0,1,SIZE); ctx.fillRect(0,i,SIZE,1); }
  } else if (text.includes('math') || text.includes('neural') || text.includes('data')) {
    ctx.fillStyle = accent;
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(rng()*SIZE), y = Math.floor(rng()*SIZE);
      ctx.fillRect(x,y,1,1);
      if (rng() > 0.5) ctx.fillRect(x+1,y+1,1,1);
    }
  } else if (text.includes('pipe') || text.includes('flow') || text.includes('stream')) {
    ctx.fillStyle = accent;
    ctx.fillRect(0,10,8,2); ctx.fillRect(24,14,8,2);
    ctx.fillRect(2,10,2,8); ctx.fillRect(26,8,2,8);
  } else if (text.includes('lock') || text.includes('key') || text.includes('secur')) {
    ctx.fillStyle = accent;
    ctx.fillRect(3,4,3,2); ctx.fillRect(2,6,5,3); ctx.fillRect(4,5,1,1);
  } else if (text.includes('clock') || text.includes('time') || text.includes('schedul')) {
    ctx.fillStyle = accent;
    ctx.fillRect(3,3,4,1); ctx.fillRect(2,4,1,3); ctx.fillRect(7,4,1,3);
    ctx.fillRect(3,7,4,1); ctx.fillRect(5,4,1,3);
  } else {
    // Generic floating dots
    ctx.fillStyle = primary;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(Math.floor(rng()*10), Math.floor(rng()*SIZE), Math.floor(rng()*4)+2, 1);
      ctx.fillRect(22+Math.floor(rng()*10), Math.floor(rng()*SIZE), Math.floor(rng()*4)+2, 1);
    }
  }
  
  ctx.globalAlpha = 1;
}

// ============================================================
// V3 HEAVY GLITCH PASS
// ============================================================
function glitchPass(ctx, rng, P) {
  // Scanlines
  for (let y = 0; y < SIZE; y++) {
    if (y % 2 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, y, SIZE, 1); }
  }

  const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = imgData.data;
  const orig = new Uint8ClampedArray(d);

  // Heavy displacement (50%)
  for (let y = 0; y < SIZE; y++) {
    if (rng() < 0.50) {
      const shift = (rng() > 0.5 ? 1 : -1) * (1 + Math.floor(rng() * 4));
      for (let x = 0; x < SIZE; x++) {
        const srcX = ((x - shift) + SIZE) % SIZE;
        const di = (y * SIZE + x) * 4, si = (y * SIZE + srcX) * 4;
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
        const di = (y * SIZE + x) * 4, si = (srcY * SIZE + x) * 4;
        d[di]=copy3[si]; d[di+1]=copy3[si+1]; d[di+2]=copy3[si+2]; d[di+3]=copy3[si+3];
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Glitch blocks
  const colors = [P.glitch1, P.glitch2, P.primary, P.accent];
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.globalAlpha = 0.1 + rng() * 0.2;
    ctx.fillRect(Math.floor(rng()*SIZE), Math.floor(rng()*SIZE), 1+Math.floor(rng()*5), 1);
    ctx.globalAlpha = 1;
  }

  // Static
  for (let i = 0; i < 35; i++) {
    ctx.fillStyle = rng() > 0.5 ? '#fff' : '#222';
    ctx.globalAlpha = 0.08 + rng() * 0.2;
    ctx.fillRect(Math.floor(rng()*SIZE), Math.floor(rng()*SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Corruption bars
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.globalAlpha = 0.12;
    ctx.fillRect(0, Math.floor(rng()*SIZE), SIZE, 1);
    ctx.globalAlpha = 1;
  }

  // Sparks
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = [P.primary, P.accent, '#fff'][Math.floor(rng()*3)];
    ctx.globalAlpha = 0.3 + rng() * 0.5;
    ctx.fillRect(Math.floor(rng()*SIZE), Math.floor(rng()*SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Drips
  for (let i = 0; i < 4; i++) {
    const x = 9 + Math.floor(rng() * 14);
    const len = 2 + Math.floor(rng() * 5);
    ctx.fillStyle = colors[Math.floor(rng()*colors.length)];
    ctx.globalAlpha = 0.35;
    for (let dy = 0; dy < len && 22+dy < SIZE; dy++) ctx.fillRect(x, 22+dy, 1, 1);
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// MAIN GENERATOR
// ============================================================
function generatePFP(name, id, description) {
  const seed = hashStr(`${name}#${id}#${description}`);
  const rng = rngFactory(seed);
  
  const { palette: kwPalette, accessory, eyeStyle } = extractFromDescription(name, id, description);
  const palette = kwPalette || defaultPalette(rng);
  
  // Derive skin tones from palette hue
  const skinBase = Math.floor(rng() * 3); // 0=dark, 1=medium, 2=tinted
  let skinColor, skinLight, skinDark;
  if (skinBase === 0) {
    skinColor = '#1a1a1a'; skinLight = '#2a2a2a'; skinDark = '#0a0a0a';
  } else if (skinBase === 1) {
    skinColor = '#2a2a2a'; skinLight = '#3a3a3a'; skinDark = '#1a1a1a';
  } else {
    // Tinted with palette
    skinColor = '#2a2a30'; skinLight = '#3a3a40'; skinDark = '#1a1a20';
  }
  
  const headShape = Math.floor(rng() * 5);
  const mouthType = Math.floor(rng() * 6);
  
  const P = {
    bg: '#050505',
    primary: palette.primary,
    accent: palette.accent,
    glitch1: palette.glitch1,
    glitch2: palette.glitch2,
  };
  
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  
  // Background
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  
  // Background motif
  drawBgMotif(ctx, rng, P.primary, P.accent, description);
  
  // Head
  drawHead(ctx, rng, skinColor, skinLight, skinDark, headShape);
  
  // Accessory (before eyes if hood/helmet, after if hat/crown)
  if (accessory === 'hood' || accessory === 'helmet' || accessory === 'mask') {
    drawAccessory(ctx, rng, P.primary, P.accent, accessory);
  }
  
  // Eyes
  drawEyes(ctx, rng, P.primary, '#ffffff', eyeStyle);
  
  // Mouth
  drawMouth(ctx, rng, P.primary, mouthType);
  
  // Accessory (after face)
  if (accessory && accessory !== 'hood' && accessory !== 'helmet' && accessory !== 'mask') {
    drawAccessory(ctx, rng, P.primary, P.accent, accessory);
  }
  
  // Glitch pass
  const glitchRng = rngFactory(seed + 7777);
  glitchPass(ctx, glitchRng, P);
  
  // Upscale
  const out = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const oc = out.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  
  return out.toBuffer('image/png');
}

// ============================================================
// CLI MODE
// ============================================================
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('Usage: node auto-pfp.js <name> <id> <description> [output-path]');
    process.exit(1);
  }
  
  const name = args[0];
  const id = parseInt(args[1]);
  const description = args[2];
  const outputPath = args[3] || path.join(__dirname, 'output', `auto-${name.toLowerCase().replace(/\s+/g, '-')}.png`);
  
  const buffer = generatePFP(name, id, description);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath}`);
}

module.exports = { generatePFP };
