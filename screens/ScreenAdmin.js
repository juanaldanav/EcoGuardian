// ============================================================
//   ScreenAdmin.js — Panel de administración interactivo
// ============================================================
import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
  Modal, TouchableWithoutFeedback, TextInput,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ref, update } from "firebase/database";
import { db } from "../constants/firebase";
import { useStations, useAllUsers } from "../hooks/useFirebase";
import { isDeviceOnline, timeSince } from "../utils/helpers";
import { C } from "../constants/colors";

function fmtFecha(ts) {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("es-MX", { day:"2-digit", month:"short", year:"numeric" });
}

function isDefaultFirmwareName(nombre) {
  return !nombre || /^EcoG [A-F0-9]{6}$/i.test(nombre.trim());
}

function stationDisplayLabel(id, allIds, stations) {
  const idx    = allIds.indexOf(id);
  const nombre = stations[id]?.nombre || "";
  return isDefaultFirmwareName(nombre) ? `Estación ${idx + 1}` : nombre;
}

export default function ScreenAdmin({ onBack }) {
  const { stations, loading: loadSt } = useStations();
  const { users,    loading: loadUs } = useAllUsers();

  const [expandedId,  setExpandedId]  = useState(null);
  const [renameModal, setRenameModal] = useState(null); // { id, current }
  const [renameVal,   setRenameVal]   = useState("");
  const [renameBusy,  setRenameBusy]  = useState(false);

  const allIds = useMemo(() => Object.keys(stations).sort(), [stations]);

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

  const online       = allIds.filter(id => isDeviceOnline(stations[id])).length;
  const regularUsers = Object.entries(users).filter(([, u]) => u.rol !== "admin");

  async function doRename() {
    if (!renameVal.trim() || !renameModal) return;
    setRenameBusy(true);
    try {
      await update(ref(db, `estaciones/${renameModal.id}`), { nombre: renameVal.trim() });
      setRenameModal(null);
    } catch (e) {
      console.error(e);
    } finally {
      setRenameBusy(false);
    }
  }

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

        {/* Stats */}
        <View style={ss.statsRow}>
          {[
            { icon:"access-point", lib:"mc", val: allIds.length,      label:"Dispositivos", color: C.green  },
            { icon:"wifi",         lib:"mc", val: online,              label:"En línea",     color: C.accent },
            { icon:"people",       lib:"io", val: regularUsers.length, label:"Usuarios",     color: C.text2  },
          ].map((s, i) => (
            <View key={i} style={ss.statCard}>
              {s.lib === "mc"
                ? <MaterialCommunityIcons name={s.icon} size={22} color={s.color} />
                : <Ionicons name={s.icon} size={22} color={s.color} />
              }
              <Text style={ss.statNum}>{s.val}</Text>
              <Text style={ss.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── DISPOSITIVOS ─────────────────────────────── */}
        <Text style={ss.sectionTitle}>DISPOSITIVOS</Text>

        {allIds.length === 0 && (
          <View style={ss.emptyWrap}>
            <Text style={ss.emptyTxt}>Sin dispositivos registrados en la red</Text>
          </View>
        )}

        {allIds.map((sid) => {
          const st     = stations[sid];
          const vivo   = isDeviceOnline(st);
          const duenos = stationOwner[sid] || [];
          const label  = stationDisplayLabel(sid, allIds, stations);
          const open   = expandedId === sid;

          return (
            <View key={sid} style={ss.deviceCard}>
              {/* Header clickable — expande */}
              <TouchableOpacity
                style={ss.deviceHeader}
                onPress={() => setExpandedId(open ? null : sid)}
                activeOpacity={0.7}
              >
                <View style={[ss.statusDot, { backgroundColor: vivo ? C.accent : C.text3 }]} />
                <Text style={ss.deviceName} numberOfLines={1}>{label}</Text>
                <View style={{ flex: 1 }} />
                <View style={[ss.badge, { backgroundColor: vivo ? C.accent + "20" : C.bg3 }]}>
                  <Text style={[ss.badgeTxt, { color: vivo ? C.accent : C.text3 }]}>
                    {vivo ? "EN LÍNEA" : "OFFLINE"}
                  </Text>
                </View>
                <Ionicons
                  name={open ? "chevron-up" : "chevron-down"}
                  size={16} color={C.text3} style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>

              {/* ID + botón renombrar */}
              <View style={ss.idRow}>
                <Text style={ss.deviceId} numberOfLines={1}>{sid}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setRenameVal(isDefaultFirmwareName(st?.nombre) ? "" : (st?.nombre || ""));
                    setRenameModal({ id: sid, current: label });
                  }}
                  style={ss.renameBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil-outline" size={13} color={C.green} />
                  <Text style={ss.renameTxt}>Renombrar</Text>
                </TouchableOpacity>
              </View>

              {/* Contenido expandido */}
              {open && (
                <>
                  <View style={ss.divider} />

                  {/* Métricas 2×2 */}
                  {vivo ? (
                    <View style={ss.metricsGrid}>
                      {[
                        { label:"PM2.5", val: st.pm25?.toFixed(1) ?? "—", unit:"µg/m³" },
                        { label:"PM10",  val: st.pm10?.toFixed(1) ?? "—", unit:"µg/m³" },
                        { label:"CO₂",   val: Math.round(st.co2  ?? 0),   unit:"ppm"   },
                        { label:"TVOC",  val: Math.round(st.tvoc ?? 0),   unit:"ppb"   },
                      ].map((m, i) => (
                        <View key={i} style={ss.metricCard}>
                          <Text style={ss.metricVal}>{m.val}</Text>
                          <Text style={ss.metricUnit}>{m.unit}</Text>
                          <Text style={ss.metricLabel}>{m.label}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={ss.offlineTxt}>
                      Sin datos recientes · última lectura hace {timeSince(st?.timestamp) ?? "—"}
                    </Text>
                  )}

                  {/* GPS si disponible */}
                  {st?.gps_valido && (
                    <Text style={ss.gpsTxt}>
                      GPS: {st.lat?.toFixed(5)}, {st.lng?.toFixed(5)}
                    </Text>
                  )}

                  <View style={ss.divider} />

                  {/* Cuentas vinculadas */}
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
                  {duenos.length > 0 && users[duenos[0].uid]?.creadoEn && (
                    <Text style={ss.regDate}>
                      Suscriptor desde: {fmtFecha(users[duenos[0].uid].creadoEn)}
                    </Text>
                  )}
                </>
              )}
            </View>
          );
        })}

        {/* ── USUARIOS ─────────────────────────────────── */}
        <Text style={[ss.sectionTitle, { marginTop: 28 }]}>USUARIOS REGISTRADOS</Text>

        {regularUsers.length === 0 && (
          <View style={ss.emptyWrap}>
            <Text style={ss.emptyTxt}>Sin usuarios registrados</Text>
          </View>
        )}

        {regularUsers.map(([uid, u]) => {
          const userStations = Object.keys(u.estaciones || {});
          return (
            <View key={uid} style={ss.userCard}>
              <View style={ss.userHeader}>
                <View style={ss.userAvatar}>
                  <Text style={ss.userAvatarTxt}>
                    {(u.nombre || u.email || "?")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={ss.userName}>{u.nombre || "Sin nombre"}</Text>
                  <Text style={ss.userEmail}>{u.email}</Text>
                </View>
                <View style={[ss.badge, {
                  backgroundColor: userStations.length > 0 ? C.green + "20" : C.bg3,
                }]}>
                  <Text style={[ss.badgeTxt, {
                    color: userStations.length > 0 ? C.green : C.text3,
                  }]}>
                    {userStations.length > 0 ? `${userStations.length} EcoG` : "Explorador"}
                  </Text>
                </View>
              </View>

              {userStations.length > 0 && (
                <View style={ss.userStations}>
                  {userStations.map(sid => (
                    <View key={sid} style={ss.userStationChip}>
                      <MaterialCommunityIcons name="access-point" size={11} color={C.green} />
                      <Text style={ss.userStationTxt}>
                        {stationDisplayLabel(sid, allIds, stations)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={ss.userDate}>Registrado: {fmtFecha(u.creadoEn)}</Text>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal renombrar */}
      <Modal
        visible={!!renameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModal(null)}
      >
        <TouchableWithoutFeedback onPress={() => setRenameModal(null)}>
          <View style={ss.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={ss.modalBox}>
                <Text style={ss.modalTitle}>Renombrar estación</Text>
                <Text style={ss.modalSub}>{renameModal?.current}</Text>
                <TextInput
                  style={ss.modalInput}
                  value={renameVal}
                  onChangeText={setRenameVal}
                  placeholder="Ej: Oficina Lamarque, Escuela Norte..."
                  placeholderTextColor={C.text3}
                  autoFocus
                  maxLength={60}
                />
                <View style={ss.modalBtns}>
                  <TouchableOpacity
                    style={[ss.modalBtn, ss.modalBtnCancel]}
                    onPress={() => setRenameModal(null)}
                  >
                    <Text style={ss.modalBtnCancelTxt}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[ss.modalBtn, ss.modalBtnOk,
                      { opacity: renameVal.trim() ? 1 : 0.4 }]}
                    onPress={doRename}
                    disabled={!renameVal.trim() || renameBusy}
                  >
                    {renameBusy
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={ss.modalBtnOkTxt}>Guardar</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const ss = StyleSheet.create({
  root:     { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  header:      { flexDirection: "row", alignItems: "center",
                 paddingHorizontal: 16, paddingVertical: 14,
                 borderBottomWidth: 1, borderBottomColor: C.border,
                 backgroundColor: C.bg },
  backBtn:     { padding: 6, marginRight: 10 },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: C.text },

  body: { paddingHorizontal: 16, paddingTop: 16 },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 16,
              borderWidth: 1, borderColor: C.border,
              alignItems: "center", paddingVertical: 16, gap: 4 },
  statNum:  { fontFamily: "Outfit_700Bold", fontSize: 24, color: C.text },
  statLabel:{ fontFamily: "Outfit_400Regular", fontSize: 11, color: C.text3 },

  sectionTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.text3,
                  letterSpacing: 1.2, marginBottom: 10 },

  // Device cards
  deviceCard:   { backgroundColor: C.card, borderRadius: 16,
                  borderWidth: 1, borderColor: C.border,
                  padding: 14, marginBottom: 10 },
  deviceHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot:    { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  deviceName:   { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: C.text, maxWidth: 140 },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeTxt:     { fontFamily: "JetBrainsMono_400Regular", fontSize: 9, letterSpacing: 0.5 },

  idRow:     { flexDirection: "row", alignItems: "center",
               justifyContent: "space-between", marginTop: 5 },
  deviceId:  { fontFamily: "JetBrainsMono_400Regular", fontSize: 9,
               color: C.text3, flex: 1, marginRight: 8 },
  renameBtn: { flexDirection: "row", alignItems: "center", gap: 4,
               backgroundColor: C.green + "14", borderRadius: 8,
               paddingHorizontal: 8, paddingVertical: 4 },
  renameTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.green },

  divider:    { height: 1, backgroundColor: C.border, marginVertical: 10 },
  metricsGrid:{ flexDirection: "row", gap: 8, marginBottom: 4 },
  metricCard: { flex: 1, backgroundColor: C.bg2, borderRadius: 10,
                padding: 8, alignItems: "center", gap: 2 },
  metricVal:  { fontFamily: "JetBrainsMono_400Regular", fontSize: 14,
                fontWeight: "700", color: C.text },
  metricUnit: { fontFamily: "JetBrainsMono_400Regular", fontSize: 8, color: C.text3 },
  metricLabel:{ fontFamily: "Outfit_400Regular", fontSize: 9, color: C.text2 },
  offlineTxt: { fontFamily: "Outfit_400Regular", fontSize: 11,
                color: C.text3, fontStyle: "italic", paddingBottom: 4 },
  gpsTxt:     { fontFamily: "JetBrainsMono_400Regular", fontSize: 9,
                color: C.text3, marginTop: 2, marginBottom: 4 },

  ownerRow:  { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  ownerName: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.text },
  ownerEmail:{ fontFamily: "Outfit_400Regular", fontSize: 11, color: C.text3 },
  noOwner:   { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.text3,
               fontStyle: "italic" },
  regDate:   { fontFamily: "JetBrainsMono_400Regular", fontSize: 10,
               color: C.text3, marginTop: 4 },

  // User cards
  userCard:       { backgroundColor: C.card, borderRadius: 16,
                    borderWidth: 1, borderColor: C.border,
                    padding: 14, marginBottom: 10 },
  userHeader:     { flexDirection: "row", alignItems: "center" },
  userAvatar:     { width: 38, height: 38, borderRadius: 19,
                    backgroundColor: C.green + "20",
                    alignItems: "center", justifyContent: "center" },
  userAvatarTxt:  { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.green },
  userName:       { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.text },
  userEmail:      { fontFamily: "Outfit_400Regular", fontSize: 11,
                    color: C.text3, marginTop: 1 },
  userStations:   { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  userStationChip:{ flexDirection: "row", alignItems: "center", gap: 4,
                    backgroundColor: C.green + "14", borderRadius: 8,
                    paddingHorizontal: 8, paddingVertical: 4 },
  userStationTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.green },
  userDate:       { fontFamily: "JetBrainsMono_400Regular", fontSize: 9,
                    color: C.text3, marginTop: 8 },

  emptyWrap:{ alignItems: "center", paddingVertical: 24 },
  emptyTxt: { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.text3 },

  // Rename modal
  modalOverlay:   { flex: 1, backgroundColor: "rgba(28,43,30,.55)",
                    justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox:       { backgroundColor: C.card, borderRadius: 20, padding: 20,
                    width: "100%", borderWidth: 1, borderColor: C.border },
  modalTitle:     { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.text, marginBottom: 4 },
  modalSub:       { fontFamily: "JetBrainsMono_400Regular", fontSize: 10,
                    color: C.text3, marginBottom: 16 },
  modalInput:     { backgroundColor: C.bg2, borderRadius: 12,
                    paddingHorizontal: 14, paddingVertical: 12,
                    fontFamily: "Outfit_400Regular", fontSize: 14, color: C.text,
                    marginBottom: 16, borderWidth: 1, borderColor: C.border },
  modalBtns:      { flexDirection: "row", gap: 10 },
  modalBtn:       { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  modalBtnCancel: { backgroundColor: C.bg2 },
  modalBtnOk:     { backgroundColor: C.green },
  modalBtnCancelTxt:{ fontFamily: "Outfit_700Bold", fontSize: 14, color: C.text },
  modalBtnOkTxt:  { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#fff" },
});
