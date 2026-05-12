// ============================================================
//   useFirebase.js — Hooks para leer datos de Firebase
// ============================================================
import { useState, useEffect } from "react";
import { ref, onValue, query, limitToLast, orderByKey, set, remove, goOnline } from "firebase/database";
import { db } from "../constants/firebase";

// Hook: datos en tiempo real de la estación
export function useStation() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setTick]           = useState(0);

  useEffect(() => {
    // Fuerza conexión al servidor — descarta caché viejos
    goOnline(db);

    const r = ref(db, "estaciones/estacion_01");
    const unsub = onValue(r, snap => {
      // Usa los datos tal como vienen del servidor (timestamp NTP del firmware)
      // NO sobrescribir con Date.now() — eso hacía parecer datos viejos como "en vivo"
      setData(snap.val());
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Re-render cada 30 s para que isDeviceOnline() recalcule sin datos nuevos
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  return { data, loading };
}

// Hook: historial de lecturas
export function useHistory() {
  const [hist, setHist]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = query(
      ref(db, "historial/estacion_01"),
      orderByKey(),
      limitToLast(30)
    );
    const unsub = onValue(r, snap => {
      const v = snap.val();
      if (v) setHist(Object.entries(v).reverse().map(([ts, d]) => ({ ts, ...d })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { hist, loading };
}

// Hook: redes WiFi configuradas
export function useWifiNetworks() {
  const [redes, setRedes] = useState([]);

  useEffect(() => {
    const r = ref(db, "configuracion/redes");
    const unsub = onValue(r, snap => {
      const v = snap.val();
      if (v) setRedes(Object.entries(v).map(([id, d]) => ({ id, ...d })));
      else   setRedes([]);
    });
    return () => unsub();
  }, []);

  function agregar(ssid, password) {
    const id = "red_" + Date.now();
    return set(ref(db, `configuracion/redes/${id}`), { ssid, password });
  }

  function eliminar(id) {
    return remove(ref(db, `configuracion/redes/${id}`));
  }

  return { redes, agregar, eliminar };
}

// Hook: alertas recientes
export function useAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const r = query(ref(db, "alertas"), orderByKey(), limitToLast(20));
    const unsub = onValue(r, snap => {
      const v = snap.val();
      if (v) setAlerts(Object.entries(v).reverse().map(([ts, d]) => ({ ts, ...d })));
    });
    return () => unsub();
  }, []);

  return alerts;
}