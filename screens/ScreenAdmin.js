// ============================================================
//   ScreenAdmin.js — Panel de administración
// ============================================================
import React, { useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useStations } from "../hooks/useFirebase";
import { useAllUsers } from "../hooks/useFirebase";
import { isDeviceOnline } from "../utils/helpers";
import { C } from "../constants/colors";

function fmtFecha(ts) {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("es-MX", { day:"2-digit", month:"short", year:"numeric" });
}

export default function ScreenAdmin({ onBack }) {
  const { stations, loading: loadSt } = useStations();
  const { users,    loading: loadUs } = useAllUsers();

  // Mapeo estacionId → usuario vinculado
  const stationOwner = useMemo(() => {
    const map = {};
    Object.entries(users).forEach(([uid, u]) => {
      Object.keys(u.estaciones || {}).forEach(sid => {
        if (!map[sid]) map[sid] = [];
        map[sid].push({ uid, nombre: u.nombre, email: u.email });
      });
    });
    return map;
  }, [users]);

  const lista = Object.entries(stations);
  const online = lista.filter(([, d]) => isDeviceOnline(d)).length;
  const totalUsuarios = Object.keys(users).filter(uid => users[uid].rol !== "admin").length;

  if (loadSt || loadUs) {
    return (
      <View style={ss.centered}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }

  return (
    <View style={ss.root}>
      {/* Header */}
      <View style={ss.header}>
        <TouchableOpacity style={ss.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={ss.headerTitle}>Panel Admin</Text>
      </View>

      <ScrollView contentContainerStyle={ss.body} showsVerticalScrollIndicator={false}>

        {/* Resumen */}
        <View style={ss.statsRow}>
          <View style={ss.statCard}>
            <MaterialCommunityIcons name="access-point" size={22} color={C.green} />
            <Text style={ss.statNum}>{lista.length}</Text>
            <Text style={ss.statLabel}>Dispositivos</Text>
          </View>
          <View style={ss.statCard}>
            <MaterialCommunityIcons name="wifi" size={22} color={C.accent} />
            <Text style={ss.statNum}>{online}</Text>
            <Text style={ss.statLabel}>En línea</Text>
          </View>
          <View style={ss.statCard}>
            <Ionicons name="people" size={22} color={C.text2} />
            <Text style={ss.statNum}>{totalUsuarios}</Text>
            <Text style={ss.statLabel}>Usuarios</Text>
          </View>
        </View>

        {/* Lista de dispositivos */}
        <Text style={ss.sectionTitle}>Dispositivos registrados</Text>

        {lista.length === 0 && (
          <View style={ss.emptyWrap}>
            <Text style={ss.emptyTxt}>Sin dispositivos en la red</Text>
          </View>
        )}

        {lista.map(([sid, st]) => {
          const vivo    = isDeviceOnline(st);
          const duenos  = stationOwner[sid] || [];
          return (
            <View key={sid} style={ss.deviceCard}>
              {/* Estado online */}
              <View style={ss.deviceHeader}>
                <View style={[ss.statusDot, { backgroundColor: vivo ? C.accent : C.text3 }]} />
                <Text style={ss.deviceName} numberOfLines={1}>
                  {st.nombre || sid}
                </Text>
                <View style={[ss.badge, { backgroundColor: vivo ? C.accent + "20" : C.bg3 }]}>
                  <Text style={[ss.badgeTxt, { color: vivo ? C.accent : C.text3 }]}>
                    {vivo ? "EN LÍNEA" : "OFFLINE"}
                  </Text>
                </View>
              </View>

              {/* ID */}
              <Text style={ss.deviceId}>{sid}</Text>

              {/* Métricas rápidas */}
              {vivo && (
                <View style={ss.metricsRow}>
                  <Text style={ss.metric}>PM2.5 <Text style={ss.metricVal}>{st.pm25?.toFixed(1) ?? "—"}</Text></Text>
                  <Text style={ss.metric}>CO₂ <Text style={ss.metricVal}>{st.co2 ?? "—"}</Text></Text>
                  <Text style={ss.metric}>TVOC <Text style={ss.metricVal}>{st.tvoc ?? "—"}</Text></Text>
                </View>
              )}

              <View style={ss.divider} />

              {/* Cuenta(s) vinculada(s) */}
              {duenos.length === 0 ? (
                <Text style={ss.noOwner}>Sin cuenta vinculada</Text>
              ) : (
                duenos.map((d, i) => (
                  <View key={i} style={ss.ownerRow}>
                    <Ionicons name="person-circle-outline" size={16} color={C.text3} />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={ss.ownerName}>{d.nombre}</Text>
                      <Text style={ss.ownerEmail}>{d.email}</Text>
                    </View>
                  </View>
                ))
              )}

              {/* Fecha registro del primer dueño */}
              {duenos.length > 0 && users[duenos[0].uid]?.creadoEn && (
                <Text style={ss.regDate}>
                  Registrado: {fmtFecha(users[duenos[0].uid].creadoEn)}
                </Text>
              )}
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  centered:    { flex: 1, alignItems: "center", justifyContent: "center" },

  header:      { flexDirection: "row", alignItems: "center",
                 paddingHorizontal: 16, paddingVertical: 14,
                 borderBottomWidth: 1, borderBottomColor: C.border,
                 backgroundColor: C.bg },
  backBtn:     { padding: 6, marginRight: 10 },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: C.text },

  body:        { paddingHorizontal: 16, paddingTop: 16 },

  statsRow:    { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard:    { flex: 1, backgroundColor: C.card, borderRadius: 16,
                 borderWidth: 1, borderColor: C.border,
                 alignItems: "center", paddingVertical: 16, gap: 4 },
  statNum:     { fontFamily: "Outfit_700Bold", fontSize: 24, color: C.text },
  statLabel:   { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.text3 },

  sectionTitle:{ fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.text2,
                 letterSpacing: 0.6, marginBottom: 12 },

  deviceCard:  { backgroundColor: C.card, borderRadius: 16,
                 borderWidth: 1, borderColor: C.border,
                 padding: 16, marginBottom: 12 },
  deviceHeader:{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },
  deviceName:  { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: C.text, flex: 1 },
  deviceId:    { fontFamily: "JetBrainsMono_400Regular", fontSize: 10,
                 color: C.text3, marginBottom: 8 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeTxt:    { fontFamily: "JetBrainsMono_400Regular", fontSize: 9, letterSpacing: 0.5 },

  metricsRow:  { flexDirection: "row", gap: 16, marginBottom: 8 },
  metric:      { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.text3 },
  metricVal:   { fontFamily: "Outfit_600SemiBold", color: C.text },

  divider:     { height: 1, backgroundColor: C.border, marginVertical: 10 },

  ownerRow:    { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  ownerName:   { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.text },
  ownerEmail:  { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.text3 },
  noOwner:     { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.text3,
                 fontStyle: "italic" },
  regDate:     { fontFamily: "JetBrainsMono_400Regular", fontSize: 10,
                 color: C.text3, marginTop: 6 },

  emptyWrap:   { alignItems: "center", paddingVertical: 40 },
  emptyTxt:    { fontFamily: "Outfit_400Regular", fontSize: 14, color: C.text3 },
});
