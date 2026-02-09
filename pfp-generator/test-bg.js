const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Quick test: generate same agent with different bg base colors
const auto = require('./auto-pfp.js');

// We'll hack the bg by post-processing — generate then tint
// Actually easier: just modify and re-run with different bg values

const bgs = [
  { name: 'navy',    color: '#05051a' },
  { name: 'wine',    color: '#0a0005' },
  { name: 'forest',  color: '#030a05' },
  { name: 'charcoal',color: '#0a0a0a' },
  { name: 'purple',  color: '#08041a' },
  { name: 'rust',    color: '#0a0500' },
];

const desc = "Grey tabby with black tech goggles. Street-smart agent of Dead Bit Nation. Market maker, meme lord, vibe curator.";

// Since generatePFP has hardcoded bg, let me just output with the module as-is
// and show what different agent descriptions produce
// Actually let me just write a quick variant

const SIZE = 32, OUTPUT_SIZE = 512;

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function rngFactory(seed) {
  let s = seed % 2147483647 || 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

bgs.forEach(({ name: bgName, color }) => {
  // Generate the PFP buffer, then replace bg pixels
  // Simpler: just generate with the auto module as a baseline
  const buf = auto.generatePFP("Homie", 2, desc);
  
  // Load into canvas, swap near-black pixels with tinted bg
  const img = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const ictx = img.getContext('2d');
  const src = require('canvas').loadImage(buf).then(image => {
    ictx.drawImage(image, 0, 0);
  });
});

// This async approach is messy. Let me just patch the module directly.
// Simpler: copy the generate logic with bg param.

console.log("Generating bg variants...");

// Parse hex
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

bgs.forEach(({ name: bgName, color }) => {
  const buf = auto.generatePFP("Homie", 2, desc);
  const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const ctx = canvas.getContext('2d');
  
  // Load buffer as image synchronously via another canvas
  const small = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const sc = small.getContext('2d');
  
  // Decode PNG buffer
  const img = new (require('canvas').Image)();
  img.src = buf;
  ctx.drawImage(img, 0, 0);
  
  // Get image data and replace very dark pixels (near #050505) with new bg
  const imgData = ctx.getImageData(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  const d = imgData.data;
  const [br, bg2, bb] = hexToRgb(color);
  
  for (let i = 0; i < d.length; i += 4) {
    // If pixel is very dark (all channels < 15)
    if (d[i] < 15 && d[i+1] < 15 && d[i+2] < 15) {
      // Blend towards new bg color
      const darkness = Math.max(d[i], d[i+1], d[i+2]);
      const t = darkness / 15; // 0 = pure black, 1 = threshold
      d[i]   = Math.round(br + (d[i] - br) * t);
      d[i+1] = Math.round(bg2 + (d[i+1] - bg2) * t);
      d[i+2] = Math.round(bb + (d[i+2] - bb) * t);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  
  const fn = path.join(__dirname, 'output', `bg-${bgName}.png`);
  fs.writeFileSync(fn, canvas.toBuffer('image/png'));
  console.log(`Generated: bg-${bgName}.png`);
});
