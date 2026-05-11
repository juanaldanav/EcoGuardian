import { useEffect, useState } from "react";
import {
  ref as dbRef,
  onValue,
  query,
  orderByKey,
  limitToLast,
  set,
  update,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "../constants/firebase";

export const TIPOS_REPORTE = [
  { key: "incendio",        label: "Incendio",              icon: "fire",                 color: "#C62828" },
  { key: "contaminacion",   label: "Contaminación",         icon: "air-purifier",         color: "#C05621" },
  { key: "quema",           label: "Quema a cielo abierto", icon: "fire",                 color: "#D97706" },
  { key: "humo_industrial", label: "Humo industrial",       icon: "factory",              color: "#6A1B9A" },
  { key: "otro",            label: "Otro",                  icon: "alert-circle-outline", color: "#4A6B52" },
];

const MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function subirImagen(imagenUri, reporteId) {
  const response = await fetch(imagenUri);
  const blob     = await response.blob();

  const mime = blob.type || "image/jpeg";
  if (!MIME_PERMITIDOS.includes(mime)) {
    throw new Error(`Tipo de archivo no permitido: ${mime}`);
  }

  const ext = mime.split("/")[1] ?? "jpg";
  const sRef = storageRef(storage, `comunidad/reportes/${reporteId}.${ext}`);
  await uploadBytes(sRef, blob, { contentType: mime });
  return getDownloadURL(sRef);
}

export function useComunidad() {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const reportesRef = query(
      dbRef(db, "comunidad/reportes"),
      orderByKey(),
      limitToLast(50)
    );

    const unsub = onValue(reportesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setReportes([]);
        setLoading(false);
        return;
      }

      const data  = snapshot.val();
      const lista = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .reverse();

      setReportes(lista);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const publicar = async ({ tipo, descripcion, lat, lng, autorId, autorNombre, imagenUri }) => {
    const id         = `rep_${Date.now()}`;
    const reporteRef = dbRef(db, `comunidad/reportes/${id}`);

    let imageUrl = null;
    if (imagenUri) {
      imageUrl = await subirImagen(imagenUri, id);
    }

    return set(reporteRef, {
      tipo,
      descripcion,
      lat,
      lng,
      autorId,
      autorNombre,
      ...(imageUrl ? { imageUrl } : {}),
      estado:   "pendiente",
      creadoEn: Math.floor(Date.now() / 1000),
    });
  };

  const actualizarEstado = (id, estado) =>
    update(dbRef(db, `comunidad/reportes/${id}`), { estado });

  return { reportes, loading, publicar, actualizarEstado };
}
