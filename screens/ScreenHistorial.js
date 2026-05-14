import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Card from "../components/Card";
import { useHistory } from "../hooks/useFirebase";
import { useAuth } from "../hooks/useAuth";
import { useStationContext } from "../context/StationContext";
import { getInfo, fmtTime } from "../utils/helpers";
import { C } from "../constants/colors";

const FILAS_INICIALES = 5;

export default function ScreenHistorial() {
  const { selectedId, isExplorer } = useStationContext();
  const stationId         = selectedId;
  const { hist, loading } = useHistory(stationId);
  const [barSel, setBarSel]       = useState(null);
  const [mostrarTodo, setMostrar] = useState(false);

  const maxPM = hist.length ? Math.max(...hist.map(h => h.pm25 || 0), 1) : 1;
  const barras = hist.slice(0, 20).reverse();
  const filas  = mostrarTodo ? hist : hist.slice(0, FILAS_INICIALES);

  if (isExplorer) {
    return (
      <View style={ss.emptyWrap}>
        <View style={ss.emptyIcoBox}>
          <MaterialCommunityIcons name="lock-outline" size={34} color={C.text3} />
        </View>
        <Text style={ss.emptyTitle}>Solo para suscriptores</Text>
        <Text style={[ss.emptyDesc, { textAlign:"center" }]}>
          El historial requiere un dispositivo EcoG activo.{"\n"}Ve a Ajustes para adoptar tu estación.
        </Text>
      </View>
    );
  }

  if (!stationId) {
    return (
      <View style={ss.emptyWrap}>
        <View style={ss.emptyIcoBox}>
          <MaterialCommunityIcons name="chart-timeline-variant-shimmer" size={36} color={C.text3} />
        </View>
        <Text style={ss.emptyTitle}>Sin historial disponible</Text>
        <Text style={ss.emptyDesc}>Conectando con la red...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

      {/* ── GRÁFICA DE BARRAS ───────────────────────── */}
      <Card style={ss.card}>
        <View style={ss.cardHeader}>
          <Text style={ss.cardTitle}>PM2.5 — Últimas lecturas</Text>
          <Text style={{ fontSize: 11, color: C.text3 }}>{hist.length} pts</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={C.green} style={{ padding: 30 }} />
        ) : (
          <>
            <View style={ss.chartWrap}>
              {[75, 50, 25].map(p => (
                <View key={p} style={[ss.guia, { bottom: `${p}%` }]}>
                  <Text style={ss.guiaTxt}>{((maxPM * p) / 100).toFixed(0)}</Text>
                </View>
              ))}
              <View style={ss.barsRow}>
                {barras.map((h, i) => {
                  const pct = Math.max(4, ((h.pm25 || 0) / maxPM) * 100);
                  const ni  = getInfo(h.pm25 || 0);
                  const sel = barSel === i;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={ss.barWrap}
                      onPress={() => setBarSel(sel ? null : i)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        ss.bar,
                        { height: `${pct}%`, backgroundColor: ni.color },
                        sel && { opacity: 0.7, borderWidth: 2, borderColor: ni.color },
                      ]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tooltip al tocar barra */}
            {barSel !== null && barras[barSel] && (() => {
              const h  = barras[barSel];
              const ni = getInfo(h.pm25 || 0);
              return (
                <View style={[ss.tooltip, { borderLeftColor: ni.color }]}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[ss.tooltipNivel, { color: ni.color }]}>{ni.label}</Text>
                    <Text style={ss.tooltipTime}>{fmtTime(h.ts)}</Text>
                  </View>
                  <View style={ss.tooltipRow}>
                    <MaterialCommunityIcons name="air-purifier"  size={13} color={C.text3} />
                    <Text style={ss.tooltipLbl}>PM2.5</Text>
                    <Text style={[ss.tooltipVal, { color: ni.color }]}>{(h.pm25 || 0).toFixed(1)} µg/m³</Text>
                  </View>
                  <View style={ss.tooltipRow}>
                    <MaterialCommunityIcons name="blur"          size={13} color={C.text3} />
                    <Text style={ss.tooltipLbl}>PM10</Text>
                    <Text style={ss.tooltipVal}>{(h.pm10 || 0).toFixed(1)} µg/m³</Text>
                  </View>
                  <View style={ss.tooltipRow}>
                    <MaterialCommunityIcons name="molecule-co2"  size={13} color={C.text3} />
                    <Text style={ss.tooltipLbl}>CO₂</Text>
                    <Text style={ss.tooltipVal}>{Math.round(h.co2 || 0)} ppm</Text>
                  </View>
                  {h.tvoc !== undefined && (
                    <View style={ss.tooltipRow}>
                      <MaterialCommunityIcons name="chemical-weapon" size={13} color={C.text3} />
                      <Text style={ss.tooltipLbl}>TVOC</Text>
                      <Text style={ss.tooltipVal}>{Math.round(h.tvoc || 0)} ppb</Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </>
        )}
      </Card>

      {/* ── TABLA DE HISTORIAL ──────────────────────── */}
      <Card style={ss.card}>
        <View style={ss.cardHeader}>
          <Text style={ss.cardTitle}>Registro histórico</Text>
          <Text style={{ fontSize: 11, color: C.green }}>{hist.length} entradas</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={C.green} style={{ padding: 20 }} />
        ) : hist.length === 0 ? (
          <Text style={{ color: C.text2, textAlign: "center", padding: 20, fontSize: 13 }}>
            Sin historial aún. El ESP32 guarda datos cada 30 seg.
          </Text>
        ) : (
          <>
            {filas.map((h, i) => {
              const ni = getInfo(h.pm25 || 0);
              return (
                <View
                  key={i}
                  style={[ss.histRow, i < filas.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                >
                  <Text style={ss.histTime}>{fmtTime(h.ts)}</Text>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={[ss.histPM, { color: ni.color }]}>{(h.pm25 || 0).toFixed(1)}</Text>
                    <Text style={ss.histUnit}>µg/m³</Text>
                  </View>
                  <View style={[ss.histBadge, { backgroundColor: ni.color + "18" }]}>
                    <Text style={[ss.histBadgeTxt, { color: ni.color }]}>{ni.label}</Text>
                  </View>
                </View>
              );
            })}

            {hist.length > FILAS_INICIALES && (
              <TouchableOpacity
                style={ss.verMasBtn}
                onPress={() => setMostrar(v => !v)}
                activeOpacity={0.7}
              >
                <Text style={ss.verMasTxt}>
                  {mostrarTodo ? "Ver menos" : `Ver ${hist.length - FILAS_INICIALES} más`}
                </Text>
                <MaterialCommunityIcons
                  name={mostrarTodo ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={C.green}
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </Card>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  emptyWrap:   { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyIcoBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: C.bg2,
                 alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle:  { fontFamily: "Outfit_700Bold", fontSize: 18, color: C.text, textAlign: "center" },
  emptyDesc:   { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.text2,
                 textAlign: "center", lineHeight: 20 },
  card:        { marginHorizontal: 16, marginTop: 4, marginBottom: 12 },
  cardHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardTitle:   { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.text },
  chartWrap:   { height: 120, marginTop: 8, position: "relative" },
  guia:        { position: "absolute", left: 0, right: 0, borderTopWidth: 1, borderTopColor: C.border + "55" },
  guiaTxt:     { fontSize: 9, color: C.text3, marginLeft: 2 },
  barsRow:     { flexDirection: "row", alignItems: "flex-end", height: "100%", gap: 3, paddingLeft: 20 },
  barWrap:     { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar:         { borderRadius: 4, minHeight: 4 },
  // Tooltip
  tooltip:     {
    marginTop: 12,
    backgroundColor: C.bg2,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    gap: 6,
  },
  tooltipNivel:{ fontFamily: "Outfit_700Bold", fontSize: 13 },
  tooltipTime: { fontFamily: "JetBrainsMono_400Regular", fontSize: 10, color: C.text3 },
  tooltipRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  tooltipLbl:  { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.text3, flex: 1 },
  tooltipVal:  { fontFamily: "JetBrainsMono_400Regular", fontSize: 12, color: C.text2 },
  // Tabla
  histRow:     { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 8 },
  histTime:    { fontFamily: "JetBrainsMono_400Regular", fontSize: 11, color: C.text3, width: 46 },
  histPM:      { fontFamily: "JetBrainsMono_400Regular", fontSize: 15, fontWeight: "700" },
  histUnit:    { fontFamily: "JetBrainsMono_400Regular", fontSize: 9, color: C.text3 },
  histBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  histBadgeTxt:{ fontFamily: "Outfit_600SemiBold", fontSize: 10 },
  verMasBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center",
                 gap: 4, paddingVertical: 12, marginTop: 4,
                 borderTopWidth: 1, borderTopColor: C.border },
  verMasTxt:   { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.green },
});
