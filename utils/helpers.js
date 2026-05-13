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

// true si el dispositivo envió un dato en los últimos 90 segundos.
// Requiere timestamp NTP del firmware (Unix epoch ≥ 1e9).
// Si el firmware manda uptime (< 1e9) porque NTP no sincronizó, devuelve false.
export function isDeviceOnline(data) {
  if (!data) return false;
  const { timestamp } = data;
  if (!timestamp || timestamp < 1_000_000_000) return false;
  return (Date.now() / 1000 - timestamp) < 90;
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

// Detecta el inicio de la sesión actual buscando el último gap > 90 seg en historial
// hist viene newest-first desde useHistory
export function detectarInicioSesion(hist) {
  if (!hist || hist.length === 0) return null;
  const cronologico = [...hist].reverse();
  let inicioIdx = 0;
  for (let i = 1; i < cronologico.length; i++) {
    const gap = parseInt(cronologico[i].ts) - parseInt(cronologico[i - 1].ts);
    if (gap > 90) inicioIdx = i;
  }
  return cronologico[inicioIdx]?.ts || null;
}

// Información educativa de cada métrica según normativa mexicana e internacional
export const METRICAS = {
  pm25: {
    nombre:      "Partículas Finas PM2.5",
    icono:       "air-purifier",
    descripcion: "Partículas microscópicas de hasta 2.5 micrómetros que penetran profundamente en los pulmones y el torrente sanguíneo.",
    impacto:     "Exposición prolongada eleva el riesgo de enfermedades respiratorias, cardiovasculares y cáncer de pulmón.",
    norma:       "NOM-172-SEMARNAT-2023",
    unidad:      "µg/m³",
    limiteRef:   "35 µg/m³ umbral de alerta (IMECA 100)",
    rangos: [
      { label:"Buena",                      min:0,   max:12,   color:"green",  desc:"Sin riesgo para la salud"               },
      { label:"Aceptable",                  min:12,  max:35,   color:"yellow", desc:"Grupos sensibles pueden verse afectados" },
      { label:"Mala (grupos sensibles)",    min:35,  max:55,   color:"orange", desc:"Reduce actividad al aire libre"          },
      { label:"Mala",                       min:55,  max:150,  color:"red",    desc:"Evita salir, usa cubrebocas"             },
      { label:"Muy mala",                   min:150, max:null, color:"purple", desc:"Emergencia — quédate en interiores"      },
    ],
  },
  pm10: {
    nombre:      "Partículas Gruesas PM10",
    icono:       "blur",
    descripcion: "Partículas de hasta 10 micrómetros: polvo, polen y esporas. Afectan principalmente las vías respiratorias superiores.",
    impacto:     "Puede agravar asma, rinitis y enfermedades pulmonares crónicas, especialmente en niños y adultos mayores.",
    norma:       "NOM-172-SEMARNAT-2023",
    unidad:      "µg/m³",
    limiteRef:   "54 µg/m³ calidad buena (IMECA 50)",
    rangos: [
      { label:"Buena",                   min:0,   max:54,   color:"green",  desc:"Sin riesgo para la salud"               },
      { label:"Aceptable",               min:55,  max:154,  color:"yellow", desc:"Grupos sensibles pueden verse afectados" },
      { label:"Mala (grupos sensibles)", min:155, max:254,  color:"orange", desc:"Reduce actividad al aire libre"          },
      { label:"Mala",                    min:255, max:null, color:"red",    desc:"Evita actividad física al aire libre"    },
    ],
  },
  co2: {
    nombre:      "Dióxido de Carbono CO₂",
    icono:       "molecule-co2",
    descripcion: "Gas producido por la respiración y combustión. Niveles altos en espacios cerrados causan somnolencia y reducen la concentración.",
    impacto:     "Por encima de 1,000 ppm puede causar fatiga y dolor de cabeza. La norma mexicana NOM-025-STPS-2008 establece 5,000 ppm como límite laboral máximo.",
    norma:       "NOM-025-STPS-2008 · ASHRAE 62.1",
    unidad:      "ppm",
    limiteRef:   "< 1,000 ppm recomendado en interiores",
    rangos: [
      { label:"Excelente",  min:0,    max:600,  color:"green",  desc:"Ventilación óptima"                   },
      { label:"Bueno",      min:600,  max:1000, color:"yellow", desc:"Normal en espacios habitados"         },
      { label:"Aceptable",  min:1000, max:1500, color:"orange", desc:"Ventila el espacio"                   },
      { label:"Elevado",    min:1500, max:5000, color:"red",    desc:"Abre ventanas inmediatamente"         },
      { label:"Peligroso",  min:5000, max:null, color:"purple", desc:"Límite NOM-025 — evacúa el área"      },
    ],
  },
  tvoc: {
    nombre:      "Compuestos Orgánicos Volátiles TVOC",
    icono:       "chemical-weapon",
    descripcion: "Gases emitidos por pinturas, limpiadores, adhesivos y plásticos. El sensor CCS811 mide el total de VOCs presentes en el ambiente.",
    impacto:     "Pueden causar irritación de ojos, nariz y garganta. Exposición crónica a ciertos VOCs está asociada con daño hepático. No existe NOM específica en México — se usa el estándar WELL Building Standard.",
    norma:       "WELL Building Standard (sin NOM específica en México)",
    unidad:      "ppb",
    limiteRef:   "< 500 ppb recomendado",
    rangos: [
      { label:"Excelente", min:0,    max:220,  color:"green",  desc:"Aire interior limpio"            },
      { label:"Bueno",     min:220,  max:660,  color:"yellow", desc:"Nivel normal en interiores"      },
      { label:"Moderado",  min:660,  max:2200, color:"orange", desc:"Considera ventilar el área"      },
      { label:"Alto",      min:2200, max:null, color:"red",    desc:"Ventila inmediatamente"          },
    ],
  },
};

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
  return d.toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit", timeZone:"America/Mazatlan" });
}