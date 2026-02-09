#!/usr/bin/env node
/**
 * Analyze a reference image and extract:
 * - Dominant colors (palette)
 * - Color distribution (where colors cluster)
 * - Brightness map
 * 
 * Output: JSON palette that auto-pfp can use
 */
const { createCanvas, loadImage } = require('canvas');

async function analyzeImage(imagePath) {
  const img = await loadImage(imagePath);
  
  // Scale to 32x32 to match our working resolution
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, 32, 32);
  
  const imgData = ctx.getImageData(0, 0, 32, 32);
  const d = imgData.data;
  
  // Collect all non-black colors
  const colors = [];
  const colorCounts = {};
  
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    // Skip very dark pixels (background)
    if (r < 20 && g < 20 && b < 20) continue;
    
    // Quantize to reduce noise (round to nearest 16)
    const qr = Math.round(r / 32) * 32;
    const qg = Math.round(g / 32) * 32;
    const qb = Math.round(b / 32) * 32;
    const key = `${qr},${qg},${qb}`;
    
    colorCounts[key] = (colorCounts[key] || 0) + 1;
    colors.push([r, g, b]);
  }
  
  // Sort by frequency
  const sorted = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => {
      const [r, g, b] = key.split(',').map(Number);
      return { r, g, b, count, hex: `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}` };
    });
  
  // Find most saturated color (accent/glitch)
  function saturation(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    return max === 0 ? 0 : (max - min) / max;
  }
  
  const bySaturation = sorted.filter(c => saturation(c.r, c.g, c.b) > 0.3)
    .sort((a, b) => saturation(b.r, b.g, b.b) - saturation(a.r, a.g, a.b));
  
  // Find brightest grey (fur/body)
  const greys = sorted.filter(c => {
    const s = saturation(c.r, c.g, c.b);
    return s < 0.3 && (c.r + c.g + c.b) > 100;
  }).sort((a, b) => (b.r + b.g + b.b) - (a.r + a.g + a.b));
  
  return {
    dominantColors: sorted,
    saturatedColors: bySaturation,
    greyColors: greys,
    summary: {
      primary: bySaturation[0]?.hex || sorted[0]?.hex || '#888888',
      secondary: bySaturation[1]?.hex || sorted[1]?.hex || '#666666',
      accent: bySaturation[2]?.hex || bySaturation[0]?.hex || '#00ffff',
      bodyColor: greys[0]?.hex || '#888888',
      bodyLight: greys[1]?.hex || '#aaaaaa',
    }
  };
}

if (require.main === module) {
  const img = process.argv[2];
  if (!img) { console.log('Usage: node analyze-ref.js <image>'); process.exit(1); }
  analyzeImage(img).then(r => console.log(JSON.stringify(r, null, 2)));
}

module.exports = { analyzeImage };
