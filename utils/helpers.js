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

// true si el dispositivo está activo.
// Prioriza el timestamp NTP del firmware (preciso desde el primer render).
// Si el firmware aún manda uptime, cae a receivedAt (tiene bug en carga inicial).
export function isDeviceOnline(data) {
  if (!data) return false;
  const { timestamp, receivedAt } = data;
  if (timestamp && timestamp > 1_000_000_000) {
    return (Date.now() / 1000 - timestamp) < 120;
  }
  if (receivedAt) {
    return (Date.now() / 1000 - receivedAt) < 120;
  }
  return false;
}

export function timeSince(ts) {
  if (!ts || ts < 1_000_000_000) return null;
  const secs = Math.floor(Date.now() / 1000 - ts);
  if (secs < 60)  return "< 1 min";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

// Formatea timestamp: hora real si es NTP, tiempo desde arranque si es uptime
export function fmtTime(ts) {
  if (!ts) return "--:--";
  const n = parseInt(ts);
  if (n < 1_000_000_000) {
    // uptime en segundos → mostrar como T+Xm
    const m = Math.floor(n / 60);
    return `T+${m}m`;
  }
  const d = new Date(n * 1000);
  return d.toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit" });
}