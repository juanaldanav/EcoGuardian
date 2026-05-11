// ============================================================
//   ScreenHistorial.js — Pantalla de historial y gráfica
// ============================================================
import React from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import Card from "../components/Card";
import { useHistory } from "../hooks/useFirebase";
import { getInfo, fmtTime } from "../utils/helpers";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";

export default function ScreenHistorial() {
  const { hist, loading } = useHistory();
  const maxPM = hist.length ? Math.max(...hist.map(h => h.pm25||0), 1) : 1;

  return (
    <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>

      {/* ── GRÁFICA DE BARRAS ───────────────────────── */}
      <Card style={ss.card}>
        <View style={ss.cardHeader}>
          <Text style={ss.cardTitle}>PM2.5 — Últimas lecturas</Text>
          <Text style={{ fontSize:11, color:C.text3 }}>{hist.length} pts</Text>
        </View>
        {loading
          ? <ActivityIndicator color={C.green} style={{ padding:30 }} />
          : <View style={ss.chartWrap}>
              {/* Líneas guía */}
              {[75, 50, 25].map(p => (
                <View key={p} style={[ss.guia, { bottom:`${p}%` }]}>
                  <Text style={ss.guiaTxt}>{((maxPM*p)/100).toFixed(0)}</Text>
                </View>
              ))}
              {/* Barras */}
              <View style={ss.barsRow}>
                {hist.slice(0, 20).reverse().map((h, i) => {
                  const pct = Math.max(4, ((h.pm25||0)/maxPM)*100);
                  const ni  = getInfo(h.pm25||0);
                  return (
                    <View key={i} style={ss.barWrap}>
                      <View style={[ss.bar, { height:`${pct}%`, backgroundColor:ni.color }]} />
                    </View>
                  );
                })}
              </View>
            </View>
        }
      </Card>

      {/* ── TABLA DE HISTORIAL ──────────────────────── */}
      <Card style={ss.card}>
        <View style={ss.cardHeader}>
          <Text style={ss.cardTitle}>Registro histórico</Text>
          <Text style={{ fontSize:11, color:C.green }}>{hist.length} entradas</Text>
        </View>
        {loading
          ? <ActivityIndicator color={C.green} style={{ padding:20 }} />
          : hist.length === 0
            ? <Text style={{ color:C.text2, textAlign:"center", padding:20, fontSize:13 }}>
                Sin historial aún. El ESP32 guarda datos cada 30 seg.
              </Text>
            : hist.map((h, i) => {
                const ni = getInfo(h.pm25||0);
                return (
                  <View key={i} style={[ss.histRow, i<hist.length-1&&{ borderBottomWidth:1, borderBottomColor:C.border }]}>
                    <Text style={ss.histTime}>{fmtTime(h.ts)}</Text>
                    <View style={{ flex:1, alignItems:"center" }}>
                      <Text style={[ss.histPM, { color:ni.color }]}>{(h.pm25||0).toFixed(1)}</Text>
                      <Text style={ss.histUnit}>µg/m³</Text>
                    </View>
                    <View style={[ss.histBadge, { backgroundColor:ni.color+"22", borderColor:ni.color+"44" }]}>
                      <Text style={[ss.histBadgeTxt, { color:ni.color }]}>{ni.emoji} {ni.label}</Text>
                    </View>
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
  chartWrap:  { height:120, marginTop:8, position:"relative" },
  guia:       { position:"absolute", left:0, right:0, borderTopWidth:1, borderTopColor:C.border+"55" },
  guiaTxt:    { fontSize:9, color:C.text3, marginLeft:2 },
  barsRow:    { flexDirection:"row", alignItems:"flex-end", height:"100%", gap:3, paddingLeft:20 },
  barWrap:    { flex:1, height:"100%", justifyContent:"flex-end" },
  bar:        { borderRadius:4, minHeight:4 },
  histRow:    { flexDirection:"row", alignItems:"center", paddingVertical:10, gap:8 },
  histTime:   { fontFamily:"JetBrainsMono_400Regular", fontSize:11, color:C.text3, width:46 },
  histPM:     { fontFamily:"JetBrainsMono_400Regular", fontSize:15, fontWeight:"700" },
  histUnit:   { fontFamily:"JetBrainsMono_400Regular", fontSize:9, color:C.text3 },
  histBadge:  { paddingHorizontal:8, paddingVertical:3, borderRadius:8, borderWidth:1 },
  histBadgeTxt:{ fontFamily:"Outfit_600SemiBold", fontSize:10 },
});