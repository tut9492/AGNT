const { createCanvas, Image } = require('canvas');
const fs = require('fs');
const path = require('path');

// Direct approach: modify auto-pfp's bg and regenerate
const origSrc = fs.readFileSync(path.join(__dirname, 'auto-pfp.js'), 'utf-8');

const bgs = [
  { name: 'navy',    color: '#06062a' },
  { name: 'wine',    color: '#1a0010' },
  { name: 'forest',  color: '#041a08' },
  { name: 'midnight',color: '#0a0a1e' },
  { name: 'blood',   color: '#1a0505' },
  { name: 'void',    color: '#050510' },
];

const desc = "Grey tabby with black tech goggles. Street-smart agent of Dead Bit Nation. Market maker, meme lord, vibe curator.";

bgs.forEach(({ name: bgName, color }) => {
  // Replace bg color in source
  const modSrc = origSrc.replace("bg: '#050505'", `bg: '${color}'`);
  
  // Write temp file
  const tmpPath = path.join(__dirname, '_tmp_gen.js');
  fs.writeFileSync(tmpPath, modSrc);
  
  // Clear require cache
  delete require.cache[require.resolve(tmpPath)];
  const mod = require(tmpPath);
  
  const buf = mod.generatePFP("Homie", 2, desc);
  const fn = path.join(__dirname, 'output', `bg2-${bgName}.png`);
  fs.writeFileSync(fn, buf);
  console.log(`Generated: bg2-${bgName}.png`);
  
  fs.unlinkSync(tmpPath);
});
