# EcoGuardian — Arquitectura del Proyecto

## Flujo de datos completo

```
ESP32 (Arduino)
  ├── SDS011  → pm25, pm10
  ├── CCS811  → co2, tvoc
  └── GPS     → lat, lng, satelites, gps_valido

  cada 30 s → HTTP PATCH/PUT → Firebase Realtime Database
                                    ↓
                              App (React Native / Expo)
                              useFirebase.js hooks (onValue listener)
                                    ↓
                              Screens (re-render automático)
```

---

## Estructura de Firebase

```
estaciones/
  estacion_01/          ← PATCH cada 30 s (estado actual)
    pm25        float
    pm10        float
    co2         float
    tvoc        float
    lat         float
    lng         float
    satelites   int
    gps_valido  bool
    nivel       string  ("bueno" | "moderado" | "malo" | "muy_malo" | "peligroso")
    color       int     (0-4) — NO usado por la app, redundante
    alarma      bool    (pm25 > 35)
    nombre      string  ("Estacion 1")
    timestamp   int     ← ⚠️ BUG: es millis()/1000 (uptime), NO Unix epoch

historial/
  estacion_01/
    {timestamp}/        ← PUT cada 30 s
      pm25    float
      pm10    float
      co2     float
      nivel   string
      — tvoc NO se guarda aquí (solo en estacion_01)

alertas/
  {timestamp}/          ← PUT solo cuando pm25 > 35
    estacion  string
    pm25      float
    nivel     string
    lat       float
    lng       float
```

---

## Hooks — useFirebase.js

| Hook | Path Firebase | Usado en |
|---|---|---|
| `useStation()` | `estaciones/estacion_01` | Dashboard, Mapa, Alertas, Ajustes |
| `useHistory()` | `historial/estacion_01` (últimas 30) | Dashboard (modal promedios), Historial |
| `useAlerts()` | `alertas` (últimas 20) | Alertas |

Todos usan `onValue` (listener en tiempo real). `useStation` y `useHistory` exponen `{ data/hist, loading }`. `useAlerts` solo expone el array (sin loading).

---

## Mapa de pantallas

### App.js
- Controla `tab` (navegación) y `darkMode` (state local)
- `darkMode` solo cambia el `bgColor` del contenedor raíz
- Pasa `darkMode` + `setDarkMode` únicamente a `ScreenAjustes`

```
App.js
  └── AppLayout
        ├── Header (título fijo "EcoGuardian")
        ├── renderScreen() según tab activo
        │     ├── ScreenDashboard  — sin props
        │     ├── ScreenMapa       — sin props
        │     ├── ScreenAlertas    — sin props
        │     ├── ScreenHistorial  — sin props
        │     └── ScreenAjustes    — { darkMode, setDarkMode }
        └── BottomNav (TABS array)
```

### ScreenDashboard
- `useStation()` → datos en tiempo real (pm25, co2, tvoc, gps, timestamp, alarma)
- `useHistory()` → últimas 30 lecturas para promedios del modal
- `getInfo(pm25)` → color/label/emoji del nivel actual
- Modal `ResumenModal` calcula promedios de hist (pm25, pm10, co2)
- Banner de alerta local: se muestra si `data.alarma === true`

### ScreenMapa
- `useStation()` → coordenadas GPS + datos de calidad
- Fallback coords: Culiacán centro (24.7931, -107.3939) si GPS sin señal
- `mapRef.animateToRegion()` cuando cambian lat/lng en Firebase
- Requiere `react-native-maps` con Google Maps API key en producción

### ScreenAlertas
- `useStation()` → estado actual (muestra nivel en tiempo real)
- `useAlerts()` → historial de alertas de Firebase
- Escala OMS hardcoded en el JSX (5 niveles)

### ScreenHistorial
- `useHistory()` → últimas 30 lecturas
- Gráfica de barras manual (sin librería externa)
- `fmtTime(ts)` convierte la key de Firebase (timestamp string) a hora legible

### ScreenAjustes
- `useStation()` → muestra nivel actual y última actualización
- `notifAlertas`: estado LOCAL — se pierde al navegar fuera y volver
- Alerta nativa (`Alert.alert`) cuando `data.alarma` cambia a `true`
- Modo oscuro: el Switch funciona pero solo cambia `bgColor` del root en App.js

---

## Utilidades — helpers.js

### getInfo(pm25)
Devuelve `{ label, color, bg, emoji, score }` según umbral PM2.5.
`score` nunca se usa en ninguna pantalla actualmente.

