# EcoGuardian — Contexto para Claude Code
# Última actualización: 13 mayo 2026

---

## Deploy — ORDEN OBLIGATORIO (no saltarse pasos)
```
npx expo export --platform web
node scripts/generate-icons.js
node scripts/inject-web.js
firebase deploy --only hosting
```
`expo export` borra `dist/` completo cada vez.
Sin `inject-web.js` → splash desaparece. Sin `generate-icons.js` → íconos PWA se pierden.
**Siempre los tres, en ese orden, después del export.**

Para reglas de BD solamente:
```
firebase deploy --only database
```

---

## Qué NO tocar sin razón
- `scripts/inject-web.js` y `scripts/generate-icons.js` — críticos para PWA
- `ScreenSplash.js` — animación de entrada, no modificar
- `hooks/useAuth.js` — auth funciona completo
- `constants/firebase.js` — credenciales Firebase públicas por diseño (las reglas las protegen)
- `database.rules.json` — ver nota abajo antes de tocar

### database.rules.json — reglas intencionales
- `estaciones.$stationId.write: true` — intencional: ESP32 escribe sin autenticación
- `historial.$stationId.write: "!newData.exists()"` — solo permite BORRAR el nodo completo (cuando se borra, `newData.exists()=false`). Los registros individuales sí se escriben vía `$timestamp.write: true`
- `usuarios.$uid.write` — admin puede escribir en perfiles ajenos (necesario para resetearDemo)

---

## Arquitectura principal
```
App.js
 ├── ScreenSplash (animación inicial)
 ├── ScreenLogin (!user) — 3 modos: login / registro / olvidé contraseña
 ├── ScreenOnboarding (!onboardingCompleto && !isAdmin)
 └── AppLayout  ←  envuelto en StationProvider
      ├── Header — dropdown estación (via StationContext)
      ├── ScreenDashboard   ← usa selectedId de StationContext
      ├── ScreenMapa        ← usa activeId de StationContext (NO tiene estado propio)
      ├── ScreenComunidad   ← texto OK, foto pendiente (necesita Blaze/Storage)
      ├── ScreenAlertas     ← ExplorerGate para exploradores
      ├── ScreenHistorial   ← ExplorerGate para exploradores
      ├── ScreenAdmin       ← solo admin, cards expandibles
      └── ScreenAjustes     ← botón "Ver tienda" solo para admin
```

### StationContext (`context/StationContext.js`)
Estado global de estación activa compartido entre TODAS las pantallas.
- `selectedId` / `setSelectedId` — estación activa
- `stationLabel(id)` — nombre legible ("Estación N" para nombres firmware default)

**Admin:** ve todas las estaciones via `useStations()`.
**Usuario:** solo sus propias (`perfil.estaciones`).
**ScreenMapa usa `activeId = selectedId || lista[0]?.[0]`** — nunca tiene `useState` propio para esto.

---

## IDs de estación — regla absoluta
Formato: `estacion_{últimos3bytes_MAC}` — ej. `estacion_ddeeff`
- **NUNCA hardcodear `estacion_01` ni ningún ID fijo**
- El firmware genera el ID desde el eFuse MAC del ESP32 con `ESP.getEfuseMac()`
- `isDefaultFirmwareName()` en `utils/helpers.js` detecta `EcoG [A-F0-9]{6}` → muestra "Estación N"

---

## Hooks clave
- `useStations()` → todas las estaciones en tiempo real (para admin)
- `useStation(id)` → una estación en tiempo real + tick 30s para indicador online/offline
- `useAuth()` → `{ user, perfil, isAdmin, loading, login, logout, register }`

## Roles
- `admin` — todas las estaciones, bypasea onboarding, no ve "Vincular dispositivo"
- `usuario` — solo sus estaciones (`perfil.estaciones`), pasa onboarding
- `explorador` — onboarding completo sin estación: ve mapa y comunidad, ExplorerGate en alertas/historial

---

## Firmware ESP32 — lecciones aprendidas (no repetir)

