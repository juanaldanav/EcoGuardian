// ============================================================
//   useFirebase.js — Hooks para leer datos de Firebase
// ============================================================
import { useState, useEffect } from "react";
import { ref, onValue, query, limitToLast, orderByKey, set, remove } from "firebase/database";
import { db } from "../constants/firebase";

// Hook: datos en tiempo real de la estación
export function useStation() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setTick]           = useState(0);

  useEffect(() => {
    const r = ref(db, "estaciones/estacion_01");
    const unsub = onValue(r, snap => {
      setData({ ...snap.val(), receivedAt: Date.now() / 1000 });
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Fuerza re-render cada 30 s para que isDeviceOnline() recalcule
  // aunque el dispositivo esté apagado y Firebase no mande datos nuevos
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