// This is a simple script to generate icon files in different sizes
// You can run this with Node.js after installing the canvas package:
// npm install canvas
// node create_icons.js

const { createCanvas } = require('canvas');
const fs = require('fs');

// Sizes to generate
const sizes = [16, 48, 128];

// Generate icons for each size
sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#4285f4';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();
  
  // Letter 'm'
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('m', size/2, size/2 + size*0.05);
  
  // Save the file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icon${size}.png`, buffer);
  
  console.log(`Created icon${size}.png`);
});

console.log('Icon generation complete!'); 