### Generar ID desde MAC
```cpp
// CORRECTO — ESP.getEfuseMac() siempre disponible, no depende del stack WiFi
WiFi.mode(WIFI_STA);
uint64_t efuseMac = ESP.getEfuseMac();
char macHex[13];
snprintf(macHex, sizeof(macHex), "%02x%02x%02x%02x%02x%02x",
  (uint8_t)(efuseMac),        (uint8_t)(efuseMac >> 8),
  (uint8_t)(efuseMac >> 16),  (uint8_t)(efuseMac >> 24),
  (uint8_t)(efuseMac >> 32),  (uint8_t)(efuseMac >> 40));
String macSuffix = String(macHex).substring(6);  // últimos 3 bytes = parte única
```

**NUNCA usar `WiFi.macAddress()` sin delay** — devuelve `00:00:00:00:00:00` antes de que el stack inicie.

**NUNCA `esp_efuse_mac_get_default()`** — no declarado en ESP32 Arduino core 3.x. Usar `ESP.getEfuseMac()`.

### `toUpperCase()` en Arduino
Devuelve `void` — NO se puede encadenar con `+`.
```cpp
// MAL:  stationNombre = "EcoG " + mac.substring(6).toUpperCase();
// BIEN:
String macSuffixUp = macSuffix;
macSuffixUp.toUpperCase();
stationNombre = "EcoG " + macSuffixUp;
```

### Byte order de ESP.getEfuseMac()
El uint64_t tiene mac[0] en bits 0-7 (menor shift). Para substring(6) tome los bytes únicos:
```cpp
// >> 0   = mac[0] (OUI byte 0)
// >> 40  = mac[5] (device byte 5)
// substring(6) de mac[0..5] = mac[3]mac[4]mac[5] = bytes únicos del dispositivo ✓
```

### Librerías necesarias (Arduino IDE)
- `Adafruit CCS811`
- `TinyGPSPlus`
- `WiFiManager` by **tzapu** ← la única que hay que instalar manualmente
- `Wire`, `WiFi`, `HTTPClient`, `time` — vienen con el board ESP32

---

## resetearDemo (ScreenAjustes.js) — cómo funciona
1. Lee todos los IDs reales de Firebase (`get(dbRef(db, "estaciones"))`)
2. Borra cada `estaciones/{id}` e `historial/{id}` individualmente
3. Borra `alertas/`
4. Resetea solo usuarios con `rol !== "admin"` (`onboardingCompleto: false`, `estaciones: null`)
5. **No toca la cuenta admin**

**Orden correcto para demo limpio:**
1. Admin → Resetear demo (borra todo en Firebase)
2. Reflashear ESP32 (si cambió el firmware)
3. ESP32 arranca → reconecta al WiFi guardado → crea `estacion_{mac}` automáticamente
4. Usuario hace onboarding → detección automática → vincula

**Si hay estaciones fantasma** (como `estacion_000000` del bug de MAC) → resetearDemo las borra todas.

---

## Pendientes post-feria (necesitan plan Blaze)
- **Cloud Functions SMTP**: `functions/index.js` listo, deploy pendiente
- **ScreenComunidad fotos**: `useComunidad.js` usa `uploadBytes()`, necesita Firebase Storage

---

## Modelo de negocio
DaaS: **$599 MXN/mes** por dispositivo EcoG (renta + instalación + soporte + app).
Sin pago inicial, sin permanencia, sin tiers.
Alertas bajo **NOM-172-SEMARNAT-2023** (norma de comunicación, no certificación).
Fuente costo PM2.5 Sinaloa: Becerra Pérez & Ramos Álvarez (2020), Revista Internacional de Contaminación Ambiental, 36(3):249-259. Original en USD ($24-34M) → $444-629M MXN al cambio ~18.5.

---

## Seguridad — regla de oro
**Ninguna contraseña, token, llave API o secret en código fuente, index.html ni JSX.**
Firebase credentials en `constants/firebase.js` son públicas por diseño (reglas RTDB las protegen).
SMTP y secrets de functions: solo via `firebase functions:secrets:set` (interactivo, nunca en archivo).
