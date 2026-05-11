/**
 * generate-icons.js — Genera los íconos PNG para la PWA EcoGuardian
 * Uso: node scripts/generate-icons.js
 * Requiere: @resvg/resvg-js (npm install --save-dev @resvg/resvg-js)
 */
const fs   = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const OUT_DIR = path.join(__dirname, "..", "dist", "assets", "pwa");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── SVG logo EcoGuardian (viewBox 0 0 200 200) ──────────────────
function makeSvg(size, logoScale) {
  const center   = size / 2;
  const logoSize = size * logoScale;           // tamaño del logo dentro del canvas
  const half     = logoSize / 2;
  const scale    = logoSize / 200;             // escala del path (viewBox 200×200)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Fondo -->
  <rect width="${size}" height="${size}" fill="#1B5E20"/>
  <!-- Logo centrado (transform: translate + scale) -->
  <g transform="translate(${center - half * 1}, ${center - half * 1}) scale(${scale})">
    <!-- Hoja-escudo -->
    <path d="M 100 30 Q 155 70 155 120 Q 155 165 100 185 Q 45 165 45 120 Q 45 70 100 30 Z"
          fill="none" stroke="#ffffff" stroke-width="4"
          stroke-linejoin="round" stroke-linecap="round"/>
    <!-- Nervio central -->
    <line x1="100" y1="50" x2="100" y2="172"
          stroke="#ffffff" stroke-width="3"
          stroke-linecap="round"/>
    <!-- Arco WiFi interno -->
    <path d="M 78 95 Q 100 82 122 95"
          fill="none" stroke="#ffffff" stroke-width="6.5"
          stroke-linecap="round"/>
    <!-- Arco WiFi externo -->
    <path d="M 70 78 Q 100 60 130 78"
          fill="none" stroke="#ffffff" stroke-width="6.5"
          stroke-linecap="round"/>
    <!-- Punto acento verde -->
    <circle cx="100" cy="48" r="5" fill="#7CB342"/>
  </g>
</svg>`;
}

const icons = [
  { file: "icon-192.png",          size: 192, scale: 0.75 },
  { file: "icon-512.png",          size: 512, scale: 0.75 },
  { file: "icon-maskable-512.png", size: 512, scale: 0.60 },
  { file: "apple-touch-icon.png",  size: 180, scale: 0.75 },
];

for (const { file, size, scale } of icons) {
  const svg  = makeSvg(size, scale);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
  });
  const png  = resvg.render().asPng();
  const dest = path.join(OUT_DIR, file);
  fs.writeFileSync(dest, png);
  console.log(`✓ ${file}  (${size}×${size}, logo ${Math.round(scale * 100)}%)`);
}

console.log(`\nIconos generados en: ${OUT_DIR}`);
