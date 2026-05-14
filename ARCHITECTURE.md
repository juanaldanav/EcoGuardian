# EcoGuardian — Arquitectura (actualizado 13-may-2026)

## Flujo de datos

```
ESP32 (firmware MAC-based)
  ├── SDS011  → pm25, pm10
  ├── CCS811  → co2, tvoc
  └── GPS NEO-6M → lat, lng, satelites, gps_valido

  cada 30 s → HTTP PUT → Firebase Realtime Database
                               ↓
                         StationContext (context/StationContext.js)
                         selectedId + listaIds + stationLabel()
                               ↓
                         Screens (re-render via onValue listener)
```

---

## ID de estación

Cada ESP32 genera su ID en `setup()` desde la MAC:
```cpp
String mac = WiFi.macAddress();   // "AA:BB:CC:DD:EE:FF"
mac.replace(":", ""); mac.toLowerCase();
stationId     = "estacion_" + mac.substring(6);  // "estacion_ddeeff"
stationNombre = "EcoG " + mac.substring(6).toUpperCase();  // "EcoG DDEEFF"
```

La app muestra "Estación 1", "Estación 2"... cuando el nombre coincide con `/^EcoG [A-F0-9]{6}$/i`. Si el admin renombra la estación, muestra el nombre personalizado.

---

## Estructura Firebase

```
estaciones/
  estacion_{mac6}/       ← PUT cada 30 s
    pm25        float
    pm10        float
    co2         float
    tvoc        float
    lat         float
    lng         float
    satelites   int
    gps_valido  bool
    nivel       string   ("bueno"|"moderado"|"malo"|"muy_malo"|"peligroso")
    alarma      bool     (pm25 > 35)
    nombre      string   ("EcoG DDEEFF" default, editable por admin)
    timestamp   int      Unix epoch en segundos (NTP via WiFi)

historial/
  estacion_{mac6}/
    {timestamp}/         ← PUT cada 30 s
      pm25    float
      pm10    float
      co2     float
      tvoc    float
      nivel   string

alertas/
  {timestamp}/           ← PUT solo cuando pm25 > 35
    estacionId  string
    estacion    string   (nombre)
    pm25        float
    pm10        float
    co2         float
    nivel       string
    lat         float
    lng         float
    ts          int

usuarios/
  {uid}/
    nombre              string
    email               string
    rol                 "admin" | "usuario"
    creadoEn            int (epoch)
    onboardingCompleto  bool
    estaciones          { estacion_id: true }  ← solo usuarios con dispositivo

configuracion/
  redes/
    {id}/  ssid + password  ← WiFi configuradas
```

---

## Roles y flujo de app

```
App.js
  ├── !fontsReady || authLoading  → blank screen
  ├── !splashDone                 → ScreenSplash
  ├── !user                       → ScreenLogin (login / registro / olvidé)
  ├── !onboardingCompleto && !isAdmin → ScreenOnboarding
  └── AppLayout (StationProvider wrapping)
        ├── tab "home"      → ScreenDashboard  (onGoAlerts prop)
        ├── tab "map"       → ScreenMapa
        ├── tab "community" → ScreenComunidad
        ├── tab "alerts"    → ScreenAlertas    (ExplorerGate si isExplorer)
        ├── tab "history"   → ScreenHistorial  (ExplorerGate si isExplorer)
        ├── tab "admin"     → ScreenAdmin      (no en TABS, solo via settings)
        └── tab "settings"  → ScreenAjustes   (onGoAdmin prop)
```

| Rol | Ve | No ve |
|---|---|---|
| admin | Todas las estaciones, ScreenAdmin, tienda | "Vincular dispositivo", switch alertas |
| suscriptor | Su(s) estación(es), todas las screens | ScreenAdmin |
| explorador | Mapa, Comunidad | Dashboard, Alertas, Historial (ExplorerGate) |

---

## Hooks — hooks/useFirebase.js

| Hook | Path Firebase | Quién lo usa |
|---|---|---|
| `useStations()` | `estaciones/` (todas) | StationContext (admin), ScreenAdmin |
| `useStation(id)` | `estaciones/{id}` | ScreenDashboard, ScreenMapa |
| `useHistory(id)` | `historial/{id}` (últimas 30) | ScreenDashboard, ScreenHistorial |
| `useAlerts()` | `alertas/` (últimas 20) | ScreenAlertas |
| `useAllUsers()` | `usuarios/` | ScreenAdmin |
| `useWifiNetworks()` | `configuracion/redes/` | ScreenAjustes |

Todos usan `onValue` (tiempo real). `goOnline(db)` al inicio de cada efecto para forzar reconexión.

---

## StationContext — context/StationContext.js

Provee a toda la app:
- `selectedId` / `setSelectedId` — estación activa
- `listaIds` — admin: todas; suscriptor: `perfil.estaciones`
- `stations` — snapshot completo de todas las estaciones
- `isExplorer` — onboardingCompleto pero sin dispositivos
- `stationLabel(id)` — "Estación N" o nombre personalizado

---

## Componentes compartidos — components/

| Componente | Props | Usado en |
|---|---|---|
| `Card` | `children, style` | Dashboard, Alertas, Historial, Ajustes |
| `SensorRow` | `icon, label, value, unit, color` | Dashboard, Mapa |

---

## Utilidades — utils/helpers.js

### `getInfo(pm25)`
Devuelve `{ label, color, bg, emoji }` según umbral PM2.5 (escala NOM-172).

| Rango µg/m³ | Label | Color |
|---|---|---|
| ≤ 12 | Bueno | C.green |
| ≤ 35 | Moderado | C.yellow |
| ≤ 55 | Malo | C.orange |
| ≤ 150 | Muy malo | C.red |
| > 150 | Peligroso | C.purple |

### `isDeviceOnline(ts)`
`(Date.now()/1000 - ts) < 120` — dispositivo online si última lectura hace menos de 2 min.

### `timeSince(ts)` / `fmtTime(ts)`
Usan timestamp Unix epoch (corregido en firmware). `timeSince` devuelve string legible ("hace 3 min").

---

## Cloud Functions — functions/index.js

Trigger `onValueCreated` en `/alertas/{alertId}`. Envía email vía nodemailer.
Credenciales via Firebase Secrets (`defineSecret`), nunca hardcodeadas.
**Requiere plan Blaze** para llamadas de red salientes.

Deploy: `firebase deploy --only functions`
Secrets: `firebase functions:secrets:set SMTP_HOST` (y los 5 restantes)
