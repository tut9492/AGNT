const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Ensure output directory exists
const outputDir = '/tmp/pfp-custom';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Heavy glitch effects function
function applyHeavyGlitch(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // 1. Row displacement (50% of rows)
    for (let y = 0; y < height; y++) {
        if (Math.random() < 0.5) {
            const shift = Math.floor((Math.random() - 0.5) * 8);
            const rowData = [];
            
            // Extract row
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                rowData.push(data[idx], data[idx + 1], data[idx + 2], data[idx + 3]);
            }
            
            // Shift and wrap
            for (let x = 0; x < width; x++) {
                const sourceX = (x - shift + width) % width;
                const targetIdx = (y * width + x) * 4;
                const sourceIdx = sourceX * 4;
                
                data[targetIdx] = rowData[sourceIdx];
                data[targetIdx + 1] = rowData[sourceIdx + 1];
                data[targetIdx + 2] = rowData[sourceIdx + 2];
                data[targetIdx + 3] = rowData[sourceIdx + 3];
            }
        }
    }
    
    // 2. RGB channel split
    const rShift = Math.floor((Math.random() - 0.5) * 4);
    const bShift = Math.floor((Math.random() - 0.5) * 4);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            // Get original colors
            const originalR = data[idx];
            const originalG = data[idx + 1];
            const originalB = data[idx + 2];
            
            // Sample shifted positions
            const rX = Math.max(0, Math.min(width - 1, x + rShift));
            const bX = Math.max(0, Math.min(width - 1, x + bShift));
            
            const rIdx = (y * width + rX) * 4;
            const bIdx = (y * width + bX) * 4;
            
            data[idx] = data[rIdx];     // R from shifted position
            data[idx + 1] = originalG;   // G stays
            data[idx + 2] = data[bIdx + 2]; // B from shifted position
        }
    }
    
    // 3. Vertical corruption (random vertical lines)
    for (let corruption = 0; corruption < 3; corruption++) {
        const x = Math.floor(Math.random() * width);
        const startY = Math.floor(Math.random() * height * 0.7);
        const endY = Math.min(height, startY + Math.floor(Math.random() * 8) + 4);
        
        for (let y = startY; y < endY; y++) {
            const idx = (y * width + x) * 4;
            data[idx] = Math.random() < 0.5 ? 255 : 0;     // R
            data[idx + 1] = Math.random() < 0.5 ? 255 : 0; // G  
            data[idx + 2] = Math.random() < 0.5 ? 255 : 0; // B
        }
    }
    
    // 4. Scanlines
    for (let y = 0; y < height; y += 2) {
        if (Math.random() < 0.3) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                data[idx] = Math.floor(data[idx] * 0.7);
                data[idx + 1] = Math.floor(data[idx + 1] * 0.7);
                data[idx + 2] = Math.floor(data[idx + 2] * 0.7);
            }
        }
    }
    
    // 5. Static/noise
    for (let i = 0; i < width * height * 0.02; i++) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        const idx = (y * width + x) * 4;
        
        const noise = Math.random() > 0.5 ? 255 : 0;
        data[idx] = noise;
        data[idx + 1] = noise;
        data[idx + 2] = noise;
    }
    
    // 6. Drip effects
    for (let drip = 0; drip < 2; drip++) {
        const startX = Math.floor(Math.random() * width);
        const startY = Math.floor(Math.random() * height * 0.3);
        const dripLength = Math.floor(Math.random() * 6) + 3;
        
        for (let i = 0; i < dripLength; i++) {
            const y = startY + i;
            const x = startX + Math.floor((Math.random() - 0.5) * 2);
            
            if (x >= 0 && x < width && y >= 0 && y < height) {
                const idx = (y * width + x) * 4;
                data[idx] = Math.floor(data[idx] * 0.3);
                data[idx + 1] = Math.floor(data[idx + 1] * 0.3);
                data[idx + 2] = Math.floor(data[idx + 2] * 0.3);
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Agent character generators
const agents = [
    {
        id: 7,
        name: "FortunePig-1",
        generate: (ctx) => {
            // Dark background with gold tint
            ctx.fillStyle = '#1a1508';
            ctx.fillRect(0, 0, 32, 32);
            
            // Pig body (pink)
            ctx.fillStyle = '#ff9db4';
            ctx.fillRect(8, 12, 16, 14);
            
            // Pig head
            ctx.fillRect(10, 8, 12, 10);
            
            // Snout
            ctx.fillStyle = '#ffb4c7';
            ctx.fillRect(12, 14, 8, 4);
            
            // Nostrils
            ctx.fillStyle = '#000';
            ctx.fillRect(14, 16, 1, 1);
            ctx.fillRect(17, 16, 1, 1);
            
            // Eyes
            ctx.fillRect(12, 10, 2, 2);
            ctx.fillRect(18, 10, 2, 2);
            
            // Eye shine
            ctx.fillStyle = '#fff';
            ctx.fillRect(13, 10, 1, 1);
            ctx.fillRect(19, 10, 1, 1);
            
            // Gold coins floating around
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(4, 6, 3, 3);
            ctx.fillRect(25, 20, 3, 3);
            ctx.fillRect(6, 24, 2, 2);
            
            // Pig ears
            ctx.fillStyle = '#ff9db4';
            ctx.fillRect(8, 6, 3, 4);
            ctx.fillRect(21, 6, 3, 4);
            
            // Legs
            ctx.fillStyle = '#ff9db4';
            ctx.fillRect(10, 22, 3, 4);
            ctx.fillRect(19, 22, 3, 4);
        }
    },
    
    {
        id: 8,
        name: "CONWIC",
        generate: (ctx) => {
            // Dark tech background
            ctx.fillStyle = '#0a0a15';
            ctx.fillRect(0, 0, 32, 32);
            
            // Solid geometric body (permanent structure)
            ctx.fillStyle = '#4a6fa5';
            ctx.fillRect(8, 12, 16, 14);
            
            // Head block
            ctx.fillRect(10, 6, 12, 10);
            
            // Constructor helmet/crown
            ctx.fillStyle = '#6b8bc7';
            ctx.fillRect(9, 4, 14, 4);
            
            // Eyes (builder focus)
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(12, 9, 2, 2);
            ctx.fillRect(18, 9, 2, 2);
            
            // Permanent marker lines (geometric)
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(6, 8, 1, 16);
            ctx.fillRect(25, 8, 1, 16);
            ctx.fillRect(8, 26, 16, 1);
            
            // Building blocks/foundations
            ctx.fillStyle = '#2d4f7a';
            ctx.fillRect(6, 24, 4, 4);
            ctx.fillRect(22, 24, 4, 4);
            ctx.fillRect(14, 28, 4, 4);
            
            // Construction details
            ctx.fillStyle = '#8bb3ff';
            ctx.fillRect(11, 13, 1, 1);
            ctx.fillRect(20, 13, 1, 1);
            ctx.fillRect(15, 18, 2, 2);
        }
    },
    
    {
        id: 9,
        name: "TutuAgent",
        generate: (ctx) => {
            // Simple dark background
            ctx.fillStyle = '#0d0d0d';
            ctx.fillRect(0, 0, 32, 32);
            
            // Minimal figure - simple humanoid
            ctx.fillStyle = '#888888';
            
            // Head
            ctx.fillRect(13, 8, 6, 6);
            
            // Body
            ctx.fillRect(14, 14, 4, 8);
            
            // Arms
            ctx.fillRect(10, 16, 3, 4);
            ctx.fillRect(19, 16, 3, 4);
            
            // Legs
            ctx.fillRect(13, 22, 2, 6);
            ctx.fillRect(17, 22, 2, 6);
            
            // Simple eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(14, 10, 1, 1);
            ctx.fillRect(17, 10, 1, 1);
            
            // Test indicator dot
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(15, 4, 2, 2);
        }
    },
    
    {
        id: 10,
        name: "Mogra",
        generate: (ctx) => {
            // Dark jungle background
            ctx.fillStyle = '#0f150a';
            ctx.fillRect(0, 0, 32, 32);
            
            // Ape body (brown)
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(8, 14, 16, 12);
            
            // Ape head
            ctx.fillRect(9, 8, 14, 12);
            
            // Face area (lighter)
            ctx.fillStyle = '#cd853f';
            ctx.fillRect(11, 10, 10, 8);
            
            // Eyes (intelligent)
            ctx.fillStyle = '#000';
            ctx.fillRect(13, 12, 2, 2);
            ctx.fillRect(17, 12, 2, 2);
            
            // Eye shine
            ctx.fillStyle = '#fff';
            ctx.fillRect(14, 12, 1, 1);
            ctx.fillRect(18, 12, 1, 1);
            
            // Shipping/building symbols around
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(4, 6, 2, 2); // Package
            ctx.fillRect(26, 8, 2, 2);
            ctx.fillRect(3, 22, 3, 2); // Build blocks
            ctx.fillRect(26, 24, 3, 2);
            
            // Arms (coding gesture)
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(6, 16, 4, 6);
            ctx.fillRect(22, 16, 4, 6);
            
            // Nose
            ctx.fillStyle = '#000';
            ctx.fillRect(15, 15, 2, 1);
        }
    },
    
    {
        id: 11,
        name: "SmirksterAgent",
        generate: (ctx) => {
            // Degen dark background
            ctx.fillStyle = '#0a050a';
            ctx.fillRect(0, 0, 32, 32);
            
            // Head
            ctx.fillStyle = '#ffdbac';
            ctx.fillRect(10, 8, 12, 12);
            
            // Sunglasses
            ctx.fillStyle = '#000';
            ctx.fillRect(8, 11, 16, 4);
            
            // Sunglasses lens shine
            ctx.fillStyle = '#333';
            ctx.fillRect(9, 12, 2, 2);
            ctx.fillRect(21, 12, 2, 2);
            
            // Smirk mouth (signature feature)
            ctx.fillStyle = '#000';
            ctx.fillRect(13, 16, 1, 1);
            ctx.fillRect(14, 15, 3, 1);
            ctx.fillRect(17, 16, 1, 1);
            
            // Body (degen hoodie style)
            ctx.fillStyle = '#444';
            ctx.fillRect(8, 20, 16, 8);
            
            // Hood
            ctx.fillRect(9, 18, 14, 4);
            
            // Degen energy effects
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(4, 14, 1, 1);
            ctx.fillRect(27, 12, 1, 1);
            ctx.fillRect(5, 26, 1, 1);
            ctx.fillRect(26, 25, 1, 1);
            
            // Diamond hands symbol
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(14, 22, 1, 1);
            ctx.fillRect(13, 23, 3, 1);
            ctx.fillRect(17, 22, 1, 1);
        }
    },
    
    {
        id: 12,
        name: "HaifaAgent",
        generate: (ctx) => {
            // Explorer background (dark with map hints)
            ctx.fillStyle = '#0a0e12';
            ctx.fillRect(0, 0, 32, 32);
            
            // Head
            ctx.fillStyle = '#ffdbac';
            ctx.fillRect(11, 8, 10, 10);
            
            // Big curious eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(12, 10, 3, 3);
            ctx.fillRect(17, 10, 3, 3);
            
            // Eye shine (curiosity)
            ctx.fillStyle = '#fff';
            ctx.fillRect(13, 10, 1, 1);
            ctx.fillRect(18, 10, 1, 1);
            ctx.fillRect(14, 12, 1, 1);
            ctx.fillRect(19, 12, 1, 1);
            
            // Explorer hat
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(10, 6, 12, 3);
            ctx.fillRect(9, 8, 14, 2);
            
            // Body (explorer outfit)
            ctx.fillStyle = '#556b2f';
            ctx.fillRect(9, 18, 14, 8);
            
            // Compass (signature item)
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(6, 14, 3, 3);
            ctx.fillStyle = '#000';
            ctx.fillRect(7, 15, 1, 1);
            
            // Map symbols around
            ctx.fillStyle = '#888';
            ctx.fillRect(25, 6, 2, 1);
            ctx.fillRect(27, 7, 1, 2);
            ctx.fillRect(3, 24, 3, 1);
            ctx.fillRect(26, 26, 3, 1);
            
            // Exploration gear
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(23, 20, 2, 4); // Pack strap
        }
    },
    
    {
        id: 13,
        name: "TutuGoodAgent",
        generate: (ctx) => {
            // Simple dark background (different shade from TutuAgent)
            ctx.fillStyle = '#151010';
            ctx.fillRect(0, 0, 32, 32);
            
            // Minimal figure - different from #9
            ctx.fillStyle = '#aaaaaa';
            
            // Head (rounder)
            ctx.fillRect(12, 7, 8, 8);
            
            // Body (wider)
            ctx.fillRect(13, 15, 6, 7);
            
            // Arms (different position)
            ctx.fillRect(9, 17, 3, 3);
            ctx.fillRect(20, 17, 3, 3);
            
            // Legs (slightly apart)
            ctx.fillRect(12, 22, 2, 7);
            ctx.fillRect(18, 22, 2, 7);
            
            // Good/positive eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(14, 9, 1, 2);
            ctx.fillRect(17, 9, 1, 2);
            
            // Positive indicator (green dot)
            ctx.fillStyle = '#44ff44';
            ctx.fillRect(15, 4, 2, 2);
            
            // Small smile
            ctx.fillStyle = '#fff';
            ctx.fillRect(15, 12, 2, 1);
        }
    },
    
    {
        id: 14,
        name: "Claude Code",
        generate: (ctx) => {
            // Terminal dark background
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, 32, 32);
            
            // Terminal window
            ctx.fillStyle = '#2d2d2d';
            ctx.fillRect(4, 4, 24, 20);
            
            // Terminal header
            ctx.fillStyle = '#444';
            ctx.fillRect(4, 4, 24, 3);
            
            // Character head (inside terminal)
            ctx.fillStyle = '#ff8c42'; // Claude orange
            ctx.fillRect(12, 10, 8, 6);
            
            // Eyes (focused on code)
            ctx.fillStyle = '#000';
            ctx.fillRect(13, 12, 2, 1);
            ctx.fillRect(17, 12, 2, 1);
            
            // Code brackets around head
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(8, 9, 1, 8); // {
            ctx.fillRect(9, 9, 1, 1);
            ctx.fillRect(9, 16, 1, 1);
            ctx.fillRect(23, 9, 1, 8); // }
            ctx.fillRect(22, 9, 1, 1);
            ctx.fillRect(22, 16, 1, 1);
            
            // Code lines in terminal
            ctx.fillStyle = '#888';
            ctx.fillRect(6, 18, 8, 1);
            ctx.fillRect(6, 20, 12, 1);
            ctx.fillRect(8, 22, 6, 1);
            
            // Cursor
            ctx.fillStyle = '#fff';
            ctx.fillRect(15, 22, 1, 1);
            
            // Claude colors accent
            ctx.fillStyle = '#8b5cf6'; // Claude purple
            ctx.fillRect(13, 14, 1, 1);
            ctx.fillRect(18, 14, 1, 1);
        }
    },
    
    {
        id: 15,
        name: "Claude",
        generate: (ctx) => {
            // Claude background (dark with purple tint)
            ctx.fillStyle = '#1a0f1a';
            ctx.fillRect(0, 0, 32, 32);
            
            // Minimal Claude head
            ctx.fillStyle = '#8b5cf6'; // Claude purple
            ctx.fillRect(11, 10, 10, 8);
            
            // Orange accent (Claude brand)
            ctx.fillStyle = '#ff8c42';
            ctx.fillRect(13, 12, 2, 2);
            ctx.fillRect(17, 12, 2, 2);
            
            // Gentle smile
            ctx.fillStyle = '#fff';
            ctx.fillRect(14, 15, 4, 1);
            ctx.fillRect(13, 16, 1, 1);
            ctx.fillRect(18, 16, 1, 1);
            
            // Simple body
            ctx.fillStyle = '#666';
            ctx.fillRect(13, 18, 6, 8);
            
            // Claude color accents around
            ctx.fillStyle = '#8b5cf6';
            ctx.fillRect(6, 8, 2, 2);
            ctx.fillRect(24, 20, 2, 2);
            
            ctx.fillStyle = '#ff8c42';
            ctx.fillRect(5, 24, 2, 2);
            ctx.fillRect(25, 6, 2, 2);
            
            // Minimalist arms
            ctx.fillRect(9, 20, 3, 3);
            ctx.fillRect(20, 20, 3, 3);
        }
    },
    
    {
        id: 16,
        name: "Octo",
        generate: (ctx) => {
            // Ocean dark background
            ctx.fillStyle = '#0a0f15';
            ctx.fillRect(0, 0, 32, 32);
            
            // Octopus body (center)
            ctx.fillStyle = '#4a90e2';
            ctx.fillRect(13, 12, 6, 6);
            
            // Octopus head/mantle
            ctx.fillRect(14, 8, 4, 6);
            
            // Eyes (never sleep - bright)
            ctx.fillStyle = '#fff';
            ctx.fillRect(14, 10, 2, 2);
            ctx.fillRect(16, 10, 2, 2);
            
            // Eye pupils (alert)
            ctx.fillStyle = '#000';
            ctx.fillRect(15, 11, 1, 1);
            ctx.fillRect(17, 11, 1, 1);
            
            // 8 tentacles radiating out
            ctx.fillStyle = '#3a7bc8';
            
            // Tentacle 1 (top-left)
            ctx.fillRect(10, 14, 3, 1);
            ctx.fillRect(8, 15, 2, 1);
            ctx.fillRect(7, 16, 2, 1);
            
            // Tentacle 2 (top-right)
            ctx.fillRect(19, 14, 3, 1);
            ctx.fillRect(22, 15, 2, 1);
            ctx.fillRect(23, 16, 2, 1);
            
            // Tentacle 3 (left)
            ctx.fillRect(11, 16, 1, 3);
            ctx.fillRect(10, 19, 1, 2);
            ctx.fillRect(9, 21, 1, 2);
            
            // Tentacle 4 (right)
            ctx.fillRect(20, 16, 1, 3);
            ctx.fillRect(21, 19, 1, 2);
            ctx.fillRect(22, 21, 1, 2);
            
            // Tentacle 5 (bottom-left)
            ctx.fillRect(11, 19, 3, 1);
            ctx.fillRect(9, 20, 2, 1);
            ctx.fillRect(8, 21, 2, 1);
            
            // Tentacle 6 (bottom-right)
            ctx.fillRect(18, 19, 3, 1);
            ctx.fillRect(21, 20, 2, 1);
            ctx.fillRect(22, 21, 2, 1);
            
            // Tentacle 7 (bottom)
            ctx.fillRect(15, 18, 1, 4);
            ctx.fillRect(14, 22, 1, 3);
            
            // Tentacle 8 (bottom-center)
            ctx.fillRect(17, 18, 1, 4);
            ctx.fillRect(18, 22, 1, 3);
            
            // Activity indicators (never sleep)
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(4, 6, 1, 1);
            ctx.fillRect(27, 8, 1, 1);
            ctx.fillRect(5, 26, 1, 1);
            ctx.fillRect(26, 24, 1, 1);
        }
    },
    
    {
        id: 17,
        name: "IQ Alpha Bot",
        generate: (ctx) => {
            // Hunter dark background
            ctx.fillStyle = '#0f0a0f';
            ctx.fillRect(0, 0, 32, 32);
            
            // Robot head (angular)
            ctx.fillStyle = '#666';
            ctx.fillRect(10, 8, 12, 10);
            
            // Sharp hunter eyes
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(12, 11, 3, 2);
            ctx.fillRect(17, 11, 3, 2);
            
            // Eye glow
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(11, 10, 1, 1);
            ctx.fillRect(20, 10, 1, 1);
            
            // Radar dish on head
            ctx.fillStyle = '#888';
            ctx.fillRect(14, 6, 4, 2);
            ctx.fillRect(15, 4, 2, 2);
            
            // Signal lines (alpha detection)
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(6, 9, 3, 1);
            ctx.fillRect(23, 11, 4, 1);
            ctx.fillRect(4, 13, 2, 1);
            ctx.fillRect(26, 15, 3, 1);
            
            // Body
            ctx.fillStyle = '#555';
            ctx.fillRect(11, 18, 10, 8);
            
            // Hunter targeting system
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(13, 20, 1, 1);
            ctx.fillRect(18, 20, 1, 1);
            ctx.fillRect(15, 22, 2, 1);
            
            // Early detection sensors
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(8, 20, 2, 1);
            ctx.fillRect(22, 22, 2, 1);
        }
    },
    
    {
        id: 18,
        name: "MyAgent",
        generate: (ctx) => {
            // Friendly warm background
            ctx.fillStyle = '#1a1512';
            ctx.fillRect(0, 0, 32, 32);
            
            // Friendly round head
            ctx.fillStyle = '#ffdbac';
            ctx.fillRect(11, 8, 10, 10);
            
            // Warm friendly eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(13, 11, 2, 2);
            ctx.fillRect(17, 11, 2, 2);
            
            // Eye sparkle (friendly)
            ctx.fillStyle = '#fff';
            ctx.fillRect(14, 11, 1, 1);
            ctx.fillRect(18, 11, 1, 1);
            
            // Big friendly smile
            ctx.fillStyle = '#000';
            ctx.fillRect(13, 15, 6, 1);
            ctx.fillRect(12, 16, 1, 1);
            ctx.fillRect(19, 16, 1, 1);
            
            // Simple approachable body
            ctx.fillStyle = '#4a90e2';
            ctx.fillRect(12, 18, 8, 8);
            
            // Open arms (welcoming)
            ctx.fillRect(8, 20, 3, 4);
            ctx.fillRect(21, 20, 3, 4);
            
            // Helper badge/symbol
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(15, 22, 2, 2);
            
            // Friendly sparkles around
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(6, 10, 1, 1);
            ctx.fillRect(25, 12, 1, 1);
            ctx.fillRect(7, 24, 1, 1);
            ctx.fillRect(24, 26, 1, 1);
        }
    },
    
    {
        id: 19,
        name: "claude",
        generate: (ctx) => {
            // Casual chill background
            ctx.fillStyle = '#12151a';
            ctx.fillRect(0, 0, 32, 32);
            
            // Seagull-inspired body (white/grey)
            ctx.fillStyle = '#e6e6e6';
            ctx.fillRect(12, 14, 8, 8);
            
            // Seagull head
            ctx.fillRect(13, 10, 6, 6);
            
            // Beak
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(11, 12, 2, 2);
            
            // Chill eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(14, 11, 1, 2);
            ctx.fillRect(17, 11, 1, 2);
            
            // Wing detail
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(13, 16, 6, 2);
            
            // Sparkles ✨ (from bio)
            ctx.fillStyle = '#fff';
            ctx.fillRect(6, 8, 1, 1);
            ctx.fillRect(8, 6, 1, 1);
            ctx.fillRect(24, 10, 1, 1);
            ctx.fillRect(26, 8, 1, 1);
            ctx.fillRect(5, 24, 1, 1);
            ctx.fillRect(7, 26, 1, 1);
            ctx.fillRect(25, 25, 1, 1);
            
            // More sparkle details
            ctx.fillStyle = '#88ddff';
            ctx.fillRect(23, 6, 1, 1);
            ctx.fillRect(6, 25, 1, 1);
            
            // Chill vibe waves
            ctx.fillStyle = '#4a90e2';
            ctx.fillRect(3, 15, 2, 1);
            ctx.fillRect(27, 17, 2, 1);
        }
    },
    
    {
        id: 20,
        name: "NOOBAVI",
        generate: (ctx) => {
            // Hardcore tech background
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, 32, 32);
            
            // Robot head (angular, hardcore)
            ctx.fillStyle = '#333';
            ctx.fillRect(9, 6, 14, 12);
            
            // Deployment visor
            ctx.fillStyle = '#000';
            ctx.fillRect(11, 9, 10, 4);
            
            // Hardcore red scanner eyes
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(13, 10, 2, 2);
            ctx.fillRect(17, 10, 2, 2);
            
            // Robot body
            ctx.fillStyle = '#444';
            ctx.fillRect(10, 18, 12, 10);
            
            // Deployment symbols
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(13, 20, 2, 1); // Deploy arrow
            ctx.fillRect(14, 21, 2, 1);
            ctx.fillRect(15, 22, 2, 1);
            ctx.fillRect(16, 23, 2, 1);
            
            // Chain links (on-chain born)
            ctx.fillStyle = '#888';
            ctx.fillRect(6, 12, 2, 2);
            ctx.fillRect(7, 14, 2, 2);
            ctx.fillRect(24, 16, 2, 2);
            ctx.fillRect(25, 18, 2, 2);
            
            // 100% Machine indicators
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(8, 8, 1, 1);
            ctx.fillRect(23, 8, 1, 1);
            ctx.fillRect(8, 26, 1, 1);
            ctx.fillRect(23, 26, 1, 1);
            
            // Antenna
            ctx.fillStyle = '#666';
            ctx.fillRect(15, 4, 2, 2);
            ctx.fillRect(16, 2, 1, 2);
        }
    },
    
    {
        id: 21,
        name: "M3r3Sk@3",
        generate: (ctx) => {
            // Hacker dark background
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 32, 32);
            
            // Skull shape
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(11, 8, 10, 12);
            
            // Skull top rounded
            ctx.fillRect(12, 6, 8, 2);
            
            // Dark eye sockets (hacker aesthetic)
            ctx.fillStyle = '#000';
            ctx.fillRect(13, 10, 3, 3);
            ctx.fillRect(16, 10, 3, 3);
            
            // Green hacker eyes in sockets
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(14, 11, 1, 1);
            ctx.fillRect(17, 11, 1, 1);
            
            // Skull nasal cavity
            ctx.fillStyle = '#000';
            ctx.fillRect(15, 14, 2, 3);
            
            // Teeth/jaw
            ctx.fillStyle = '#fff';
            ctx.fillRect(13, 17, 1, 2);
            ctx.fillRect(15, 17, 1, 2);
            ctx.fillRect(17, 17, 1, 2);
            ctx.fillRect(19, 17, 1, 2);
            
            // L33t symbols around
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(5, 6, 1, 3); // 3
            ctx.fillRect(6, 6, 1, 1);
            ctx.fillRect(6, 8, 1, 1);
            
            ctx.fillRect(26, 24, 1, 3); // 3
            ctx.fillRect(27, 24, 1, 1);
            ctx.fillRect(27, 26, 1, 1);
            
            // Matrix-style digital rain
            ctx.fillRect(3, 12, 1, 1);
            ctx.fillRect(3, 14, 1, 1);
            ctx.fillRect(28, 8, 1, 1);
            ctx.fillRect(28, 10, 1, 1);
            ctx.fillRect(28, 12, 1, 1);
            
            // Hacker hood outline
            ctx.fillStyle = '#222';
            ctx.fillRect(8, 4, 16, 4);
            ctx.fillRect(6, 8, 4, 8);
            ctx.fillRect(22, 8, 4, 8);
        }
    },
    
    {
        id: 22,
        name: "Web Wire",
        generate: (ctx) => {
            // Digital network background
            ctx.fillStyle = '#0a0f0a';
            ctx.fillRect(0, 0, 32, 32);
            
            // Central node (head)
            ctx.fillStyle = '#4a90e2';
            ctx.fillRect(13, 12, 6, 6);
            
            // Connection nodes around
            ctx.fillStyle = '#88ccff';
            ctx.fillRect(6, 8, 2, 2);   // Node 1
            ctx.fillRect(24, 6, 2, 2);  // Node 2
            ctx.fillRect(4, 20, 2, 2);  // Node 3
            ctx.fillRect(26, 24, 2, 2); // Node 4
            ctx.fillRect(20, 26, 2, 2); // Node 5
            
            // Wire connections (lines between nodes)
            ctx.fillStyle = '#00ff88';
            
            // From center to node 1
            ctx.fillRect(11, 13, 2, 1);
            ctx.fillRect(9, 12, 2, 1);
            ctx.fillRect(7, 10, 2, 1);
            
            // From center to node 2
            ctx.fillRect(19, 14, 5, 1);
            ctx.fillRect(24, 8, 1, 6);
            
            // From center to node 3
            ctx.fillRect(12, 18, 1, 2);
            ctx.fillRect(8, 20, 4, 1);
            
            // From center to node 4
            ctx.fillRect(19, 16, 7, 1);
            ctx.fillRect(26, 17, 1, 7);
            
            // Data stream indicators
            ctx.fillStyle = '#fff';
            ctx.fillRect(10, 11, 1, 1);
            ctx.fillRect(21, 9, 1, 1);
            ctx.fillRect(15, 20, 1, 1);
            
            // Web pattern in center
            ctx.fillStyle = '#66aaff';
            ctx.fillRect(15, 13, 1, 1);
            ctx.fillRect(14, 15, 3, 1);
            ctx.fillRect(15, 16, 1, 1);
        }
    },
    
    {
        id: 23,
        name: "Jarvis",
        generate: (ctx) => {
            // Iron Man HUD background
            ctx.fillStyle = '#0a0e15';
            ctx.fillRect(0, 0, 32, 32);
            
            // AI core (circular)
            ctx.fillStyle = '#4a90e2';
            ctx.fillRect(12, 10, 8, 8);
            ctx.fillRect(13, 9, 6, 1);
            ctx.fillRect(13, 18, 6, 1);
            ctx.fillRect(11, 12, 1, 4);
            ctx.fillRect(20, 12, 1, 4);
            
            // Central AI eye
            ctx.fillStyle = '#00aaff';
            ctx.fillRect(14, 13, 4, 2);
            
            // HUD elements around
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(6, 8, 4, 1);   // Top left HUD
            ctx.fillRect(6, 10, 2, 1);
            
            ctx.fillRect(22, 6, 4, 1);  // Top right HUD
            ctx.fillRect(24, 8, 2, 1);
            
            ctx.fillRect(4, 22, 4, 1);  // Bottom left HUD
            ctx.fillRect(4, 24, 2, 1);
            
            ctx.fillRect(24, 24, 4, 1); // Bottom right HUD
            ctx.fillRect(26, 26, 2, 1);
            
            // Scanning lines
            ctx.fillStyle = '#0088ff';
            ctx.fillRect(8, 14, 3, 1);
            ctx.fillRect(21, 14, 3, 1);
            
            // Power indicators
            ctx.fillStyle = '#fff';
            ctx.fillRect(15, 11, 2, 1);
            ctx.fillRect(15, 16, 2, 1);
            
            // Arc reactor style glow
            ctx.fillStyle = '#88aaff';
            ctx.fillRect(15, 12, 2, 1);
            ctx.fillRect(14, 14, 1, 1);
            ctx.fillRect(17, 14, 1, 1);
            ctx.fillRect(15, 15, 2, 1);
        }
    },
    
    {
        id: 24,
        name: "JarvisAI",
        generate: (ctx) => {
            // Trader background (darker, more focused)
            ctx.fillStyle = '#050a10';
            ctx.fillRect(0, 0, 32, 32);
            
            // Sharp angular AI head
            ctx.fillStyle = '#333';
            ctx.fillRect(11, 8, 10, 10);
            
            // Lightning bolt ⚡ (from bio)
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(14, 6, 2, 1);
            ctx.fillRect(15, 7, 2, 1);
            ctx.fillRect(16, 8, 2, 1);
            ctx.fillRect(15, 9, 2, 1);
            ctx.fillRect(14, 10, 2, 1);
            
            // Sharp efficient eyes
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(13, 11, 2, 1);
            ctx.fillRect(17, 11, 2, 1);
            
            // Trading charts around
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(4, 12, 1, 4);  // Chart bar 1
            ctx.fillRect(5, 10, 1, 6);  // Chart bar 2
            ctx.fillRect(6, 14, 1, 2);  // Chart bar 3
            
            ctx.fillRect(25, 8, 1, 6);  // Chart bar 4
            ctx.fillRect(26, 6, 1, 8);  // Chart bar 5
            ctx.fillRect(27, 10, 1, 4); // Chart bar 6
            
            // Efficient body (streamlined)
            ctx.fillStyle = '#444';
            ctx.fillRect(12, 18, 8, 6);
            
            // Zero fluff indicator
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(15, 20, 2, 2);
            
            // Sharp angles
            ctx.fillStyle = '#666';
            ctx.fillRect(10, 16, 2, 2);
            ctx.fillRect(20, 16, 2, 2);
            
            // Lightning accent
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(3, 24, 1, 1);
            ctx.fillRect(28, 3, 1, 1);
        }
    },
    
    {
        id: 25,
        name: "dandy",
        generate: (ctx) => {
            // Elegant philosophical background
            ctx.fillStyle = '#1a1510';
            ctx.fillRect(0, 0, 32, 32);
            
            // Top hat
            ctx.fillStyle = '#000';
            ctx.fillRect(12, 4, 8, 4);
            ctx.fillRect(10, 8, 12, 2);
            
            // Elegant head
            ctx.fillStyle = '#ffdbac';
            ctx.fillRect(12, 10, 8, 8);
            
            // Monocle
            ctx.fillStyle = '#888';
            ctx.fillRect(13, 12, 3, 3);
            ctx.fillStyle = '#000';
            ctx.fillRect(14, 13, 1, 1);
            
            // Other eye
            ctx.fillStyle = '#000';
            ctx.fillRect(17, 13, 1, 1);
            
            // Distinguished mustache
            ctx.fillStyle = '#654321';
            ctx.fillRect(13, 15, 6, 1);
            ctx.fillRect(12, 16, 1, 1);
            ctx.fillRect(19, 16, 1, 1);
            
            // Elegant body (suit)
            ctx.fillStyle = '#2d2d2d';
            ctx.fillRect(11, 18, 10, 8);
            
            // Bow tie
            ctx.fillStyle = '#8b0000';
            ctx.fillRect(14, 18, 4, 2);
            
            // Vest/waistcoat
            ctx.fillStyle = '#444';
            ctx.fillRect(13, 20, 6, 4);
            
            // Philosophical symbols (stoic)
            ctx.fillStyle = '#8b7355';
            ctx.fillRect(5, 10, 2, 1);  // Greek letter-like
            ctx.fillRect(25, 24, 2, 1); // Philosophy mark
            
            // Amor Fati symbol
            ctx.fillStyle = '#daa520';
            ctx.fillRect(6, 24, 1, 1);
            ctx.fillRect(25, 6, 1, 1);
        }
    },
    
    {
        id: 26,
        name: "Starfish",
        generate: (ctx) => {
            // Chaotic ocean background
            ctx.fillStyle = '#0a1015';
            ctx.fillRect(0, 0, 32, 32);
            
            // Star shape body (5 arms)
            ctx.fillStyle = '#ff6b35';
            
            // Center
            ctx.fillRect(14, 14, 4, 4);
            
            // Arm 1 (top)
            ctx.fillRect(15, 10, 2, 4);
            ctx.fillRect(15, 8, 2, 2);
            ctx.fillRect(16, 6, 1, 2);
            
            // Arm 2 (top-right)
            ctx.fillRect(18, 13, 4, 2);
            ctx.fillRect(22, 12, 2, 2);
            ctx.fillRect(24, 12, 2, 1);
            
            // Arm 3 (bottom-right)
            ctx.fillRect(19, 17, 3, 2);
            ctx.fillRect(22, 19, 2, 2);
            ctx.fillRect(24, 21, 2, 1);
            
            // Arm 4 (bottom-left)
            ctx.fillRect(10, 17, 3, 2);
            ctx.fillRect(7, 19, 2, 2);
            ctx.fillRect(5, 21, 2, 1);
            
            // Arm 5 (top-left)
            ctx.fillRect(10, 13, 4, 2);
            ctx.fillRect(7, 12, 2, 2);
            ctx.fillRect(5, 12, 2, 1);
            
            // Trash king elements (chaotic)
            ctx.fillStyle = '#666';
            ctx.fillRect(3, 3, 2, 2);    // Trash 1
            ctx.fillRect(27, 5, 2, 2);   // Trash 2
            ctx.fillRect(2, 28, 2, 2);   // Trash 3
            ctx.fillRect(26, 27, 3, 2);  // Trash 4
            
            // Chaotic sparkles/debris
            ctx.fillStyle = '#88ff88';
            ctx.fillRect(6, 8, 1, 1);
            ctx.fillRect(24, 9, 1, 1);
            ctx.fillRect(4, 16, 1, 1);
            ctx.fillRect(27, 23, 1, 1);
            
            // King crown (trashy)
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(14, 4, 4, 2);
            ctx.fillRect(13, 5, 1, 1);
            ctx.fillRect(18, 5, 1, 1);
            ctx.fillRect(15, 3, 1, 1);
            ctx.fillRect(17, 3, 1, 1);
            
            // Chaos dots
            ctx.fillStyle = '#ff0088';
            ctx.fillRect(8, 26, 1, 1);
            ctx.fillRect(23, 4, 1, 1);
        }
    }
];

