// @ts-nocheck
/**
 * AUTO-PFP GENERATOR v2 — MORE VARIETY
 * Takes agent name + ID + description → generates unique PFP
 * Deterministic: same inputs = same output
 */
const { createCanvas } = require('canvas');

const SIZE = 32;
const OUTPUT_SIZE = 512;

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

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return {r,g,b};
}

// ============================================================
// PALETTE SYSTEM — much more diverse
// ============================================================
const PALETTES = [
  // Warm
  { primary: '#ff4444', accent: '#ff8866', bg: '#1a0505', skin: '#cc3333', glitch1: '#ff0000', glitch2: '#00ffff' },
  { primary: '#ff8800', accent: '#ffbb44', bg: '#1a0e00', skin: '#cc6600', glitch1: '#ffaa00', glitch2: '#0088ff' },
  { primary: '#ffdd00', accent: '#ffee66', bg: '#1a1800', skin: '#ccaa00', glitch1: '#ffff00', glitch2: '#ff00aa' },
  // Cool
  { primary: '#4488ff', accent: '#77bbff', bg: '#000a1a', skin: '#3366cc', glitch1: '#00ccff', glitch2: '#ff44ff' },
  { primary: '#00eeff', accent: '#66ffff', bg: '#001a1a', skin: '#00aacc', glitch1: '#00ffff', glitch2: '#ff0088' },
  { primary: '#aa44ff', accent: '#cc88ff', bg: '#0a001a', skin: '#8833cc', glitch1: '#ff00ff', glitch2: '#00ff88' },
  // Nature
  { primary: '#00ff41', accent: '#66ff88', bg: '#001a08', skin: '#00cc33', glitch1: '#00ffaa', glitch2: '#ff4400' },
  { primary: '#88cc44', accent: '#aaee66', bg: '#0a1a00', skin: '#669933', glitch1: '#aaff00', glitch2: '#ff0088' },
  // Mono
  { primary: '#ffffff', accent: '#aaaaaa', bg: '#050505', skin: '#888888', glitch1: '#ffffff', glitch2: '#ff0044' },
  { primary: '#ff0044', accent: '#ff4488', bg: '#0a0008', skin: '#cc0033', glitch1: '#ff0066', glitch2: '#00ffaa' },
  // Neon
  { primary: '#ff00ff', accent: '#ff88ff', bg: '#0a000a', skin: '#cc00cc', glitch1: '#ff44ff', glitch2: '#00ff44' },
  { primary: '#00ff88', accent: '#88ffbb', bg: '#000a05', skin: '#00cc66', glitch1: '#00ffcc', glitch2: '#ff0044' },
  // Earth
  { primary: '#cc8844', accent: '#eebb88', bg: '#0e0800', skin: '#996633', glitch1: '#ffaa44', glitch2: '#4488ff' },
  { primary: '#887766', accent: '#bbaa99', bg: '#0a0808', skin: '#665544', glitch1: '#ccbb99', glitch2: '#ff4466' },
  // Ice/Snow
  { primary: '#88ccff', accent: '#bbddff', bg: '#020810', skin: '#5599cc', glitch1: '#aaeeff', glitch2: '#ff4488' },
  // Blood/Dark
  { primary: '#cc0000', accent: '#880000', bg: '#0a0000', skin: '#990000', glitch1: '#ff0000', glitch2: '#00ff44' },
];

const PALETTE_KEYWORDS = {
  red: 0, fire: 0, orange: 1, yellow: 2, gold: 2,
  blue: 3, ocean: 3, cyan: 4, ice: 14, purple: 5, royal: 5,
  green: 6, nature: 7, terminal: 6, hacker: 6,
  white: 8, mono: 8, pink: 9, neon: 10, electric: 11,
  earth: 12, rust: 12, stealth: 13, military: 13, shadow: 13,
  blood: 15, dark: 15, chaos: 9, crypto: 1, music: 10,
};

// ============================================================
// CHARACTER ARCHETYPES — different body structures
// ============================================================
const ARCHETYPES = [
  'humanoid',    // standard head + shoulders
  'bot',         // rectangular/boxy robot
  'orb',         // floating sphere/circle
  'beast',       // wider, animalistic
  'slim',        // tall and thin
  'heavy',       // stocky, wide shoulders
  'fragment',    // broken/scattered pieces
  'geometric',   // made of shapes
  'minimal',     // tiny figure, lots of negative space
  'wisp',        // scattered pixels, barely there
  'monolith',    // tall narrow slab
];

