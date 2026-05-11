/**
 * inject-web.js — Post-build: inyecta splash + fix iOS zoom + PWA meta tags en dist/index.html
 *                 Copia web-static/{manifest.json,sw.js} a dist/
 * Uso: node scripts/inject-web.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT      = path.join(__dirname, "..");
const DIST      = path.join(ROOT, "dist");
const STATIC    = path.join(ROOT, "web-static");
const distFile  = path.join(DIST, "index.html");

// ── Copiar archivos estáticos de web-static/ a dist/ ────────────
for (const file of ["manifest.json", "sw.js"]) {
  const src  = path.join(STATIC, file);
  const dest = path.join(DIST, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copiado: web-static/${file} → dist/${file}`);
  } else {
    console.warn(`⚠ No encontrado: ${src}`);
  }
}

let html = fs.readFileSync(distFile, "utf8");

// ── 1. Fix iOS zoom (inputs con font-size < 16px disparan auto-zoom en Safari)
const iosZoomFix = `
  <style id="ios-zoom-fix">
    @supports (-webkit-touch-callout: none) {
      input, textarea, select { font-size: 16px !important; }
    }
  </style>`;

// ── 2. Google Fonts para el splash
const fonts = `
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;700&family=JetBrains+Mono&display=swap" rel="stylesheet" />`;

// ── 3. Splash CSS
const splashCSS = `
  <style id="eco-splash-css">
    .eco-splash{position:fixed;inset:0;background:#1B5E20;display:flex;align-items:center;
      justify-content:center;z-index:9999;overflow:hidden;
      animation:eco-out .7s cubic-bezier(.4,0,.2,1) 2.4s forwards}
    .eco-bg-arcs{position:absolute;inset:0;pointer-events:none}
    .eco-arc{fill:none;stroke:rgba(255,255,255,.08);stroke-width:0;
      animation:eco-pulse 1.4s cubic-bezier(.4,0,.2,1) .05s forwards}
    .eco-center{display:flex;flex-direction:column;align-items:center;gap:22px;
      opacity:0;transform:scale(.85);
      animation:eco-pop .7s cubic-bezier(.4,0,.2,1) .15s forwards}
    .eco-mark{width:140px;height:140px;overflow:visible}
    .eco-leaf,.eco-vein,.eco-arc-in,.eco-arc-out{
      fill:none;stroke:#fff;stroke-linejoin:round;stroke-linecap:round;
      pathLength:100;stroke-dasharray:100;stroke-dashoffset:100}
    .eco-leaf{stroke-width:4;
      animation:eco-draw .7s cubic-bezier(.4,0,.2,1) .4s forwards,
                eco-fill  .5s cubic-bezier(.4,0,.2,1) 1.6s forwards}
    .eco-vein{stroke-width:3;
      animation:eco-draw   .4s cubic-bezier(.4,0,.2,1) .8s forwards,
                eco-invert .5s cubic-bezier(.4,0,.2,1) 1.6s forwards}
    .eco-arc-in{stroke-width:6.5;
      animation:eco-draw   .4s cubic-bezier(.4,0,.2,1) 1s forwards,
                eco-invert .5s cubic-bezier(.4,0,.2,1) 1.6s forwards}
    .eco-arc-out{stroke-width:6.5;
      animation:eco-draw   .4s cubic-bezier(.4,0,.2,1) 1.2s forwards,
                eco-invert .5s cubic-bezier(.4,0,.2,1) 1.6s forwards}
    .eco-dot{fill:#7CB342;opacity:0;
      animation:eco-fade .3s cubic-bezier(.4,0,.2,1) 1.4s forwards}
    .eco-wm{font-family:Outfit,sans-serif;color:#fff;font-size:32px;letter-spacing:2px;
      opacity:0;transform:translateY(8px);
      animation:eco-rise .5s cubic-bezier(.4,0,.2,1) 1.8s forwards}
    .eco-wm b{font-weight:700}.eco-wm span{font-weight:300}
    .eco-tag{font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,.7);
      font-size:10px;letter-spacing:6px;text-transform:uppercase;
      opacity:0;transform:translateY(8px);
      animation:eco-rise .5s cubic-bezier(.4,0,.2,1) 2s forwards}
    @keyframes eco-pulse{0%{stroke-width:0;opacity:.5}50%{stroke-width:32;opacity:.18}100%{stroke-width:60;opacity:0}}
    @keyframes eco-pop{to{opacity:1;transform:scale(1)}}
    @keyframes eco-draw{to{stroke-dashoffset:0}}
    @keyframes eco-fill{to{fill:#fff}}
    @keyframes eco-invert{to{stroke:#1B5E20}}
    @keyframes eco-fade{to{opacity:1}}
    @keyframes eco-rise{to{opacity:1;transform:translateY(0)}}
    @keyframes eco-out{to{opacity:0;transform:translateY(-30px);visibility:hidden}}
  </style>`;

// ── 4. Splash HTML + script de limpieza
const splashHTML = `
  <!-- EcoGuardian splash screen -->
  <div id="eco-splash" class="eco-splash">
    <svg class="eco-bg-arcs" viewBox="0 0 380 800" preserveAspectRatio="xMidYMid slice">
      <circle class="eco-arc" cx="380" cy="0" r="180"/>
      <circle class="eco-arc" cx="380" cy="0" r="280" style="animation-delay:.2s"/>
      <circle class="eco-arc" cx="380" cy="0" r="380" style="animation-delay:.4s"/>
    </svg>
    <div class="eco-center">
      <svg class="eco-mark" viewBox="0 0 200 200">
        <path class="eco-leaf"    d="M 100 30 Q 155 70 155 120 Q 155 165 100 185 Q 45 165 45 120 Q 45 70 100 30 Z"/>
        <line class="eco-vein"    x1="100" y1="50" x2="100" y2="172"/>
        <path class="eco-arc-in"  d="M 78 95  Q 100 82 122 95"/>
        <path class="eco-arc-out" d="M 70 78  Q 100 60 130 78"/>
        <circle class="eco-dot"   cx="100" cy="48" r="5"/>
      </svg>
      <div class="eco-wm"><b>eco</b><span>guardian</span></div>
      <div class="eco-tag">naturaleza · iot</div>
    </div>
  </div>
  <script>setTimeout(function(){var s=document.getElementById('eco-splash');if(s)s.remove();},3200);</script>`;

// ── 5. PWA meta tags + registro del Service Worker ──────────────
const pwaTags = `
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#1B5E20">
  <link rel="apple-touch-icon" href="/assets/pwa/apple-touch-icon.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="EcoGuardian">
  <script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(console.error);});}</script>`;

// ── Inyección en el HTML generado por Expo ─────────────────────
html = html.replace("</head>", `${iosZoomFix}${fonts}${splashCSS}${pwaTags}\n</head>`);
html = html.replace('<div id="root"></div>', `${splashHTML}\n  <div id="root"></div>`);

fs.writeFileSync(distFile, html, "utf8");
console.log("✓ inject-web.js: splash + iOS zoom fix + PWA meta tags inyectados en dist/index.html");
