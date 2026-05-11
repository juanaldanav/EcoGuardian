// ============================================================
//   helpers.js — Funciones de utilidad
// ============================================================
import { C } from "../constants/colors";

// Devuelve info del nivel según PM2.5
export function getInfo(pm25) {
  if (!pm25 || pm25 <= 12) return { label:"Bueno",     color:C.green,  bg:C.green  +"15", emoji:"🟢", score: Math.round((pm25||0)*4)  };
  if (pm25 <= 35)          return { label:"Moderado",  color:C.yellow, bg:C.yellow +"15", emoji:"🟡", score: Math.round(pm25*3)        };
  if (pm25 <= 55)          return { label:"Malo",      color:C.orange, bg:C.orange +"15", emoji:"🟠", score: Math.round(pm25*2)        };
  if (pm25 <= 150)         return { label:"Muy malo",  color:C.red,    bg:C.red    +"15", emoji:"🔴", score: Math.min(300,Math.round(pm25)) };
  return                          { label:"Peligroso", color:C.purple, bg:C.purple +"15", emoji:"🟣", score: 500                       };
}

// Tiempo desde un timestamp en segundos
// receivedAt: momento en que la app recibió el dato (Unix epoch/1000),
// usado en lugar de ts cuando el ESP32 envía uptime (millis/1000) en vez de epoch.
export function timeSince(ts, receivedAt) {
  const ref = receivedAt || ts;
  if (!ref) return "-- m";
  const d = Math.floor((Date.now() / 1000 - ref) / 60);
  if (d < 1)  return "< 1 min";
  if (d < 60) return `${d} min`;
  return `${Math.floor(d / 60)} h`;
}

// Formatea timestamp a hora legible
export function fmtTime(ts) {
  if (!ts) return "--:--";
  const d = new Date(parseInt(ts) * 1000);
  return d.toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit" });
}