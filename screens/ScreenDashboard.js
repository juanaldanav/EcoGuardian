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
import { getInfo, timeSince, isDeviceOnline } from "../utils/helpers";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";

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
                <View style={[ss.nivelBox, { backgroundColor:info.color+"15" }]}>
                  <View style={{ width:48, height:48, borderRadius:14, backgroundColor:info.color, alignItems:"center", justifyContent:"center" }}>
                    <MaterialCommunityIcons name="air-purifier" size={26} color="#fff" />
                  </View>
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
                    <View key={i} style={ss.promedioCard}>
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
                  {timeSince(data?.receivedAt)
                    ? `Hace ${timeSince(data?.receivedAt)}`
                    : "Sin datos recientes"
                  } — {data?.nombre || "estacion_01"}
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

  const online   = isDeviceOnline(data?.receivedAt);
  const lastSync = timeSince(data?.receivedAt);

  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const radarScale = useRef(new Animated.Value(1)).current;
  const radarOpac  = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Hero button gentle breath
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 1600, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 1600, useNativeDriver: true }),
    ])).start();

    // Radar ping ring
    Animated.loop(
      Animated.parallel([
        Animated.timing(radarScale, { toValue: 1.9, duration: 2000, useNativeDriver: true }),
        Animated.timing(radarOpac,  { toValue: 0,   duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (data) Animated.timing(fadeAnim, { toValue:1, duration:500, useNativeDriver:true }).start();
  }, [data]);

  const pm25 = data?.pm25 || 0;
  const info = getInfo(pm25);

  return (
    <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>

      {/* ── HERO — número grande ─────────────────────── */}
      <View style={ss.heroWrap}>

        {/* Indicador EN VIVO / SIN CONEXIÓN */}
        <View style={ss.liveBadge}>
          <Animated.View style={[ss.liveDot, {
            backgroundColor: online ? info.color : C.text3,
            opacity: online ? pulseAnim : 1,
          }]} />
          <Text style={[ss.liveTxt, { color: online ? info.color : C.text3 }]}>
            {online ? "EN VIVO" : "SIN CONEXIÓN"}
          </Text>
        </View>

        {/* Nivel */}
        <Text style={[ss.heroLevel, { color: info.color }]}>{info.label}</Text>

        {/* Número PM2.5 */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {loading
            ? <ActivityIndicator size="large" color={info.color} style={{ marginVertical: 16 }} />
            : <Text style={[ss.heroNum, { color: info.color }]}>
                {pm25 < 10 ? pm25.toFixed(1) : Math.round(pm25)}
              </Text>
          }
        </Animated.View>
        <Text style={ss.heroUnit}>µg/m³ · PM2.5</Text>

        {/* Botón escanear — outline plano */}
        <TouchableOpacity
          style={[ss.heroScanBtn, { borderColor: info.color }]}
          activeOpacity={0.75}
          onPress={() => setModalVisible(true)}
        >
          <MaterialCommunityIcons name="chart-bar" size={16} color={info.color} />
          <Text style={[ss.heroScanTxt, { color: info.color }]}>Ver analíticas</Text>
        </TouchableOpacity>

      </View>

      {/* Banner offline */}
      {!loading && data && !online && (
        <View style={ss.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={15} color={C.text3} />
          <Text style={ss.offlineTxt}>
            Dispositivo apagado — mostrando última lectura guardada
          </Text>
        </View>
      )}

      {/* ── 2 TARJETAS ───────────────────────────────── */}
      <Animated.View style={[ss.gridRow, { opacity:fadeAnim }]}>
        <View style={[ss.miniCard, { borderColor:C.green+"33" }]}>
          <MaterialCommunityIcons name="molecule-co2" size={22} color={C.text2} />
          <Text style={ss.miniLabel}>CO₂</Text>
          <Text style={[ss.miniVal, { color:C.text }]}>{Math.round(data?.co2 || 0)}</Text>
          <Text style={ss.miniSub}>ppm</Text>
        </View>
        <View style={[ss.miniCard, { borderColor:C.text3+"33" }]}>
          <MaterialCommunityIcons name="sync" size={22} color={online ? C.text2 : C.text3} />
          <Text style={ss.miniLabel}>Último sync</Text>
          <Text style={[ss.miniVal, { color: online ? C.text2 : C.text3 }]}>
            {lastSync ?? "---"}
          </Text>
          <Text style={ss.miniSub}>{hist?.length || 0} lecturas</Text>
        </View>
      </Animated.View>

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
            {(() => {
              const hasCoords = data.lat && data.lng && data.lat !== 0 && data.lng !== 0;
              const gpsFix    = data.gps_valido;
              const gpsLabel  = gpsFix ? "✓ Fix GPS" : hasCoords ? "Adquiriendo..." : "Sin señal";
              const gpsColor  = gpsFix ? C.green    : hasCoords ? C.yellow         : C.text3;
              const sats      = data.satelites || 0;
              return (
                <>
                  <View style={ss.cardHeader}>
                    <Text style={ss.cardTitle}>GPS</Text>
                    <Text style={{ fontSize:11, color:gpsColor, fontWeight:"600" }}>{gpsLabel}</Text>
                  </View>
                  <SensorRow icon="crosshairs-gps"    label="Latitud"   value={hasCoords ? data.lat.toFixed(5) : "---"} unit="°N"  color={hasCoords ? gpsColor : C.text3} />
                  <SensorRow icon="crosshairs-gps"    label="Longitud"  value={hasCoords ? data.lng.toFixed(5) : "---"} unit="°O"  color={hasCoords ? gpsColor : C.text3} />
                  <SensorRow icon="satellite-variant" label="Satélites" value={sats > 0 ? sats : hasCoords ? "..." : "0"} unit={sats > 0 ? "sat" : ""} color={sats > 0 ? C.green : C.text3} />
                </>
              );
            })()}
          </Card>
        </Animated.View>
      )}

      {/* ── ALARMA ──────────────────────────────────── */}
      {data?.alarma && (
        <View style={ss.alertBanner}>
          <Text style={ss.alertTitle}>Alerta de Calidad del Aire</Text>
          <Text style={ss.alertDesc}>
            {info.label} — PM2.5: {pm25.toFixed(1)} µg/m³. Evita actividad al aire libre.
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
  heroWrap:      { alignItems:"center", paddingTop:32, paddingBottom:24, paddingHorizontal:20 },
  liveBadge:     { flexDirection:"row", alignItems:"center", gap:6, marginBottom:12 },
  liveDot:       { width:7, height:7, borderRadius:3.5 },
  liveTxt:       { fontFamily:"JetBrainsMono_400Regular", fontSize:10, letterSpacing:2 },
  heroLevel:     { fontFamily:"Outfit_700Bold", fontSize:22, marginBottom:4 },
  heroNum:       { fontFamily:"JetBrainsMono_400Regular", fontSize:80, lineHeight:88,
                   fontWeight:"700", includeFontPadding:false },
  heroUnit:      { fontFamily:"Outfit_400Regular", fontSize:13, color:C.text3, marginTop:4, marginBottom:24 },
  heroScanBtn:   { flexDirection:"row", alignItems:"center", gap:8, paddingHorizontal:20,
                   paddingVertical:10, borderRadius:24, borderWidth:1.5 },
  heroScanTxt:   { fontFamily:"Outfit_600SemiBold", fontSize:14 },
  gridRow:       { flexDirection:"row", gap:12, paddingHorizontal:16, marginBottom:12 },
  miniCard:      { flex:1, backgroundColor:C.card, borderRadius:14, padding:14,
                   alignItems:"center", gap:4,
                   shadowColor:"#1C2B1E", shadowOffset:{width:0,height:2},
                   shadowOpacity:.07, shadowRadius:8, elevation:2 },
  miniLabel:     { fontFamily:"Outfit_400Regular", fontSize:9, color:C.text2, textAlign:"center", marginTop:4 },
  miniVal:       { fontFamily:"Outfit_700Bold", fontSize:14, textAlign:"center" },
  miniSub:       { fontFamily:"JetBrainsMono_400Regular", fontSize:9, color:C.text3, textAlign:"center" },
  analyticsBtn:  { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10,
                   marginHorizontal:16, marginBottom:12, paddingVertical:14,
                   borderRadius:16, backgroundColor:C.card,
                   shadowColor:"#1C2B1E", shadowOffset:{width:0,height:2},
                   shadowOpacity:.07, shadowRadius:8, elevation:2 },
  analyticsTxt:  { fontFamily:"Outfit_600SemiBold", fontSize:14 },
  sensorCard:    { marginHorizontal:16, marginBottom:12 },
  cardHeader:    { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:12 },
  cardTitle:     { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.text },
  offlineBanner:{ flexDirection:"row", alignItems:"center", gap:8,
                  marginHorizontal:16, marginBottom:12,
                  backgroundColor:C.bg2, borderRadius:12, paddingHorizontal:14, paddingVertical:10 },
  offlineTxt:   { fontFamily:"Outfit_400Regular", fontSize:12, color:C.text3, flex:1 },
  alertBanner:  { marginHorizontal:16, marginBottom:12, backgroundColor:C.card,
                  borderRadius:16, padding:16,
                  shadowColor:"#1C2B1E", shadowOffset:{width:0,height:2},
                  shadowOpacity:.07, shadowRadius:8, elevation:2 },
  alertTitle:   { fontSize:14, fontWeight:"800", color:C.red, marginBottom:6 },
  alertDesc:    { fontSize:12, color:C.text, lineHeight:18 },
  // Modal
  modalOverlay: { flex:1, backgroundColor:"rgba(28,43,30,.55)", justifyContent:"center",
                  alignItems:"center", padding:20 },
  modalBox:     { backgroundColor:C.card, borderRadius:20, padding:20, width:"100%",
                  borderWidth:1, borderColor:C.border,
                  shadowColor:"#1C2B1E", shadowOffset:{width:0,height:8},
                  shadowOpacity:.12, shadowRadius:24, elevation:12 },
  modalHeader:  { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:16 },
  modalTitle:   { fontFamily:"Outfit_700Bold", fontSize:15, color:C.text },
  closeBtn:     { width:30, height:30, borderRadius:8, backgroundColor:C.bg3,
                  alignItems:"center", justifyContent:"center" },
  modalSection: { marginBottom:16 },
  modalSub:     { fontFamily:"JetBrainsMono_400Regular", fontSize:9, color:C.text3,
                  letterSpacing:2, marginBottom:8, textTransform:"uppercase" },
  nivelBox:     { flexDirection:"row", alignItems:"center", padding:14,
                  borderRadius:12 },
  nivelLabel:   { fontFamily:"Outfit_700Bold", fontSize:20 },
  promediosGrid:{ flexDirection:"row", gap:8 },
  promedioCard: { flex:1, backgroundColor:C.bg2, borderRadius:12, padding:10,
                  alignItems:"center", gap:4 },
  promedioVal:  { fontFamily:"JetBrainsMono_400Regular", fontSize:18, fontWeight:"800" },
  promedioUnit: { fontFamily:"JetBrainsMono_400Regular", fontSize:9, color:C.text3 },
  promedioLabel:{ fontFamily:"Outfit_400Regular", fontSize:9, color:C.text2 },
  modalCloseBtn:{ paddingVertical:12, borderRadius:12, alignItems:"center", marginTop:4 },
});