| Rango | Label | Color |
|---|---|---|
| ≤ 12 | Bueno | C.green |
| ≤ 35 | Moderado | C.yellow |
| ≤ 55 | Malo | C.orange |
| ≤ 150 | Muy malo | C.red |
| > 150 | Peligroso | C.purple |

### timeSince(ts)
Calcula minutos transcurridos: `(Date.now()/1000 - ts) / 60`
⚠️ **BUG**: asume `ts` es Unix epoch en segundos, pero el Arduino envía `millis()/1000` (uptime desde arranque). Resultado: siempre muestra un tiempo incorrecto enorme.

### fmtTime(ts)
Convierte key de Firebase a hora: `new Date(parseInt(ts) * 1000)`
⚠️ **BUG mismo origen**: la key `ts` es uptime en segundos, no epoch. La hora mostrada es incorrecta.

---

## Componentes compartidos

| Componente | Props | Usado en |
|---|---|---|
| `Card` | `children, style` | Dashboard, Alertas, Historial, Ajustes, Mapa |
| `SensorRow` | `icon, label, value, unit, color` | Dashboard, Mapa |
| `LiveDot` | — | Dashboard (header de card sensores), Mapa, Alertas |

---

## Bugs conocidos

### BUG 1 — Timestamp incorrecto (CRÍTICO)
**Archivo**: `Codigo/codigo arduino.txt` línea 68 + `utils/helpers.js` líneas 16-21

**Causa**: El ESP32 envía `timestamp = millis()/1000` que es el tiempo en segundos desde que el dispositivo arrancó (uptime), no un Unix timestamp real. Cuando la app hace `Date.now()/1000 - ts`, el resultado es ~1.7 billones (epoch actual) - ~10,000 (uptime) = número enorme. `timeSince` siempre retorna horas incorrectas.

**Fix en Arduino**: cambiar `millis()/1000` por NTP o aceptar que no hay RTC.
**Fix en App**: si no hay NTP, guardar el timestamp de cuando Firebase recibe el dato (regla en Security Rules o Cloud Function), o mostrar "hace X lecturas" en vez de tiempo relativo.

### BUG 2 — darkMode solo cambia el fondo del root
**Archivo**: `App.js` línea 49

**Causa**: `bgColor = darkMode ? C.bg : "#F0F4F0"` solo afecta al `View` raíz. Las screens usan `C.card`, `C.bg`, etc. hardcodeados directamente. El toggle en Ajustes se ve pero no cambia los colores internos de ninguna pantalla.

**Fix**: Pasar `darkMode` como prop a todas las screens (o usar Context/Zustand) y reemplazar `C.card` etc. por valores condicionales, o crear un tema dinámico.

### BUG 3 — notifAlertas se resetea al navegar
**Archivo**: `ScreenAjustes.js` línea 39

**Causa**: `useState(false)` local. Cada vez que el usuario cambia de tab y regresa, el switch vuelve a false aunque lo hubiera activado.

**Fix**: Mover `notifAlertas` a App.js como state global y pasarlo como prop, o usar AsyncStorage para persistirlo.

---

## Campos que el Arduino envía pero la app no usa

| Campo | Tipo | Donde llega | Usado en app |
|---|---|---|---|
| `nivel` | string | estacion_01 | ❌ La app recalcula con `getInfo(pm25)` |
| `color` | int (0-4) | estacion_01 | ❌ La app usa C.color de colors.js |
| `score` | — | solo en getInfo() | ❌ No se renderiza en ninguna pantalla |

---

## Dependencias externas clave

```json
react-native-maps       → ScreenMapa (requiere Google Maps API Key para Android release)
@expo/vector-icons      → Ionicons + MaterialCommunityIcons (todas las screens)
firebase                → SDK web modular v9+
react-native-safe-area-context → App.js (insets para Samsung/notch)
```

---

## Para refactorizar: checklist de conexiones

Antes de tocar cualquier archivo, verificar:
1. ¿El hook `useStation()` ya está importado o hay que agregarlo?
2. ¿El campo Firebase que necesitas existe en la estructura de arriba?
3. ¿`darkMode` llega como prop o hay que pasarlo desde App.js?
4. ¿Los timestamps que muestras usan `timeSince` o `fmtTime`? Si sí, el BUG 1 aplica.
5. ¿El estado que guardas necesita sobrevivir al cambio de tab? Si sí, subirlo a App.js.