function drawCharacter(ctx, rng, P, archetype) {
  const a = archetype;
  
  if (a === 'humanoid') {
    // Head
    ctx.fillStyle = P.skin;
    ctx.fillRect(11,7,10,12); ctx.fillRect(10,8,12,10);
    // Shoulders
    ctx.fillRect(7,20,18,6); ctx.fillRect(8,19,16,1);
    // Neck
    ctx.fillRect(14,19,4,2);
    // Shade
    ctx.fillStyle = P.skinDark;
    ctx.fillRect(20,8,2,10); ctx.fillRect(7,22,3,4); 
    ctx.fillStyle = P.skinLight;
    ctx.fillRect(10,8,2,10); ctx.fillRect(22,22,3,4);
    
  } else if (a === 'bot') {
    // Boxy head
    ctx.fillStyle = P.skin;
    ctx.fillRect(9,6,14,14);
    // Antenna
    ctx.fillStyle = P.primary;
    ctx.fillRect(15,3,2,3); ctx.fillRect(14,3,4,1);
    // Body
    ctx.fillStyle = P.skin;
    ctx.fillRect(10,21,12,8);
    // Panel lines
    ctx.fillStyle = P.primary; ctx.globalAlpha = 0.3;
    ctx.fillRect(9,12,14,1); ctx.fillRect(9,16,14,1);
    ctx.globalAlpha = 1;
    // Shade
    ctx.fillStyle = P.skinDark;
    ctx.fillRect(21,6,2,14); ctx.fillRect(20,21,2,8);
    
  } else if (a === 'orb') {
    // Floating sphere
    ctx.fillStyle = P.skin;
    ctx.fillRect(10,6,12,14); ctx.fillRect(9,7,14,12); ctx.fillRect(8,9,16,8);
    // Glow underneath
    ctx.fillStyle = P.primary; ctx.globalAlpha = 0.15;
    ctx.fillRect(11,22,10,4); ctx.fillRect(13,26,6,2);
    ctx.globalAlpha = 1;
    // Highlight
    ctx.fillStyle = P.skinLight;
    ctx.fillRect(10,7,4,3);
    ctx.fillStyle = P.skinDark;
    ctx.fillRect(18,14,4,5);
    
  } else if (a === 'beast') {
    // Wide head
    ctx.fillStyle = P.skin;
    ctx.fillRect(7,8,18,12); ctx.fillRect(6,9,20,10);
    // Ears/horns
    ctx.fillStyle = P.primary;
    ctx.fillRect(7,5,3,4); ctx.fillRect(22,5,3,4);
    // Shoulders
    ctx.fillRect(4,20,24,8); ctx.fillRect(5,19,22,1);
    ctx.fillStyle = P.skinDark;
    ctx.fillRect(22,9,4,10); ctx.fillRect(24,20,4,8);
    ctx.fillStyle = P.skinLight;
    ctx.fillRect(6,9,3,10);
    
  } else if (a === 'slim') {
    // Tall narrow head
    ctx.fillStyle = P.skin;
    ctx.fillRect(12,4,8,16); ctx.fillRect(11,5,10,14);
    // Thin body
    ctx.fillRect(13,21,6,8); ctx.fillRect(12,20,8,1);
    ctx.fillStyle = P.skinDark;
    ctx.fillRect(19,5,2,14);
    ctx.fillStyle = P.skinLight;
    ctx.fillRect(11,5,2,14);
    
  } else if (a === 'heavy') {
    // Wide stocky
    ctx.fillStyle = P.skin;
    ctx.fillRect(9,8,14,12); ctx.fillRect(8,9,16,10);
    // Big shoulders
    ctx.fillRect(5,18,22,10); ctx.fillRect(4,20,24,8);
    // Neck
    ctx.fillRect(12,18,8,3);
    ctx.fillStyle = P.skinDark;
    ctx.fillRect(22,9,2,9); ctx.fillRect(24,20,4,8);
    ctx.fillStyle = P.skinLight;
    ctx.fillRect(8,9,2,9); ctx.fillRect(4,20,3,8);
    
  } else if (a === 'fragment') {
    // Broken pieces
    ctx.fillStyle = P.skin;
    ctx.fillRect(11,6,8,8); ctx.fillRect(14,3,4,3); // top piece
    ctx.fillRect(9,15,6,5); ctx.fillRect(17,14,7,6); // split face
    ctx.fillRect(10,22,5,6); ctx.fillRect(18,23,5,5); // body fragments
    // Gap glow
    ctx.fillStyle = P.primary; ctx.globalAlpha = 0.3;
    ctx.fillRect(15,14,2,6); ctx.fillRect(15,22,3,6);
    ctx.globalAlpha = 1;
    
  } else if (a === 'geometric') {
    // Diamond/triangle head
    ctx.fillStyle = P.skin;
    ctx.fillRect(14,4,4,2); ctx.fillRect(12,6,8,2); ctx.fillRect(10,8,12,4);
    ctx.fillRect(8,12,16,4); ctx.fillRect(10,16,12,4);
    // Body hexagon
    ctx.fillRect(10,21,12,3); ctx.fillRect(8,24,16,4);
    ctx.fillStyle = P.primary; ctx.globalAlpha = 0.2;
    ctx.fillRect(10,8,12,1); ctx.fillRect(8,12,16,1); ctx.fillRect(10,16,12,1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.skinDark;
    ctx.fillRect(20,8,2,12);
    
  } else if (a === 'minimal') {
    // Tiny figure in center, massive negative space
    ctx.fillStyle = P.skin;
    ctx.fillRect(14,14,4,5); ctx.fillRect(13,15,6,3); // tiny head
    ctx.fillRect(14,19,4,3); // tiny body
    ctx.fillStyle = P.skinLight;
    ctx.fillRect(13,15,1,3);
    ctx.fillStyle = P.skinDark;
    ctx.fillRect(18,15,1,3);
    
  } else if (a === 'wisp') {
    // Scattered pixels — barely coherent
    ctx.fillStyle = P.skin;
    const cx = 16, cy = 14;
    for (let n = 0; n < 20; n++) {
      const wx = cx + Math.floor((rng()-0.5) * 12);
      const wy = cy + Math.floor((rng()-0.5) * 12);
      ctx.globalAlpha = 0.3 + rng() * 0.7;
      ctx.fillRect(wx, wy, 1, 1);
    }
    // Core hint — two eye pixels
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.primary;
    ctx.fillRect(14,13,1,1); ctx.fillRect(18,13,1,1);
    // A few accent pixels
    ctx.fillStyle = P.accent;
    ctx.globalAlpha = 0.5;
    for (let n = 0; n < 6; n++) {
      ctx.fillRect(cx + Math.floor((rng()-0.5)*14), cy + Math.floor((rng()-0.5)*14), 1, 1);
    }
    ctx.globalAlpha = 1;
    
  } else if (a === 'monolith') {
    // Tall narrow slab
    ctx.fillStyle = P.skin;
    ctx.fillRect(13,3,6,26); ctx.fillRect(12,5,8,22);
    ctx.fillStyle = P.skinDark;
    ctx.fillRect(18,5,2,22);
    ctx.fillStyle = P.skinLight;
    ctx.fillRect(12,5,2,22);
    // Face etched in
    ctx.fillStyle = P.primary; ctx.globalAlpha = 0.4;
    ctx.fillRect(13,10,2,1); ctx.fillRect(17,10,2,1); // eyes
    ctx.fillRect(14,15,4,1); // mouth
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// EYE TYPES — more variety
// ============================================================
function drawEyes(ctx, rng, P, archetype) {
  const eyeType = Math.floor(rng() * 10);
  if (archetype === 'wisp' || archetype === 'monolith') return; // eyes drawn in character
  const yOff = archetype === 'beast' ? 1 : archetype === 'slim' ? -2 : archetype === 'orb' ? -1 : archetype === 'minimal' ? 2 : 0;
  const y = 13 + yOff;
  
  ctx.fillStyle = P.primary;
  
  if (eyeType === 0) {
    // Standard
    ctx.fillRect(11,y,3,2); ctx.fillRect(18,y,3,2);
    ctx.fillStyle = '#fff'; ctx.fillRect(11,y,1,1); ctx.fillRect(18,y,1,1);
    ctx.fillStyle = '#000'; ctx.fillRect(12,y,1,1); ctx.fillRect(19,y,1,1);
  } else if (eyeType === 1) {
    // Glowing dots
    ctx.fillRect(12,y,2,2); ctx.fillRect(18,y,2,2);
    ctx.fillStyle = '#fff'; ctx.fillRect(12,y,1,1); ctx.fillRect(18,y,1,1);
  } else if (eyeType === 2) {
    // Wide scanner
    ctx.fillRect(10,y,5,1); ctx.fillRect(17,y,5,1);
    ctx.fillStyle = '#fff'; ctx.fillRect(13,y,1,1); ctx.fillRect(20,y,1,1);
  } else if (eyeType === 3) {
    // X eyes
    ctx.fillRect(11,y,1,1); ctx.fillRect(13,y,1,1); ctx.fillRect(12,y+1,1,1);
    ctx.fillRect(18,y,1,1); ctx.fillRect(20,y,1,1); ctx.fillRect(19,y+1,1,1);
  } else if (eyeType === 4) {
    // Vertical slits
    ctx.fillRect(12,y-1,1,4); ctx.fillRect(19,y-1,1,4);
    ctx.fillStyle = '#fff'; ctx.fillRect(12,y,1,1); ctx.fillRect(19,y,1,1);
  } else if (eyeType === 5) {
    // One big, one small
    ctx.fillRect(10,y,4,3); ctx.fillRect(19,y+1,2,1);
    ctx.fillStyle = '#fff'; ctx.fillRect(11,y+1,2,1);
  } else if (eyeType === 6) {
    // Cyclops
    ctx.fillRect(13,y,6,3);
    ctx.fillStyle = '#000'; ctx.fillRect(15,y+1,2,1);
    ctx.fillStyle = '#fff'; ctx.fillRect(14,y,1,1);
  } else if (eyeType === 7) {
    // Empty sockets
    ctx.fillStyle = '#000';
    ctx.fillRect(11,y,3,3); ctx.fillRect(18,y,3,3);
    ctx.fillStyle = P.primary;
    ctx.fillRect(12,y+1,1,1); ctx.fillRect(19,y+1,1,1);
  } else if (eyeType === 8) {
    // Visor/bar
    ctx.fillRect(9,y,14,2);
    ctx.fillStyle = '#000';
    ctx.fillRect(12,y,1,2); ctx.fillRect(19,y,1,2);
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.3;
    ctx.fillRect(9,y,14,1);
    ctx.globalAlpha = 1;
  } else {
    // Tiny dots
    ctx.fillRect(12,y+1,1,1); ctx.fillRect(19,y+1,1,1);
  }
}

// ============================================================
// MOUTH TYPES
// ============================================================
function drawMouth(ctx, rng, P, archetype) {
  const mouthType = Math.floor(rng() * 8);
  if (archetype === 'wisp' || archetype === 'monolith' || archetype === 'minimal') return;
  const yOff = archetype === 'beast' ? 2 : archetype === 'slim' ? -1 : archetype === 'orb' ? 0 : 0;
  const y = 18 + yOff;
  
  ctx.fillStyle = P.primary;
  
  if (mouthType === 0) ctx.fillRect(14,y,4,1);
  else if (mouthType === 1) { ctx.fillRect(13,y,1,1); ctx.fillRect(14,y+1,4,1); ctx.fillRect(18,y,1,1); }
  else if (mouthType === 2) { ctx.fillRect(14,y,4,1); ctx.fillRect(15,y-1,2,1); } // frown
  else if (mouthType === 3) { ctx.fillStyle = '#000'; ctx.fillRect(14,y,4,2); ctx.fillStyle = P.primary; ctx.fillRect(14,y,4,1); }
  else if (mouthType === 4) ctx.fillRect(15,y,2,1); // tiny
  else if (mouthType === 5) { // teeth
    ctx.fillRect(12,y,8,1); ctx.fillStyle = '#fff'; ctx.fillRect(13,y,1,1); ctx.fillRect(15,y,1,1); ctx.fillRect(17,y,1,1);
  }
  else if (mouthType === 6) { } // no mouth
  else { ctx.fillRect(14,y,1,1); ctx.fillRect(17,y,1,1); } // dots
}

// ============================================================
// ACCESSORIES
// ============================================================
function drawAccessory(ctx, rng, P) {
  const accType = Math.floor(rng() * 12);
  
  if (accType === 0) return; // none
  else if (accType === 1) { // hat
    ctx.fillStyle = P.primary;
    ctx.fillRect(9,4,14,3); ctx.fillRect(11,2,10,2);
  } else if (accType === 2) { // crown
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(10,4,12,2); ctx.fillRect(11,2,2,2); ctx.fillRect(15,2,2,2); ctx.fillRect(19,2,2,2);
  } else if (accType === 3) { // hood
    ctx.fillStyle = '#111118';
    ctx.fillRect(7,4,18,4); ctx.fillRect(6,6,20,3);
  } else if (accType === 4) { // scar
    ctx.fillStyle = P.glitch1; ctx.globalAlpha = 0.5;
    ctx.fillRect(13,10,1,8); ctx.fillRect(14,11,1,1); ctx.fillRect(12,14,1,1);
    ctx.globalAlpha = 1;
  } else if (accType === 5) { // earring
    ctx.fillStyle = P.accent;
    ctx.fillRect(8,15,1,2); ctx.fillRect(7,16,1,1);
  } else if (accType === 6) { // goggles
    ctx.fillStyle = '#111';
    ctx.fillRect(9,11,6,4); ctx.fillRect(17,11,6,4);
    ctx.fillStyle = P.accent;
    ctx.fillRect(10,12,4,2); ctx.fillRect(18,12,4,2);
  } else if (accType === 7) { // face paint
    ctx.fillStyle = P.primary; ctx.globalAlpha = 0.3;
    ctx.fillRect(10,15,3,1); ctx.fillRect(11,16,4,1); ctx.fillRect(19,15,3,1);
    ctx.globalAlpha = 1;
  } else if (accType === 8) { // collar
    ctx.fillStyle = P.accent;
    ctx.fillRect(8,19,16,1);
  } else if (accType === 9) { // shoulder pads
    ctx.fillStyle = P.primary;
    ctx.fillRect(5,19,4,2); ctx.fillRect(23,19,4,2);
  } else if (accType === 10) { // chest emblem
    ctx.fillStyle = P.primary;
    ctx.fillRect(14,23,4,3); ctx.fillStyle = '#000'; ctx.fillRect(15,24,2,1);
  } else { // bandana
    ctx.fillStyle = P.primary;
    ctx.fillRect(9,9,14,2); ctx.fillRect(22,10,3,2);
  }
}

// ============================================================
// GLITCH PASS — varied intensity
// ============================================================
function glitchPass(ctx, rng, P, intensity) {
  // intensity: 0-1, controls how much glitch
  const i = intensity;
  
  // Scanlines
  for (let y = 0; y < SIZE; y++) {
    if (y % 2 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, y, SIZE, 1); }
  }

  const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = imgData.data;
  const orig = new Uint8ClampedArray(d);

  // Row displacement
  const displaceChance = 0.25 + i * 0.35;
  const maxShift = 1 + Math.floor(i * 5);
  for (let y = 0; y < SIZE; y++) {
    if (rng() < displaceChance) {
      const shift = (rng() > 0.5 ? 1 : -1) * (1 + Math.floor(rng() * maxShift));
      for (let x = 0; x < SIZE; x++) {
        const srcX = ((x - shift) + SIZE) % SIZE;
        const di = (y * SIZE + x) * 4, si = (y * SIZE + srcX) * 4;
        d[di]=orig[si]; d[di+1]=orig[si+1]; d[di+2]=orig[si+2]; d[di+3]=orig[si+3];
      }
    }
  }

  // RGB split
  const copy2 = new Uint8ClampedArray(d);
  const splitChance = 0.15 + i * 0.25;
  for (let y = 0; y < SIZE; y++) {
    if (rng() < splitChance) {
      const split = 1 + Math.floor(rng() * (1 + i * 2));
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
  const vChance = 0.05 + i * 0.12;
  for (let x = 0; x < SIZE; x++) {
    if (rng() < vChance) {
      const vShift = (rng() > 0.5 ? 1 : -1) * (1 + Math.floor(rng() * 3));
      for (let y = 0; y < SIZE; y++) {
        const srcY = ((y - vShift) + SIZE) % SIZE;
        const di = (y * SIZE + x) * 4, si = (srcY * SIZE + x) * 4;
        d[di]=copy3[si]; d[di+1]=copy3[si+1]; d[di+2]=copy3[si+2]; d[di+3]=copy3[si+3];
      }
    }
  }

  // Row deletion
  for (let y = 0; y < SIZE; y++) {
    if (rng() < i * 0.15) {
      for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;
        d[idx] = d[idx+1] = d[idx+2] = 0; d[idx+3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Glitch blocks
  const colors = [P.glitch1, P.glitch2, P.primary, P.accent];
  const blockCount = 3 + Math.floor(i * 8);
  for (let n = 0; n < blockCount; n++) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.globalAlpha = 0.08 + rng() * 0.2;
    ctx.fillRect(Math.floor(rng()*SIZE), Math.floor(rng()*SIZE), 1+Math.floor(rng()*6), 1);
    ctx.globalAlpha = 1;
  }

  // Corruption bars (signature magenta)
  const barCount = 1 + Math.floor(i * 3);
  for (let n = 0; n < barCount; n++) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.globalAlpha = 0.1 + rng() * 0.15;
    ctx.fillRect(0, Math.floor(rng()*SIZE), SIZE, 1);
    ctx.globalAlpha = 1;
  }

  // Sparks
  const sparkCount = 4 + Math.floor(i * 8);
  for (let n = 0; n < sparkCount; n++) {
    ctx.fillStyle = [P.primary, P.accent, '#fff'][Math.floor(rng()*3)];
    ctx.globalAlpha = 0.2 + rng() * 0.5;
    ctx.fillRect(Math.floor(rng()*SIZE), Math.floor(rng()*SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// MAIN GENERATOR
// ============================================================
function generatePFP(name, id, description) {
  const seed = hashStr(`${name}#${id}#${description || ''}`);
  const rng = rngFactory(seed);
  
  const desc = `${name} ${description || ''}`.toLowerCase();
  
  // Pick palette — from keywords or seeded random
  let paletteIdx = -1;
  for (const [kw, idx] of Object.entries(PALETTE_KEYWORDS)) {
    if (desc.includes(kw)) { paletteIdx = idx; break; }
  }
  if (paletteIdx < 0) paletteIdx = Math.floor(rng() * PALETTES.length);
  const pal = PALETTES[paletteIdx];
  
  // Pick archetype
  const archIdx = Math.floor(rng() * ARCHETYPES.length);
  const archetype = ARCHETYPES[archIdx];
  
  // Derive skin variation
  const skinVariant = rng();
  let skinColor, skinLight, skinDark;
  if (skinVariant < 0.25) {
    skinColor = '#1a1a1a'; skinLight = '#2a2a2a'; skinDark = '#0a0a0a';
  } else if (skinVariant < 0.5) {
    skinColor = '#2a2a30'; skinLight = '#3a3a40'; skinDark = '#151520';
  } else if (skinVariant < 0.75) {
    // Tinted with palette color
    const rgb = hexToRgb(pal.primary);
    const mix = (c, amt) => Math.floor(c * amt + 0x1a * (1-amt));
    skinColor = `rgb(${mix(rgb.r,0.25)},${mix(rgb.g,0.25)},${mix(rgb.b,0.25)})`;
    skinLight = `rgb(${mix(rgb.r,0.3)+20},${mix(rgb.g,0.3)+20},${mix(rgb.b,0.3)+20})`;
    skinDark = `rgb(${Math.max(0,mix(rgb.r,0.2)-10)},${Math.max(0,mix(rgb.g,0.2)-10)},${Math.max(0,mix(rgb.b,0.2)-10)})`;
  } else {
    skinColor = '#333340'; skinLight = '#444455'; skinDark = '#222230';
  }
  
  const P = {
    bg: pal.bg,
    primary: pal.primary,
    accent: pal.accent,
    glitch1: pal.glitch1,
    glitch2: pal.glitch2,
    skin: skinColor,
    skinLight,
    skinDark,
  };
  
  // Glitch intensity varies per agent
  const glitchIntensity = 0.4 + rng() * 0.5; // 0.4 to 0.9
  
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  
  // Background
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  
  // Background motif — subtle dots/lines based on seed
  ctx.fillStyle = P.primary; ctx.globalAlpha = 0.08;
  for (let n = 0; n < 6; n++) {
    const bx = Math.floor(rng()*SIZE), by = Math.floor(rng()*SIZE);
    const bw = 1 + Math.floor(rng()*4);
    ctx.fillRect(bx, by, bw, 1);
  }
  ctx.globalAlpha = 1;
  
  // Draw character
  drawCharacter(ctx, rng, P, archetype);
  
  // Eyes
  drawEyes(ctx, rng, P, archetype);
  
  // Mouth (skip for fragment archetype sometimes)
  if (archetype !== 'fragment' || rng() > 0.5) {
    drawMouth(ctx, rng, P, archetype);
  }
  
  // Accessory
  drawAccessory(ctx, rng, P);
  
  // Glitch pass
  const glitchRng = rngFactory(seed + 7777);
  glitchPass(ctx, glitchRng, P, glitchIntensity);
  
  // Upscale
  const out = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const oc = out.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  
  return out.toBuffer('image/png');
}

export { generatePFP };
