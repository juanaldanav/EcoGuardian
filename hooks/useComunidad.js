import { useEffect, useState } from "react";
import {
  ref,
  onValue,
  query,
  orderByKey,
  limitToLast,
  set,
  update,
} from "firebase/database";
import { db } from "../constants/firebase";

export const TIPOS_REPORTE = [
  { key: "incendio",        label: "Incendio",              icon: "fire",                 color: "#C62828" },
  { key: "contaminacion",   label: "Contaminación",         icon: "air-purifier",         color: "#C05621" },
  { key: "quema",           label: "Quema a cielo abierto", icon: "fire",                 color: "#D97706" },
  { key: "humo_industrial", label: "Humo industrial",       icon: "factory",              color: "#6A1B9A" },
  { key: "otro",            label: "Otro",                  icon: "alert-circle-outline", color: "#4A6B52" },
];

export function useComunidad() {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const reportesRef = query(
      ref(db, "comunidad/reportes"),
      orderByKey(),
      limitToLast(50)
    );

    const unsub = onValue(reportesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setReportes([]);
        setLoading(false);
        return;
      }

      const data = snapshot.val();
      const lista = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .reverse();

      setReportes(lista);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const publicar = ({ tipo, descripcion, lat, lng, autorId, autorNombre }) => {
    const id        = `rep_${Date.now()}`;
    const reporteRef = ref(db, `comunidad/reportes/${id}`);
    return set(reporteRef, {
      tipo,
      descripcion,
      lat,
      lng,
      autorId,
      autorNombre,
      estado:    "pendiente",
      creadoEn:  Math.floor(Date.now() / 1000),
    });
  };

  const actualizarEstado = (id, estado) =>
    update(ref(db, `comunidad/reportes/${id}`), { estado });

  return { reportes, loading, publicar, actualizarEstado };
}
