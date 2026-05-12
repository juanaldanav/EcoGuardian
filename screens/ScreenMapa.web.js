// ============================================================
//   ScreenMapa.web.js — Mapa web con Leaflet + CartoDB Positron
//   Tile layer claro/minimalista, marcador SVG personalizado
// ============================================================
import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import LiveDot   from "../components/LiveDot";
import { useStation } from "../hooks/useFirebase";
import { getInfo, timeSince } from "../utils/helpers";
import { C } from "../constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const LAT_DEFAULT = 24.7931;
const LNG_DEFAULT = -107.3939;

// Genera el HTML de Leaflet como blob URL para evitar limitaciones del iframe src
function buildMapHTML(lat, lng, color) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, scrollWheelZoom: false })
               .setView([${lat}, ${lng}], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);

    var pinColor = '${color}';

    var icon = L.divIcon({
      html: '<div style="width:38px;height:38px;background:' + pinColor + ';border-radius:50%;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.18);display:flex;align-items:center;justify-content:center;">'
          + '<svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">'
          + '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>'
          + '<path d="M12 2C8.69 2 6 4.69 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.31-2.69-6-6-6zm0 8.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6 12 6s2.5 1.12 2.5 2.5S13.38 10.5 12 10.5z"/>'
          + '</svg></div>',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      className: ''
    });

    L.marker([${lat}, ${lng}], { icon: icon }).addTo(map);

    L.circle([${lat}, ${lng}], {
      radius: 220,
      color: pinColor,
      fillColor: pinColor,
      fillOpacity: 0.07,
      weight: 1.5
    }).addTo(map);
  <\/script>
</body>
</html>`;
}

function WebMap({ lat, lng, color }) {
  const ref     = useRef(null);
  const blobRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    // Revoca el blob anterior para no acumular memoria
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);

    const html = buildMapHTML(lat, lng, color);
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    blobRef.current = url;

    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.title = "EcoGuardian Mapa";
    iframe.style.cssText = "width:100%;height:100%;border:none;border-radius:16px;display:block;";

    ref.current.innerHTML = "";
    ref.current.appendChild(iframe);

    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, [lat, lng, color]);

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
        <View style={[ss.gpsBadge, { backgroundColor: data?.gps_valido ? C.green + "EE" : "#6B6B6BCC" }]}>
          <MaterialCommunityIcons
            name="satellite-variant"
            size={12}
            color="#fff"
          />
          <Text style={ss.gpsBadgeTxt}>
            {data?.gps_valido ? `GPS real · ${data?.satelites || 0} sats` : "Ubicación por defecto"}
          </Text>
        </View>
      </View>

      {/* ── BOTTOM SHEET ESTACIÓN ───────────────────── */}
      <View style={ss.bottomSheet}>
        <View style={ss.sheetTop}>
          <View style={{ flex:1 }}>
            <Text style={ss.stationName}>{data?.nombre || "Estación 1"}</Text>
            {lat !== LAT_DEFAULT && (
              <Text style={ss.stationCoords}>
                {lat.toFixed(5)} °N · {lng.toFixed(5)} °O
              </Text>
            )}
          </View>
          <View style={[ss.levelPill, { backgroundColor:info.color+"18" }]}>
            <Text style={[ss.levelPillTxt, { color:info.color }]}>
              {info.label.toUpperCase()}
            </Text>
          </View>
        </View>

        {!data?.gps_valido && (
          <View style={ss.gpsSinSenal}>
            <MaterialCommunityIcons name="satellite-variant" size={13} color={C.orange} />
            <Text style={ss.gpsSinSenalTxt}>GPS buscando señal — ubicación por defecto</Text>
          </View>
        )}

        <View style={ss.valsGrid}>
          {[
            { lbl:"PM2.5", val:(data?.pm25||0).toFixed(1), color:info.color },
            { lbl:"PM10",  val:(data?.pm10||0).toFixed(1), color:C.yellow   },
            { lbl:"CO₂",  val:Math.round(data?.co2||0),   color:C.text2    },
          ].map((item, i) => (
            <View key={i} style={ss.valBox}>
              <Text style={ss.valLbl}>{item.lbl}</Text>
              <Text style={[ss.valNum, { color:item.color }]}>{item.val}</Text>
            </View>
          ))}
        </View>

        <View style={ss.sheetFooter}>
          <LiveDot />
          <Text style={ss.sheetFooterTxt}>
            Actualizado hace {timeSince(data?.timestamp) ?? "---"}
          </Text>
        </View>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  mapWrap:      { height: 320, marginHorizontal: 16, marginTop: 4, marginBottom: 12,
                  borderRadius: 16, overflow: "hidden",
                  position: "relative",
                  shadowColor: "#1C2B1E", shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  mapBadge:     { position: "absolute", top: 12, left: 12, paddingHorizontal: 12,
                  paddingVertical: 6, borderRadius: 20, zIndex: 10 },
  mapBadgeTxt:  { fontFamily: "Outfit_700Bold", fontSize: 12, color: "#fff" },
  mapBadgeSub:  { fontFamily: "JetBrainsMono_400Regular", fontSize: 10, color: "rgba(255,255,255,.85)", marginTop: 1 },
  gpsBadge:     { position: "absolute", top: 12, right: 12, flexDirection: "row",
                  alignItems: "center", gap: 5, paddingHorizontal: 10,
                  paddingVertical: 6, borderRadius: 20, zIndex: 10 },
  gpsBadgeTxt:  { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: "#fff" },
  bottomSheet:   { marginHorizontal: 16, marginBottom: 12,
                   backgroundColor: C.card, borderRadius: 18, padding: 14,
                   shadowColor: "#1C2B1E", shadowOffset: { width: 0, height: -2 },
                   shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  sheetTop:      { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  stationName:   { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.text, lineHeight: 20 },
  stationCoords: { fontFamily: "JetBrainsMono_400Regular", fontSize: 9,
                   color: C.text3, marginTop: 2 },
  levelPill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  levelPillTxt:  { fontFamily: "JetBrainsMono_400Regular", fontSize: 9,
                   fontWeight: "700", letterSpacing: 1 },
  gpsSinSenal:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  gpsSinSenalTxt:{ fontFamily: "Outfit_400Regular", fontSize: 11, color: C.text3 },
  valsGrid:      { flexDirection: "row", gap: 8, marginBottom: 10 },
  valBox:        { flex: 1, backgroundColor: C.bg2, borderRadius: 10, padding: 10,
                   alignItems: "center" },
  valLbl:        { fontFamily: "JetBrainsMono_400Regular", fontSize: 8,
                   color: C.text3, letterSpacing: 0.8, marginBottom: 4 },
  valNum:        { fontFamily: "JetBrainsMono_400Regular", fontSize: 15, fontWeight: "700" },
  sheetFooter:   { flexDirection: "row", alignItems: "center", gap: 6 },
  sheetFooterTxt:{ fontFamily: "Outfit_400Regular", fontSize: 11, color: C.text3 },
});
