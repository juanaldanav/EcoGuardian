// ============================================================
//   ScreenAlertas.js — Pantalla de alertas
// ============================================================
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import LiveDot from "../components/LiveDot";
import { useStation, useAlerts } from "../hooks/useFirebase";
import { getInfo, timeSince } from "../utils/helpers";
import { C } from "../constants/colors";

const OMS_LEVELS = [
  { color:C.green,  label:"Bueno",     rango:"0 – 12",   desc:"Sin riesgo para la salud" },
  { color:C.yellow, label:"Moderado",  rango:"12 – 35",  desc:"Grupos sensibles afectados" },
  { color:C.orange, label:"Malo",      rango:"35 – 55",  desc:"Reduce actividad al aire libre" },
  { color:C.red,    label:"Muy malo",  rango:"55 – 150", desc:"Evita salir, usa cubrebocas" },
  { color:C.purple, label:"Peligroso", rango:"> 150",    desc:"Emergencia — quédate en interiores" },
];

const OMS_BAR_COLORS = [C.green, C.yellow, C.orange, C.red, C.purple];
const OMS_MARKS = ["0", "12", "35", "55", "150", "500"];

export default function ScreenAlertas() {
  const { data }  = useStation();
  const alerts    = useAlerts();
  const info      = getInfo(data?.pm25 || 0);
  const alarmaActiva = data?.alarma && data?.pm25 > 35;

  return (
    <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>
      <View style={ss.container}>

        {/* ── BANNER CRÍTICO (solo si hay alarma) ─── */}
        {alarmaActiva && (
          <View style={ss.criticalBanner}>
            <View style={ss.bannerIconRow}>
              <Ionicons name="warning" size={15} color="#fff" />
              <Text style={ss.bannerTag}>ALERTA ACTIVA · AHORA</Text>
            </View>
            <Text style={ss.bannerTitle}>{info.label} detectado</Text>
            <Text style={ss.bannerDesc}>
              PM2.5 supera el umbral seguro de la OMS (35 µg/m³). Reduce actividad al aire libre.
            </Text>
            <View style={ss.bannerMeta}>
              <Text style={ss.bannerMetaTxt}>{data?.nombre || "ESTACIÓN 1"}</Text>
              <Text style={ss.bannerMetaTxt}>{(data.pm25).toFixed(1)} µg/m³</Text>
              <Text style={ss.bannerMetaTxt}>HACE {timeSince(data?.timestamp) ?? "---"}</Text>
            </View>
          </View>
        )}

        {/* ── ESTADO ACTUAL ───────────────────────── */}
        <View style={ss.card}>
          <View style={ss.cardHeader}>
            <Text style={ss.cardTitle}>Estado actual</Text>
            <LiveDot />
          </View>
          <View style={[ss.estadoBox, { backgroundColor:info.color+"12" }]}>
            <View style={[ss.estadoIconBox, { backgroundColor:info.color }]}>
              <Ionicons name="leaf" size={22} color="#fff" />
            </View>
            <View style={{ flex:1, marginLeft:14 }}>
              <Text style={[ss.estadoLabel, { color:info.color }]}>{info.label}</Text>
              <Text style={ss.estadoSub}>PM2.5: {(data?.pm25||0).toFixed(1)} µg/m³</Text>
              <Text style={ss.estadoTs}>Actualizado hace {timeSince(data?.timestamp) ?? "---"}</Text>
            </View>
          </View>
        </View>

        {/* ── ESCALA OMS VISUAL ───────────────────── */}
        <View style={ss.card}>
          <Text style={[ss.cardTitle, { marginBottom:12 }]}>Escala de calidad — OMS</Text>

          {/* Barra de color continua */}
          <View style={ss.scaleBar}>
            {OMS_BAR_COLORS.map((color, i) => (
              <View key={i} style={[ss.scaleSegment, { backgroundColor:color }]} />
            ))}
          </View>
          {/* Marcas numéricas */}
          <View style={ss.scaleMarks}>
            {OMS_MARKS.map(m => (
              <Text key={m} style={ss.scaleMark}>{m}</Text>
            ))}
          </View>

          {/* Filas de niveles */}
          {OMS_LEVELS.map((n, i) => (
            <View
              key={i}
              style={[
                ss.levelRow,
                i < OMS_LEVELS.length - 1 && ss.levelRowBorder,
                info.label === n.label && { backgroundColor:n.color+"0D", borderRadius:10 },
              ]}
            >
              <View style={[ss.levelDot, { backgroundColor:n.color }]} />
              <View style={{ flex:1 }}>
                <Text style={[ss.levelName, info.label === n.label && { color:n.color, fontWeight:"700" }]}>
                  {n.label}
                </Text>
                <Text style={ss.levelDesc}>{n.desc}</Text>
              </View>
              <Text style={ss.levelRange}>{n.rango}</Text>
            </View>
          ))}
        </View>

        {/* ── HISTORIAL DE ALERTAS ────────────────── */}
        <View style={ss.card}>
          <Text style={[ss.cardTitle, { marginBottom:12 }]}>
            HISTORIAL · ÚLTIMAS 24H
          </Text>
          {alerts.length === 0
            ? <View style={ss.emptyBox}>
                <MaterialCommunityIcons name="check-circle-outline" size={32} color={C.green} />
                <Text style={ss.emptyTitle}>Sin alertas activas</Text>
                <Text style={ss.emptySub}>
                  El aire está en buenos niveles. Las alertas aparecen cuando PM2.5 supera 35 µg/m³.
                </Text>
              </View>
            : alerts.map((a, i) => {
                const ni = getInfo(a.pm25 || 0);
                return (
                  <View
                    key={i}
                    style={[ss.alertRow, i < alerts.length - 1 && ss.alertRowBorder]}
                  >
                    <View style={[ss.alertIco, { backgroundColor:ni.color + "22" }]}>
                      <Ionicons name="warning" size={15} color={ni.color} />
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={[ss.alertLevel, { color:ni.color }]}>{ni.label}</Text>
                      <Text style={ss.alertMeta}>
                        {a.estacion || "Estación"} · hace {timeSince(a.ts) ?? "---"}
                      </Text>
                    </View>
                    <Text style={[ss.alertVal, { color:ni.color }]}>
                      {Math.round(a.pm25||0)}
                    </Text>
                  </View>
                );
              })
          }
        </View>

        <View style={{ height:24 }} />
      </View>
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  container:       { paddingTop:4 },

  // Banner crítico
  criticalBanner:  { margin:14, marginBottom:0, backgroundColor:C.red,
                     borderRadius:14, padding:16,
                     borderWidth:1.5, borderColor:"#7F1414",
                     overflow:"hidden" },
  bannerIconRow:   { flexDirection:"row", alignItems:"center", gap:6, marginBottom:6 },
  bannerTag:       { fontFamily:"JetBrainsMono_400Regular", fontSize:9,
                     color:"rgba(255,255,255,0.9)", letterSpacing:2 },
  bannerTitle:     { fontFamily:"Outfit_700Bold", fontSize:16, color:"#fff", marginBottom:4 },
  bannerDesc:      { fontFamily:"Outfit_400Regular", fontSize:12,
                     color:"rgba(255,255,255,0.85)", lineHeight:18 },
  bannerMeta:      { flexDirection:"row", gap:14, marginTop:10,
                     paddingTop:10, borderTopWidth:1,
                     borderTopColor:"rgba(255,255,255,0.18)" },
  bannerMetaTxt:   { fontFamily:"JetBrainsMono_400Regular", fontSize:9,
                     color:"rgba(255,255,255,0.8)", letterSpacing:0.8 },

  // Cards genéricas
  card:            { marginHorizontal:14, marginTop:12, marginBottom:0,
                     backgroundColor:C.card, borderRadius:16, padding:14,
                     shadowColor:"#1C2B1E", shadowOffset:{width:0,height:2},
                     shadowOpacity:.07, shadowRadius:8, elevation:2 },
  cardHeader:      { flexDirection:"row", alignItems:"center",
                     justifyContent:"space-between", marginBottom:12 },
  cardTitle:       { fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.text,
                     letterSpacing:0.5, textTransform:"uppercase" },

  // Estado actual
  estadoBox:       { flexDirection:"row", alignItems:"center",
                     padding:14, borderRadius:12 },
  estadoIconBox:   { width:44, height:44, borderRadius:12,
                     alignItems:"center", justifyContent:"center" },
  estadoLabel:     { fontFamily:"Outfit_700Bold", fontSize:22 },
  estadoSub:       { fontFamily:"Outfit_400Regular", fontSize:12, color:C.text2, marginTop:3 },
  estadoTs:        { fontFamily:"JetBrainsMono_400Regular", fontSize:10,
                     color:C.text3, marginTop:2 },

  // Escala OMS
  scaleBar:        { flexDirection:"row", height:8, borderRadius:4, overflow:"hidden",
                     marginBottom:6 },
  scaleSegment:    { flex:1 },
  scaleMarks:      { flexDirection:"row", justifyContent:"space-between", marginBottom:12 },
  scaleMark:       { fontFamily:"JetBrainsMono_400Regular", fontSize:8,
                     color:C.text3, letterSpacing:0.3 },
  levelRow:        { flexDirection:"row", alignItems:"center",
                     paddingVertical:8, paddingHorizontal:6, gap:10 },
  levelRowBorder:  { borderBottomWidth:0.5, borderBottomColor:C.border },
  levelDot:        { width:8, height:8, borderRadius:4, flexShrink:0 },
  levelName:       { fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.text },
  levelDesc:       { fontFamily:"Outfit_400Regular", fontSize:10, color:C.text3, marginTop:1 },
  levelRange:      { fontFamily:"JetBrainsMono_400Regular", fontSize:10, color:C.text3 },

  // Historial de alertas
  emptyBox:        { alignItems:"center", padding:24, gap:8 },
  emptyTitle:      { fontFamily:"Outfit_700Bold", fontSize:14, color:C.green },
  emptySub:        { fontFamily:"Outfit_400Regular", fontSize:12, color:C.text3,
                     textAlign:"center", lineHeight:18 },
  alertRow:        { flexDirection:"row", alignItems:"center",
                     paddingVertical:10, gap:10 },
  alertRowBorder:  { borderBottomWidth:0.5, borderBottomColor:C.border },
  alertIco:        { width:34, height:34, borderRadius:10,
                     alignItems:"center", justifyContent:"center", flexShrink:0 },
  alertLevel:      { fontFamily:"Outfit_600SemiBold", fontSize:12 },
  alertMeta:       { fontFamily:"JetBrainsMono_400Regular", fontSize:9,
                     color:C.text3, marginTop:2, letterSpacing:0.3 },
  alertVal:        { fontFamily:"JetBrainsMono_400Regular", fontSize:14, fontWeight:"700" },
});
