/**
 * reset-demo.js — Limpia Firebase antes de la demostración
 *
 * Borra:
 *   estaciones/estacion_01   → datos actuales del sensor
 *   historial/estacion_01    → lecturas históricas
 *   alertas                  → alertas pasadas
 *
 * Uso:
 *   node scripts/reset-demo.js
 *
 * Si quieres resetear el onboarding de un usuario específico:
 *   node scripts/reset-demo.js --uid <UID_DEL_USUARIO>
 */

require("dotenv").config();
const https = require("https");

const DB_URL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;

if (!DB_URL) {
  console.error("❌ No se encontró EXPO_PUBLIC_FIREBASE_DATABASE_URL en .env");
  process.exit(1);
}

// Arg opcional: --uid <uid> para resetear onboarding de un usuario
const uidIdx = process.argv.indexOf("--uid");
const resetUid = uidIdx !== -1 ? process.argv[uidIdx + 1] : null;

function request(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${DB_URL}/${path}.json`);
    const opts = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method,
      headers:  { "Content-Type": "application/json" },
    };
    const req = https.request(opts, res => {
      let data = "";
      res.on("data", c => (data += c));
      res.on("end", () => {
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        if (ok) resolve(data);
        else reject(new Error(`HTTP ${res.statusCode} en /${path}: ${data}`));
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function del(path) {
  await request(path, "DELETE");
  console.log(`  ✓ /${path} eliminado`);
}

async function patch(path, body) {
  await request(path, "PATCH", body);
  console.log(`  ✓ /${path} actualizado`);
}

async function main() {
  console.log("\n🧹 EcoGuardian — Reset de demo\n");
  console.log(`Base de datos: ${DB_URL}\n`);

  try {
    console.log("1. Limpiando datos del sensor...");
    await del("estaciones/estacion_01");

    console.log("2. Limpiando historial...");
    await del("historial/estacion_01");

    console.log("3. Limpiando alertas...");
    await del("alertas");

    if (resetUid) {
      console.log(`4. Reseteando onboarding del usuario ${resetUid}...`);
      // Requiere auth — solo funciona si las reglas lo permiten para ese uid
      // Para uso en consola de Firebase es más confiable
      console.log("   ⚠ El reset de onboarding requiere auth — hazlo desde Firebase Console:");
      console.log(`   → usuarios/${resetUid}/onboardingCompleto = false`);
      console.log(`   → usuarios/${resetUid}/estaciones = (eliminar nodo)`);
    }

    console.log("\n✅ Base de datos lista para el demo.");
    console.log("\nPróximos pasos:");
    console.log("  1. Flashea el firmware al ESP32 (ver instrucciones abajo)");
    console.log("  2. Enciende el ESP32 → aparece hotspot 'EcoGuardian-Config'");
    console.log("  3. Conéctate al hotspot desde el celular → configura la red WiFi del demo");
    console.log("  4. El ESP32 empieza a enviar datos a Firebase");
    console.log("  5. Abre la webapp → crea cuenta nueva → selecciona estacion_01 → ¡listo!\n");
  } catch (e) {
    console.error("\n❌ Error:", e.message);
    console.log("\nSi ves HTTP 401/403, borra los nodos manualmente en Firebase Console:");
    console.log("  https://console.firebase.google.com/project/ecoguardian-68553/database");
    process.exit(1);
  }
}

main();
