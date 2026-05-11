// ============================================================
//   useFirebase.js — Hooks para leer datos de Firebase
// ============================================================
import { useState, useEffect } from "react";
import { ref, onValue, query, limitToLast, orderByKey } from "firebase/database";
import { db } from "../constants/firebase";

// Hook: datos en tiempo real de la estación
export function useStation() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = ref(db, "estaciones/estacion_01");
    const unsub = onValue(r, snap => {
      setData({ ...snap.val(), receivedAt: Date.now() / 1000 });
      setLoading(false);
    });
    return () => unsub();
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