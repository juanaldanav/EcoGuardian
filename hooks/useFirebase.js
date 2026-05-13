// ============================================================
//   useFirebase.js — Hooks para leer datos de Firebase
// ============================================================
import { useState, useEffect } from "react";
import { ref, onValue, query, limitToLast, orderByKey, set, remove, goOnline } from "firebase/database";
import { db } from "../constants/firebase";

// Hook: todas las estaciones en tiempo real
export function useStations() {
  const [stations, setStations] = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    goOnline(db);
    const r = ref(db, "estaciones");
    const unsub = onValue(r, snap => {
      setStations(snap.val() || {});
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { stations, loading };
}

// Hook: datos en tiempo real de la estación
export function useStation(stationId) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setTick]           = useState(0);

  useEffect(() => {
    if (!stationId) {
      setData(null);
      setLoading(false);
      return;
    }
    goOnline(db);
    const r = ref(db, `estaciones/${stationId}`);
    const unsub = onValue(r, snap => {
      setData(snap.val());
      setLoading(false);
    });
    return () => unsub();
  }, [stationId]);

  // Re-render cada 30 s para que isDeviceOnline() recalcule
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  return { data, loading };
}

// Hook: historial de lecturas
export function useHistory(stationId) {
  const [hist, setHist]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stationId) {
      setHist([]);
      setLoading(false);
      return;
    }
    const r = query(
      ref(db, `historial/${stationId}`),
      orderByKey(),
      limitToLast(30)
    );
    const unsub = onValue(r, snap => {
      const v = snap.val();
      if (v) setHist(Object.entries(v).reverse().map(([ts, d]) => ({ ts, ...d })));
      else   setHist([]);
      setLoading(false);
    });
    return () => unsub();
  }, [stationId]);

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