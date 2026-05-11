// ============================================================
//   ScreenMapa.web.js — Versión web (sin react-native-maps)
//   Metro usa este archivo en lugar de ScreenMapa.js en web.
//   Muestra el mapa vía iframe de OpenStreetMap.
// ============================================================
import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Card      from "../components/Card";
import SensorRow from "../components/SensorRow";
import LiveDot   from "../components/LiveDot";
import { useStation } from "../hooks/useFirebase";
import { getInfo, timeSince } from "../utils/helpers";
import { C } from "../constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const LAT_DEFAULT = 24.7931;
const LNG_DEFAULT = -107.3939;

// Inyecta un iframe de OpenStreetMap en el DOM
function WebMap({ lat, lng, color }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const delta = 0.008;
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`;

    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = "EcoGuardian Mapa";
    iframe.style.cssText = "width:100%;height:100%;border:none;border-radius:16px;display:block;";

    ref.current.innerHTML = "";
    ref.current.appendChild(iframe);
  }, [lat, lng]);

  return React.createElement("div", {
    ref,
    style: { width: "100%", height: "100%", borderRadius: 16, overflow: "hidden" },
  });
}

export default function ScreenMapa() {
  const { data } = useStation();

  const lat   = (data?.lat && data.lat !== 0) ? data.lat : LAT_DEFAULT;
  const lng   = (data?.lng && data.lng !== 0) ? data.lng : LNG_DEFAULT;
  const info  = getInfo(data?.pm25 || 0);

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

      {/* ── MAPA ────────────────────────────────────── */}
      <View style={ss.mapWrap}>
        <WebMap lat={lat} lng={lng} color={info.color} />

        {/* Badge nivel */}
        <View style={[ss.mapBadge, { backgroundColor: info.color + "EE" }]}>
          <Text style={ss.mapBadgeTxt}>{info.label}</Text>
          <Text style={ss.mapBadgeSub}>PM2.5: {(data?.pm25 || 0).toFixed(1)} µg/m³</Text>
        </View>

        {/* Badge GPS */}
        <View style={[ss.gpsBadge, { backgroundColor: data?.gps_valido ? C.green + "EE" : "#333333EE" }]}>
          <MaterialCommunityIcons
            name="satellite-variant"
            size={12}
            color={data?.gps_valido ? "#fff" : C.text3}
          />
          <Text style={[ss.gpsBadgeTxt, { color: data?.gps_valido ? "#fff" : C.text3 }]}>
            {data?.gps_valido ? `GPS real · ${data?.satelites || 0} sats` : "Ubicación por defecto"}
          </Text>
        </View>
      </View>

      {/* ── INFO ESTACIÓN ───────────────────────────── */}
      <Card style={ss.card}>
        <View style={ss.cardHeader}>
          <Text style={ss.cardTitle}>Ubicación de la estación</Text>
          <LiveDot />
        </View>

        {!data?.gps_valido && (
          <View style={ss.gpsSinSenal}>
            <MaterialCommunityIcons name="satellite-variant" size={14} color={C.orange} />
            <Text style={ss.gpsSinSenalTxt}>
              GPS buscando señal — mostrando ubicación por defecto de Culiacán.
            </Text>
          </View>
        )}

        <SensorRow icon="crosshairs-gps"    label="Latitud"            value={lat.toFixed(6)}          unit="°N"        color={data?.gps_valido ? C.green : C.text3} />
        <SensorRow icon="crosshairs-gps"    label="Longitud"           value={Math.abs(lng).toFixed(6)} unit="°O"        color={data?.gps_valido ? C.green : C.text3} />
        <SensorRow icon="satellite-variant" label="Satélites"          value={data?.satelites || 0}     unit="conectados" color={data?.gps_valido ? C.green : C.text3} />
        <SensorRow icon="map-marker"        label="Estación"           value={data?.nombre || "Estacion 1"} unit=""     color={C.green} />
        <SensorRow icon="clock-outline"     label="Última actualización" value={timeSince(data?.timestamp, data?.receivedAt)} unit="" color={C.text2} />
      </Card>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  mapWrap:      { height: 300, marginHorizontal: 16, marginTop: 4, marginBottom: 12,
                  borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: C.border,
                  position: "relative" },
  mapBadge:     { position: "absolute", top: 12, left: 12, paddingHorizontal: 12,
                  paddingVertical: 6, borderRadius: 10, zIndex: 10 },
  mapBadgeTxt:  { fontSize: 12, fontWeight: "800", color: "#fff" },
  mapBadgeSub:  { fontSize: 10, color: "rgba(255,255,255,.85)", marginTop: 1 },
  gpsBadge:     { position: "absolute", top: 12, right: 12, flexDirection: "row",
                  alignItems: "center", gap: 4, paddingHorizontal: 10,
                  paddingVertical: 6, borderRadius: 10, zIndex: 10 },
  gpsBadgeTxt:  { fontSize: 10, fontWeight: "700" },
  card:         { marginHorizontal: 16, marginBottom: 12 },
  cardHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardTitle:    { fontSize: 13, fontWeight: "700", color: C.text },
  gpsSinSenal:  { flexDirection: "row", alignItems: "flex-start", gap: 8,
                  backgroundColor: C.orange + "15", borderRadius: 10, padding: 10,
                  marginBottom: 10, borderWidth: 1, borderColor: C.orange + "33" },
  gpsSinSenalTxt: { flex: 1, fontSize: 11, color: C.orange, lineHeight: 16 },
});
