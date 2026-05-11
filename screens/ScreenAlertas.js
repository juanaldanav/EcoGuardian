// ============================================================
//   ScreenAlertas.js — Pantalla de alertas
// ============================================================
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card     from "../components/Card";
import LiveDot  from "../components/LiveDot";
import { useStation } from "../hooks/useFirebase";
import { useAlerts }  from "../hooks/useFirebase";
import { getInfo, timeSince } from "../utils/helpers";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";

export default function ScreenAlertas() {
  const { data }  = useStation();
  const alerts    = useAlerts();
  const info      = getInfo(data?.pm25 || 0);

  return (
    <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>

      {/* ── ESTADO ACTUAL ───────────────────────────── */}
      <Card style={ss.card}>
        <View style={ss.cardHeader}>
          <Text style={ss.cardTitle}>Estado actual</Text>
          <LiveDot />
        </View>
        <View style={[ss.estadoBox, { backgroundColor:info.color+"10" }]}>
          <Text style={{ fontSize:40 }}>{info.emoji}</Text>
          <View style={{ flex:1, marginLeft:16 }}>
            <Text style={[ss.estadoLabel, { color:info.color }]}>{info.label}</Text>
            <Text style={{ color:C.text2, fontSize:12, marginTop:4 }}>
              PM2.5: {(data?.pm25||0).toFixed(1)} µg/m³
            </Text>
            <Text style={{ color:C.text3, fontSize:11, marginTop:2 }}>
              Actualizado hace {timeSince(data?.timestamp)}
            </Text>
          </View>
        </View>
      </Card>

      {/* ── ESCALA OMS ──────────────────────────────── */}
      <Card style={ss.card}>
        <Text style={[ss.cardTitle, { marginBottom:12 }]}>Escala OMS — Calidad del Aire</Text>
        {[
          { color:C.green,  label:"Bueno",     rango:"0 – 12 µg/m³",   desc:"Sin riesgo para la salud" },
          { color:C.yellow, label:"Moderado",  rango:"12 – 35 µg/m³",  desc:"Grupos sensibles afectados" },
          { color:C.orange, label:"Malo",      rango:"35 – 55 µg/m³",  desc:"Reduce actividad al aire libre" },
          { color:C.red,    label:"Muy malo",  rango:"55 – 150 µg/m³", desc:"Evita salir, usa cubrebocas" },
          { color:C.purple, label:"Peligroso", rango:"> 150 µg/m³",    desc:"Emergencia — quédate en interiores" },
        ].map((n, i) => (
          <View key={i} style={[ss.escalaRow, i<4&&{ borderBottomWidth:1, borderBottomColor:C.border }]}>
            <View style={{ width:12, height:12, borderRadius:3, backgroundColor:n.color, marginRight:12 }} />
            <View style={{ flex:1 }}>
              <Text style={{ color:C.text, fontSize:13, fontWeight:"700" }}>{n.label}</Text>
              <Text style={{ color:C.text3, fontSize:11 }}>{n.desc}</Text>
            </View>
            <Text style={{ color:C.text2, fontSize:11, fontWeight:"600" }}>{n.rango}</Text>
          </View>
        ))}
      </Card>

      {/* ── HISTORIAL DE ALERTAS ────────────────────── */}
      <Card style={ss.card}>
        <Text style={[ss.cardTitle, { marginBottom:12 }]}>Alertas recientes</Text>
        {alerts.length === 0
          ? <View style={{ alignItems:"center", padding:24, gap:8 }}>
              <Text style={{ color:C.green, fontSize:14, fontWeight:"700" }}>Sin alertas activas</Text>
              <Text style={{ color:C.text3, fontSize:12, textAlign:"center" }}>
                El aire está en buenos niveles. Las alertas aparecen cuando PM2.5 supera 35 µg/m³
              </Text>
            </View>
          : alerts.map((a, i) => {
              const ni = getInfo(a.pm25 || 0);
              return (
                <View key={i} style={[ss.alertaRow, i<alerts.length-1&&{ borderBottomWidth:1, borderBottomColor:C.border }]}>
                  <View style={[ss.alertaIcon, { backgroundColor:ni.color+"22" }]}>
                    <Text style={{ fontSize:16 }}>{ni.emoji}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ color:C.text, fontSize:12, fontWeight:"700" }}>{a.estacion||"Estación"}</Text>
                    <Text style={{ color:ni.color, fontSize:11 }}>{ni.label} — {(a.pm25||0).toFixed(1)} µg/m³</Text>
                    <Text style={{ color:C.text3, fontSize:10, marginTop:2 }}>hace {timeSince(a.ts)}</Text>
                  </View>
                  <Ionicons name="warning" size={18} color={ni.color} />
                </View>
              );
            })
        }
      </Card>
      <View style={{ height:24 }} />
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  card:       { marginHorizontal:16, marginTop:4, marginBottom:12 },
  cardHeader: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:12 },
  cardTitle:  { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.text },
  estadoBox:  { flexDirection:"row", alignItems:"center", padding:16, borderRadius:12 },
  estadoLabel:{ fontFamily:"Outfit_700Bold", fontSize:22 },
  escalaRow:  { flexDirection:"row", alignItems:"center", paddingVertical:10 },
  alertaRow:  { flexDirection:"row", alignItems:"center", paddingVertical:10, gap:10 },
  alertaIcon: { width:36, height:36, borderRadius:10, alignItems:"center", justifyContent:"center" },
});