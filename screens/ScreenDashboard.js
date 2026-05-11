// ============================================================
//   ScreenDashboard.js — Pantalla principal ACTUALIZADA
//   Cambios:
//   - Quitada tarjeta de batería
//   - Botón "Escanear Ahora" muestra resumen con promedios
// ============================================================
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, ActivityIndicator, Modal, TouchableWithoutFeedback,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import Card      from "../components/Card";
import SensorRow from "../components/SensorRow";
import LiveDot   from "../components/LiveDot";
import { useStation, useHistory } from "../hooks/useFirebase";
import { getInfo, timeSince } from "../utils/helpers";
import { C } from "../constants/colors";

// ── Componente: Modal de resumen ─────────────────────────────
function ResumenModal({ visible, onClose, data, hist }) {
  const pm25 = data?.pm25 || 0;
  const info = getInfo(pm25);

  // Calcula promedios del historial
  const avg = (key) => {
    if (!hist || hist.length === 0) return 0;
    const sum = hist.reduce((a, h) => a + (h[key] || 0), 0);
    return (sum / hist.length).toFixed(1);
  };

  const avgPM25 = avg("pm25");
  const avgPM10 = avg("pm10");
  const avgCO2  = avg("co2");
  const infoAvg = getInfo(parseFloat(avgPM25));

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue:1, useNativeDriver:true, tension:80, friction:8 }),
        Animated.timing(fadeAnim,  { toValue:1, duration:200, useNativeDriver:true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[ss.modalOverlay, { opacity:fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[ss.modalBox, { transform:[{ scale:scaleAnim }] }]}>

              {/* Header del modal */}
              <View style={ss.modalHeader}>
                <Text style={ss.modalTitle}>Resumen de Lecturas</Text>
                <TouchableOpacity onPress={onClose} style={ss.closeBtn}>
                  <Ionicons name="close" size={20} color={C.text2} />
                </TouchableOpacity>
              </View>

              {/* Lectura actual */}
              <View style={ss.modalSection}>
                <Text style={ss.modalSub}>LECTURA ACTUAL</Text>
                <View style={[ss.nivelBox, { backgroundColor:info.color+"15", borderColor:info.color+"44" }]}>
                  <Text style={{ fontSize:32 }}>{info.emoji}</Text>
                  <View style={{ flex:1, marginLeft:12 }}>
                    <Text style={[ss.nivelLabel, { color:info.color }]}>{info.label}</Text>
                    <Text style={{ color:C.text2, fontSize:12, marginTop:3 }}>
                      PM2.5: {pm25.toFixed(1)} µg/m³
                    </Text>
                  </View>
                </View>
              </View>

              {/* Promedios */}
              <View style={ss.modalSection}>
                <Text style={ss.modalSub}>PROMEDIO — ÚLTIMAS {hist?.length || 0} LECTURAS</Text>
                <View style={ss.promediosGrid}>
                  {[
                    { label:"PM2.5",  val:avgPM25, unit:"µg/m³", color:infoAvg.color, icon:"air-purifier" },
                    { label:"PM10",   val:avgPM10, unit:"µg/m³", color:C.yellow,      icon:"blur" },
                    { label:"CO₂",   val:avgCO2,  unit:"ppm",   color:C.text2,       icon:"molecule-co2" },
                  ].map((item, i) => (
                    <View key={i} style={[ss.promedioCard, { borderColor:item.color+"44" }]}>
                      <MaterialCommunityIcons name={item.icon} size={18} color={item.color} />
                      <Text style={[ss.promedioVal, { color:item.color }]}>{item.val}</Text>
                      <Text style={ss.promedioUnit}>{item.unit}</Text>
                      <Text style={ss.promedioLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Tiempo */}
              <View style={ss.modalSection}>
                <Text style={ss.modalSub}>ÚLTIMA ACTUALIZACIÓN</Text>
                <Text style={{ color:C.text, fontSize:14, fontWeight:"600" }}>
                  Hace {timeSince(data?.timestamp, data?.receivedAt)} — {data?.nombre || "Estación Centro"}
                </Text>
              </View>

              {/* Botón cerrar */}
              <TouchableOpacity style={[ss.modalCloseBtn, { backgroundColor:info.color }]} onPress={onClose}>
                <Text style={{ color:"#fff", fontWeight:"700", fontSize:14 }}>Cerrar resumen</Text>
              </TouchableOpacity>

            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ── Pantalla principal ────────────────────────────────────────
export default function ScreenDashboard() {
  const { data, loading } = useStation();
  const { hist }          = useHistory();
  const [modalVisible, setModalVisible] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue:1.07, duration:1400, useNativeDriver:true }),
      Animated.timing(pulseAnim, { toValue:1,    duration:1400, useNativeDriver:true }),
    ])).start();
  }, []);

  useEffect(() => {
    if (data) Animated.timing(fadeAnim, { toValue:1, duration:500, useNativeDriver:true }).start();
  }, [data]);

  const pm25 = data?.pm25 || 0;
  const info = getInfo(pm25);

  return (
    <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>

      {/* ── HERO BUTTON ────────────────────────────── */}
      <View style={ss.heroWrap}>
        <Text style={ss.heroTitle}>Dispositivo</Text>
        <Animated.View style={{ transform:[{ scale:pulseAnim }] }}>
          <TouchableOpacity
            style={[ss.heroBtn, { backgroundColor:info.color, shadowColor:info.color }]}
            activeOpacity={0.85}
            onPress={() => setModalVisible(true)}
          >
            {loading
              ? <ActivityIndicator size="large" color="#fff" />
              : <>
                  <MaterialCommunityIcons name="radar" size={36} color="#fff" />
                  <Text style={ss.heroBtnTxt}>Escanear{"\n"}Ahora</Text>
                </>
            }
          </TouchableOpacity>
        </Animated.View>
        <Text style={ss.heroSub}>Monitorear Entorno</Text>
      </View>

      {/* ── 2 TARJETAS (sin batería) ─────────────────── */}
      <Animated.View style={[ss.gridRow, { opacity:fadeAnim }]}>
        <View style={[ss.miniCard, { borderColor:info.color+"44" }]}>
          <MaterialCommunityIcons name="air-filter" size={22} color={info.color} />
          <Text style={ss.miniLabel}>Calidad de Aire</Text>
          <Text style={[ss.miniVal, { color:info.color }]}>{info.emoji} {info.label}</Text>
          <Text style={[ss.miniSub, { color:info.color }]}>PM2.5: {pm25.toFixed(1)} µg/m³</Text>
        </View>
        <View style={[ss.miniCard, { borderColor:C.text3+"44" }]}>
          <MaterialCommunityIcons name="sync" size={22} color={C.text2} />
          <Text style={ss.miniLabel}>Último Sync</Text>
          <Text style={[ss.miniVal, { color:C.text2 }]}>{timeSince(data?.timestamp, data?.receivedAt)}</Text>
          <Text style={ss.miniSub}>{hist?.length || 0} lecturas guardadas</Text>
        </View>
      </Animated.View>

      {/* ── BOTÓN VER ANALÍTICAS ────────────────────── */}
      <TouchableOpacity
        style={[ss.analyticsBtn, { borderColor:info.color }]}
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <MaterialCommunityIcons name="chart-line" size={18} color={info.color} />
        <Text style={[ss.analyticsTxt, { color:info.color }]}>Ver analíticas</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color={info.color} />
      </TouchableOpacity>

      {/* ── SENSORES EN TIEMPO REAL ─────────────────── */}
      {data && (
        <Animated.View style={{ opacity:fadeAnim }}>
          <Card style={ss.sensorCard}>
            <View style={ss.cardHeader}>
              <Text style={ss.cardTitle}>Sensores en tiempo real</Text>
              <LiveDot />
            </View>
            <SensorRow icon="air-purifier"    label="PM2.5" value={(data.pm25||0).toFixed(1)} unit="µg/m³" color={info.color} />
            <SensorRow icon="blur"            label="PM10"  value={(data.pm10||0).toFixed(1)} unit="µg/m³" color={C.yellow}   />
            <SensorRow icon="molecule-co2"    label="CO₂"   value={Math.round(data.co2||0)}   unit="ppm"   color={C.text2}    />
            <SensorRow icon="chemical-weapon" label="TVOC"  value={Math.round(data.tvoc||0)}  unit="ppb"   color={C.orange}   />
          </Card>

          <Card style={ss.sensorCard}>
            <View style={ss.cardHeader}>
              <Text style={ss.cardTitle}>GPS</Text>
              <Text style={{ fontSize:11, color:data.gps_valido?C.green:C.text3, fontWeight:"600" }}>
                {data.gps_valido ? "✓ Señal" : "Sin señal"}
              </Text>
            </View>
            <SensorRow icon="crosshairs-gps"    label="Latitud"   value={(data.lat||0).toFixed(5)} unit="°N"  color={C.green} />
            <SensorRow icon="crosshairs-gps"    label="Longitud"  value={(data.lng||0).toFixed(5)} unit="°O"  color={C.green} />
            <SensorRow icon="satellite-variant" label="Satélites" value={data.satelites||0}         unit="sat" color={C.text2} />
          </Card>
        </Animated.View>
      )}

      {/* ── ALARMA ──────────────────────────────────── */}
      {data?.alarma && (
        <View style={ss.alertBanner}>
          <Text style={ss.alertTitle}>Alerta de Calidad del Aire</Text>
          <Text style={ss.alertDesc}>
            {info.emoji} {info.label} — PM2.5: {pm25.toFixed(1)} µg/m³. Evita actividad al aire libre.
          </Text>
        </View>
      )}

      {loading && (
        <View style={{ alignItems:"center", padding:40, gap:12 }}>
          <ActivityIndicator size="large" color={C.green} />
          <Text style={{ color:C.text2, fontSize:13 }}>Conectando con Firebase...</Text>
        </View>
      )}
      <View style={{ height:24 }} />

      {/* ── MODAL RESUMEN ───────────────────────────── */}
      <ResumenModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        data={data}
        hist={hist}
      />
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  heroWrap:     { alignItems:"center", paddingVertical:28, paddingHorizontal:20 },
  heroTitle:    { fontSize:22, fontWeight:"800", color:C.text, marginBottom:20 },
  heroBtn:      { width:130, height:130, borderRadius:65, alignItems:"center", justifyContent:"center",
                  gap:6, shadowOffset:{width:0,height:0}, shadowOpacity:.5, shadowRadius:30, elevation:12 },
  heroBtnTxt:   { fontSize:15, fontWeight:"700", color:"#fff", textAlign:"center", lineHeight:20 },
  heroSub:      { fontSize:13, color:C.text2, marginTop:14 },
  gridRow:      { flexDirection:"row", gap:12, paddingHorizontal:16, marginBottom:12 },
  miniCard:     { flex:1, backgroundColor:C.card, borderRadius:14, padding:14,
                  borderWidth:1, alignItems:"center", gap:4 },
  miniLabel:    { fontSize:9, color:C.text2, textAlign:"center", fontWeight:"600", marginTop:4 },
  miniVal:      { fontSize:13, fontWeight:"800", textAlign:"center" },
  miniSub:      { fontSize:9, color:C.text3, textAlign:"center" },
  analyticsBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10,
                  marginHorizontal:16, marginBottom:12, paddingVertical:14,
                  borderRadius:16, backgroundColor:C.card, borderWidth:1 },
  analyticsTxt: { fontSize:15, fontWeight:"700" },
  sensorCard:   { marginHorizontal:16, marginBottom:12 },
  cardHeader:   { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:12 },
  cardTitle:    { fontSize:13, fontWeight:"700", color:C.text },
  alertBanner:  { marginHorizontal:16, marginBottom:12, backgroundColor:"#4D000033",
                  borderRadius:16, padding:16, borderWidth:1, borderColor:C.red+"66" },
  alertTitle:   { fontSize:14, fontWeight:"800", color:"#FF6B6B", marginBottom:6 },
  alertDesc:    { fontSize:12, color:"#FFA5A5", lineHeight:18 },
  // Modal
  modalOverlay: { flex:1, backgroundColor:"rgba(0,0,0,.7)", justifyContent:"center",
                  alignItems:"center", padding:20 },
  modalBox:     { backgroundColor:C.card, borderRadius:20, padding:20, width:"100%",
                  borderWidth:1, borderColor:C.border },
  modalHeader:  { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:16 },
  modalTitle:   { fontSize:15, fontWeight:"800", color:C.text },
  closeBtn:     { width:30, height:30, borderRadius:8, backgroundColor:C.bg,
                  alignItems:"center", justifyContent:"center" },
  modalSection: { marginBottom:16 },
  modalSub:     { fontSize:9, color:C.text3, letterSpacing:.1, fontWeight:"700",
                  marginBottom:8, textTransform:"uppercase" },
  nivelBox:     { flexDirection:"row", alignItems:"center", padding:14,
                  borderRadius:12, borderWidth:1 },
  nivelLabel:   { fontSize:20, fontWeight:"800" },
  promediosGrid:{ flexDirection:"row", gap:8 },
  promedioCard: { flex:1, backgroundColor:C.bg, borderRadius:12, padding:10,
                  alignItems:"center", gap:4, borderWidth:1 },
  promedioVal:  { fontSize:18, fontWeight:"800" },
  promedioUnit: { fontSize:9, color:C.text3 },
  promedioLabel:{ fontSize:9, color:C.text2, fontWeight:"600" },
  modalCloseBtn:{ paddingVertical:12, borderRadius:12, alignItems:"center", marginTop:4 },
});