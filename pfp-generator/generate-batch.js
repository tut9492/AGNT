#!/usr/bin/env node
/**
 * AGNT Batch PFP Generator
 * Generates unique PFPs by randomizing all traits with heavy glitch
 * Usage: node generate-batch.js [count] [output-dir]
 */
const { generatePFP, PALETTES, HEAD_SHAPES, EYE_STYLES, ACCESSORIES, BG_STYLES } = require('./generate-pfp.js');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

const count = parseInt(process.argv[2]) || 20;
const outputDir = process.argv[3] || './output/batch';

const paletteKeys = Object.keys(PALETTES);
const headKeys = Object.keys(HEAD_SHAPES);
const eyeKeys = Object.keys(EYE_STYLES);
const accKeys = Object.keys(ACCESSORIES);
const bgKeys = Object.keys(BG_STYLES);

// Seeded RNG from name
function makeRng(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Heavy glitch pass (v3 level — Tut's preference)
function applyHeavyGlitch(canvas, rng) {
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  const data = imgData.data;

  // Row displacement (50%)
  for (let y = 0; y < OUTPUT_SIZE; y++) {
    if (rng() < 0.5) {
      const shift = Math.floor((rng() - 0.5) * OUTPUT_SIZE * 0.3);
      const row = new Uint8ClampedArray(OUTPUT_SIZE * 4);
      for (let x = 0; x < OUTPUT_SIZE; x++) {
        const srcX = ((x + shift) % OUTPUT_SIZE + OUTPUT_SIZE) % OUTPUT_SIZE;
        const srcIdx = (y * OUTPUT_SIZE + srcX) * 4;
        const dstIdx = x * 4;
        row[dstIdx] = data[srcIdx];
        row[dstIdx + 1] = data[srcIdx + 1];
        row[dstIdx + 2] = data[srcIdx + 2];
        row[dstIdx + 3] = data[srcIdx + 3];
      }
      for (let x = 0; x < OUTPUT_SIZE; x++) {
        const idx = (y * OUTPUT_SIZE + x) * 4;
        data[idx] = row[x * 4];
        data[idx + 1] = row[x * 4 + 1];
        data[idx + 2] = row[x * 4 + 2];
        data[idx + 3] = row[x * 4 + 3];
      }
    }
  }

  // RGB channel split
  const splitAmount = Math.floor(rng() * 6) + 2;
  for (let y = 0; y < OUTPUT_SIZE; y++) {
    for (let x = 0; x < OUTPUT_SIZE; x++) {
      const idx = (y * OUTPUT_SIZE + x) * 4;
      const srcR = (y * OUTPUT_SIZE + ((x + splitAmount) % OUTPUT_SIZE)) * 4;
      const srcB = (y * OUTPUT_SIZE + ((x - splitAmount + OUTPUT_SIZE) % OUTPUT_SIZE)) * 4;
      data[idx] = data[srcR]; // R from shifted
      data[idx + 2] = data[srcB + 2]; // B from other shift
    }
  }

  // Vertical corruption bands
  for (let i = 0; i < 3 + Math.floor(rng() * 5); i++) {
    const x = Math.floor(rng() * OUTPUT_SIZE);
    const w = 1 + Math.floor(rng() * 8);
    const yStart = Math.floor(rng() * OUTPUT_SIZE);
    const h = 20 + Math.floor(rng() * 100);
    for (let dy = 0; dy < h && yStart + dy < OUTPUT_SIZE; dy++) {
      for (let dx = 0; dx < w && x + dx < OUTPUT_SIZE; dx++) {
        const idx = ((yStart + dy) * OUTPUT_SIZE + x + dx) * 4;
        if (rng() < 0.7) {
          data[idx] = Math.min(255, data[idx] + 80);
          data[idx + 1] = Math.min(255, data[idx + 1] + 80);
        }
      }
    }
  }

  // Scanlines
  for (let y = 0; y < OUTPUT_SIZE; y += 2) {
    for (let x = 0; x < OUTPUT_SIZE; x++) {
      const idx = (y * OUTPUT_SIZE + x) * 4;
      data[idx] = Math.floor(data[idx] * 0.85);
      data[idx + 1] = Math.floor(data[idx + 1] * 0.85);
      data[idx + 2] = Math.floor(data[idx + 2] * 0.85);
    }
  }

  // Static noise
  for (let i = 0; i < OUTPUT_SIZE * OUTPUT_SIZE * 0.02; i++) {
    const x = Math.floor(rng() * OUTPUT_SIZE);
    const y = Math.floor(rng() * OUTPUT_SIZE);
    const idx = (y * OUTPUT_SIZE + x) * 4;
    const v = rng() > 0.5 ? 255 : 0;
    data[idx] = v;
    data[idx + 1] = v;
    data[idx + 2] = v;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// Generate unique traits from agent number
function traitsForAgent(n) {
  const rng = makeRng(n * 31337 + 42);
  
  const palette = paletteKeys[Math.floor(rng() * paletteKeys.length)];
  const head = headKeys[Math.floor(rng() * headKeys.length)];
  const eyes = eyeKeys[Math.floor(rng() * eyeKeys.length)];
  const bg = bgKeys[Math.floor(rng() * bgKeys.length)];
  
  // 1-3 accessories
  const numAcc = 1 + Math.floor(rng() * 3);
  const shuffled = [...accKeys].sort(() => rng() - 0.5);
  const accs = shuffled.slice(0, numAcc);
  
  return { palette, headShape: head, eyeStyle: eyes, bgStyle: bg, accessories: accs };
}

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

console.log(`🎨 Generating ${count} unique PFPs with heavy glitch...\n`);

const manifest = [];

for (let i = 0; i < count; i++) {
  const traits = traitsForAgent(i);
  const name = `agent-${i}`;
  
  // Generate base PFP
  const canvas = generatePFP({
    name,
    ...traits,
    glitchLevel: 'high',
    variant: i
  });
  
  // Apply heavy glitch
  const rng = makeRng(i * 99991 + 7);
  applyHeavyGlitch(canvas, rng);
  
  const filename = `agnt-${String(i).padStart(3, '0')}.png`;
  fs.writeFileSync(path.join(outputDir, filename), canvas.toBuffer('image/png'));
  
  manifest.push({ id: i, filename, traits });
  
  process.stdout.write(`  Generated ${filename} [${traits.palette}/${traits.headShape}/${traits.eyeStyle}]\n`);
}

// Write manifest
fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`\n✅ ${count} PFPs generated in ${outputDir}/`);
console.log(`📋 Manifest: ${outputDir}/manifest.json`);
