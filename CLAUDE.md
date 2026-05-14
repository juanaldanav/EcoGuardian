# EcoGuardian — Contexto para Claude Code

## Deploy — ORDEN OBLIGATORIO (no saltarse pasos)
```
npx expo export --platform web
node scripts/generate-icons.js
node scripts/inject-web.js
firebase deploy --only hosting
```
Sin `inject-web.js` el splash desaparece. Sin `generate-icons.js` los íconos PWA se pierden.
`expo export` borra `dist/` completo — siempre correr los scripts después.

---

## Qué NO tocar sin razón
- `scripts/inject-web.js` y `scripts/generate-icons.js` — críticos para PWA/splash
- `ScreenSplash.js` — animación de entrada, no modificar
- `hooks/useAuth.js` — auth funciona, solo agregar si es necesario
- `constants/firebase.js` — credenciales Firebase
- `database.rules.json` — reglas de seguridad

---

## Arquitectura principal
```
App.js
 ├── ScreenSplash (animación inicial)
 ├── ScreenLogin (!user)
 ├── ScreenOnboarding (!onboardingCompleto && !isAdmin)
 └── AppLayout
      ├── Header
      ├── ScreenDashboard  ← dropdown estación (pendiente: StationContext)
      ├── ScreenMapa       ← muestra todas, resalta seleccionada
      ├── ScreenAlertas    ← filtrar por selectedStationId
      ├── ScreenHistorial  ← filtrar por selectedStationId
      └── ScreenAjustes    ← botón "Ver tienda" solo para admin
```

## Hooks clave
- `useStations()` → TODAS las estaciones (admin)
- `useStation(id)` → una estación tiempo real
- `useAuth()` → `{ user, perfil, isAdmin, loading, login, logout, register }`

## Roles
- `admin` — ve todas las estaciones, bypasea onboarding, acceso a ScreenAdmin
- `usuario` — solo sus estaciones vinculadas (`perfil.estaciones`)
- explorador — onboarding completo pero sin estación: ve mapa público

---

## Modelo de negocio
DaaS: $599 MXN/mes por dispositivo EcoG (renta, instalación y soporte incluidos).
Alertas comunicadas bajo criterios NOM-172-SEMARNAT-2023.
Archivos: `constants/pricing.js`, `constants/store.js`, `screens/ScreenTienda.js`

---

## Pendiente (feria 19 mayo 2026)
1. `StationContext` + dropdown en Dashboard (admin ve todas, usuario ve las suyas)
2. `ScreenAdmin` — lista dispositivos, cuentas, estado
3. Botón "Ver tienda" en ScreenAjustes para admin
4. Verificar flujo explorador