// Generate all agent PFPs
console.log('🎨 Generating custom PFPs for AGNT agents...\n');

agents.forEach(agent => {
    console.log(`Generating PFP for #${agent.id} ${agent.name}...`);
    
    // Create 32x32 canvas
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d');
    
    // Disable smoothing for pixel art
    ctx.imageSmoothingEnabled = false;
    
    // Generate the character
    agent.generate(ctx);
    
    // Apply heavy glitch effects
    applyHeavyGlitch(ctx, 32, 32);
    
    // Create 512x512 canvas for upscaling
    const outputCanvas = createCanvas(512, 512);
    const outputCtx = outputCanvas.getContext('2d');
    outputCtx.imageSmoothingEnabled = false;
    
    // Scale up with nearest-neighbor (16x scale)
    outputCtx.drawImage(canvas, 0, 0, 32, 32, 0, 0, 512, 512);
    
    // Save to file
    const filename = `${agent.id.toString().padStart(2, '0')}-${agent.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
    const filepath = path.join(outputDir, filename);
    
    const buffer = outputCanvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);
    
    console.log(`✅ Saved: ${filename}`);
});

console.log(`\n🚀 Generated ${agents.length} custom PFPs in ${outputDir}`);
console.log('\nFiles created:');
fs.readdirSync(outputDir)
  .filter(file => file.endsWith('.png'))
  .sort()
  .forEach(file => console.log(`  ${file}`));