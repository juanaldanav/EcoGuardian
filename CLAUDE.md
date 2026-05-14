# EcoGuardian — Contexto para Claude Code

## Deploy — ORDEN OBLIGATORIO (no saltarse pasos)
```
npx expo export --platform web
node scripts/generate-icons.js
node scripts/inject-web.js
firebase deploy --only hosting
```
`expo export` borra `dist/` completo cada vez. Sin `inject-web.js` el splash desaparece.
Sin `generate-icons.js` los íconos PWA se pierden. Siempre los tres, en ese orden.

---

## Qué NO tocar sin razón
- `scripts/inject-web.js` y `scripts/generate-icons.js` — críticos para PWA/splash
- `ScreenSplash.js` — animación de entrada
- `hooks/useAuth.js` — auth funciona
- `constants/firebase.js` — credenciales Firebase (no hardcodear nada aquí)
- `database.rules.json` — reglas de seguridad (ver nota abajo)

### Nota sobre database.rules.json
- `estaciones.write: true` es intencional: el ESP32 escribe sin autenticación
- `historial.$stationId.write: "!newData.exists()"` → permite borrar (cuando se borra, `newData.exists()=false`, `!false=true`) pero no escribir nuevo historial desde cliente

---

## Arquitectura principal
```
App.js
 ├── ScreenSplash (animación inicial)
 ├── ScreenLogin (!user)
 ├── ScreenOnboarding (!onboardingCompleto && !isAdmin)
 └── AppLayout
      ├── Header (dropdown via StationContext)
      ├── ScreenDashboard   ← lee selectedId de StationContext
      ├── ScreenMapa        ← muestra todas, resalta activeId de StationContext
      ├── ScreenAlertas     ← filtrar por selectedId
      ├── ScreenHistorial   ← filtrar por selectedId
      └── ScreenAjustes     ← botón "Ver tienda" solo para admin
```

### StationContext (`context/StationContext.js`)
Estado global compartido entre todas las pantallas. Expone:
- `selectedId` / `setSelectedId` — estación activa
- `stationLabel(id)` — devuelve nombre legible (reemplaza displayName basado en MAC)

Admin: ve todas las estaciones vía `useStations()`. Usuario: solo sus propias.

---

## IDs de estación
Formato: `estacion_{últimos3bytes_MAC}` — ej. `estacion_ddeeff`.
**NUNCA usar `estacion_01` ni IDs hardcodeados.** El firmware genera el ID desde la MAC del ESP32.

`isDefaultFirmwareName()` (`utils/helpers.js`) detecta nombres tipo `EcoG DDEEFF` para mostrar "Estación N" en lugar del hex crudo.

---

## Hooks clave
- `useStations()` → suscripción a TODAS las estaciones en tiempo real (admin)
- `useStation(id)` → una estación tiempo real
- `useAuth()` → `{ user, perfil, isAdmin, loading, login, logout, register }`

## Roles
- `admin` — ve todas las estaciones, bypasea onboarding, no ve botón "Vincular dispositivo"
- `usuario` (suscriptor) — solo sus estaciones (`perfil.estaciones`), pasa onboarding
- `explorador` — onboarding completo sin estación vinculada, ve mapa/comunidad

---

## Modelo de negocio
DaaS: **$599 MXN/mes** por dispositivo EcoG (renta + instalación + soporte + app).
Sin pago inicial, sin permanencia, sin tiers. Precio recupera hardware en <4 meses.
Alertas bajo criterios **NOM-172-SEMARNAT-2023** (norma de comunicación, no certificación).
Archivos: `constants/pricing.js`, `constants/store.js`, `screens/ScreenTienda.js`

---

## Historial de decisiones importantes

### resetearDemo (ScreenAjustes.js) — corregido mayo 2026
**Problema original:** hardcodeaba `estacion_01` (no existe desde que el firmware usa MAC).
También borraba la cuenta admin.

**Fix:** usa `get(dbRef(db, "estaciones"))` para leer los IDs reales antes de borrar.
Filtra `u.rol !== "admin"` antes de resetear usuarios. Solo borra lo que existe.

```js
const estSnap = await get(dbRef(db, "estaciones"));
const ids = estSnap.exists() ? Object.keys(estSnap.val()) : [];
// delete cada id individualmente, luego reset solo non-admin users
```

### ScreenMapa.js — corregido mayo 2026
**Problema:** tenía su propio `useState(null)` para la estación seleccionada, desconectado
del StationContext. Seleccionar en Dashboard no se reflejaba en el mapa y viceversa.

**Fix:** reemplazado `selected`/`setSelected` por `activeId`/`setSelectedId` de StationContext.
Fallback: `activeId = selectedId || lista[0]?.[0]` para no quedar en blanco.

### Cloud Functions — pendiente deploy (necesita Blaze)
`functions/index.js` implementa trigger RTDB `/alertas/{alertId}` → email vía nodemailer.
Credenciales SMTP 100% en Firebase Secrets (`defineSecret()`). Nunca en código fuente.
Deploy cuando Alonso compre plan Blaze.

### ScreenComunidad — pendiente (necesita Blaze)
`useComunidad.js` usa `uploadBytes()` de Firebase Storage. Texto funciona.
Foto crashea sin Storage bucket activo. Diferido hasta plan Blaze.

### Precio $444–629M MXN (guion feria)
Fuente: Becerra Pérez & Ramos Álvarez (2020), *Revista Internacional de Contaminación Ambiental*,
36(3):249–259. Dato original en USD ($24–34M). Convertido al tipo de cambio ~18.5 MXN/USD.
No inventado — misma cifra, diferente moneda. Citar fuente si el panel pregunta.

---

## Seguridad — regla de oro
**Ninguna contraseña, token, llave API o secret va en código fuente, index.html ni JSX.**
Firebase credentials en `constants/firebase.js` son públicas por diseño (reglas RTDB las protegen).
SMTP y secrets de functions: solo vía `firebase functions:secrets:set` CLI.
