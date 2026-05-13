// ============================================================
//   ScreenDashboard.js — Pantalla principal
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
import { useAuth } from "../hooks/useAuth";
import { getInfo, timeSince, isDeviceOnline } from "../utils/helpers";
import { C } from "../constants/colors";

// OMS breakpoints para la barra de escala
const OMS_SCALE = [
  { pct: 8,  color: C.green  },
  { pct: 23, color: C.yellow },
  { pct: 13, color: C.orange },
  { pct: 32, color: C.red    },
  { pct: 24, color: C.purple },
];

// ── Modal de resumen ──────────────────────────────────────────
function ResumenModal({ visible, onClose, data, hist }) {
  const pm25 = data?.pm25 || 0;
  const info = getInfo(pm25);

  const avg = (key) => {
    if (!hist || hist.length === 0) return 0;
    return (hist.reduce((a, h) => a + (h[key] || 0), 0) / hist.length).toFixed(1);
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
              <View style={ss.modalHeader}>
                <Text style={ss.modalTitle}>Resumen de Lecturas</Text>
                <TouchableOpacity onPress={onClose} style={ss.closeBtn}>
                  <Ionicons name="close" size={20} color={C.text2} />
                </TouchableOpacity>
              </View>

              <View style={ss.modalSection}>
                <Text style={ss.modalSub}>LECTURA ACTUAL</Text>
                <View style={[ss.nivelBox, { backgroundColor:info.color+"15" }]}>
                  <View style={{ width:48, height:48, borderRadius:14, backgroundColor:info.color, alignItems:"center", justifyContent:"center" }}>
                    <MaterialCommunityIcons name="air-purifier" size={26} color="#fff" />
                  </View>
                  <View style={{ flex:1, marginLeft:12 }}>
                    <Text style={[ss.nivelLabel, { color:info.color }]}>{info.label}</Text>
                    <Text style={{ color:C.text2, fontSize:12, marginTop:3 }}>PM2.5: {pm25.toFixed(1)} µg/m³</Text>
                  </View>
                </View>
              </View>

              <View style={ss.modalSection}>
                <Text style={ss.modalSub}>PROMEDIO — ÚLTIMAS {hist?.length || 0} LECTURAS</Text>
                <View style={ss.promediosGrid}>
                  {[
                    { label:"PM2.5", val:avgPM25, unit:"µg/m³", color:infoAvg.color, icon:"air-purifier" },
                    { label:"PM10",  val:avgPM10, unit:"µg/m³", color:C.yellow,      icon:"blur"         },
                    { label:"CO₂",  val:avgCO2,  unit:"ppm",   color:C.text2,       icon:"molecule-co2" },
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
  const { perfil }        = useAuth();
  const estacionIds       = Object.keys(perfil?.estaciones || {});
  const stationId         = estacionIds[0] || null;
  const { data, loading } = useStation(stationId);
  const { hist }          = useHistory(stationId);
  const [modalVisible, setModalVisible] = useState(false);

  const online   = isDeviceOnline(data);
  const lastSync = timeSince(data?.timestamp);
  // Solo calcular calidad si el sensor está online y manda un valor real > 0
  const hasData  = online && (data?.pm25 ?? -1) > 0;
  const pm25     = hasData ? data.pm25 : 0;
  const info     = hasData
    ? getInfo(pm25)
    : { label: "Sin datos", color: "rgba(255,255,255,0.45)", bg: "transparent", emoji: "—", score: 0 };

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue:1.3, duration:800,  useNativeDriver:true }),
      Animated.timing(pulseAnim, { toValue:1,   duration:800,  useNativeDriver:true }),
      Animated.delay(600),
    ])).start();
  }, []);

  useEffect(() => {
    if (data) Animated.timing(fadeAnim, { toValue:1, duration:500, useNativeDriver:true }).start();
  }, [data]);

  // Progreso en escala OMS (0–150 µg/m³ → 0–100%)
  const progress = Math.min(100, (pm25 / 150) * 100);

  // Mini bar chart desde historial
  const chartBars = hist ? hist.slice(0, 18).reverse() : [];

  if (!stationId) {
    return (
      <View style={ss.emptyWrap}>
        <View style={ss.emptyIcoBox}>
          <MaterialCommunityIcons name="access-point-off" size={36} color={C.text3} />
        </View>
        <Text style={ss.emptyTitle}>Sin dispositivo vinculado</Text>
        <Text style={ss.emptyDesc}>
          Ve a Ajustes para vincular tu estación EcoGuardian o explorar los datos de la red.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>

      {/* ── HERO CARD ─────────────────────────────── */}
      <View style={ss.heroCard}>
        {/* Círculos decorativos */}
        <View style={ss.heroDeco1} />
        <View style={ss.heroDeco2} />

        {/* Live row */}
        <View style={ss.liveRow}>
          <Animated.View style={[ss.liveDot, { transform:[{ scale:pulseAnim }], opacity: online ? 1 : 0.4 }]} />
          <Text style={ss.liveTxt}>
            {online ? `EN VIVO · ${data?.nombre || "ESTACIÓN 1"}` : "SIN CONEXIÓN"}
          </Text>
        </View>

        {/* Nivel + número */}
        <Text style={ss.heroLevelTxt}>{info.label}</Text>
        <Animated.View style={{ opacity:fadeAnim }}>
          {loading
            ? <ActivityIndicator size="large" color="#fff" style={{ marginVertical:14 }} />
            : <Text style={ss.heroNum}>
                {hasData ? (pm25 < 10 ? pm25.toFixed(1) : Math.round(pm25)) : "—"}
              </Text>
          }
        </Animated.View>
        <Text style={ss.heroUnit}>{hasData ? "µg/m³ · PM2.5" : "Sin lectura activa"}</Text>

        {/* Barra de escala OMS — solo cuando hay datos reales */}
        {hasData && (
          <>
            <View style={ss.progressWrap}>
              <View style={[ss.progressBar, { width:`${progress}%` }]} />
            </View>
            <View style={ss.scaleRow}>
              {["0","12","35","55","150+"].map(s => (
                <Text key={s} style={ss.scaleTxt}>{s}</Text>
              ))}
            </View>
          </>
        )}

        {/* Botones de acción */}
        <View style={ss.heroBtnRow}>
          <TouchableOpacity style={ss.heroBtnPrimary} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <MaterialCommunityIcons name="chart-bar" size={13} color={C.greenD} />
            <Text style={ss.heroBtnPrimaryTxt}>Analíticas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ss.heroBtnGhost} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={13} color="#fff" />
            <Text style={ss.heroBtnGhostTxt}>Alertas</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Banner offline */}
      {!loading && data && !online && (
        <View style={ss.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={15} color={C.text3} />
          <Text style={ss.offlineTxt}>Dispositivo apagado — última lectura guardada</Text>
        </View>
      )}

      {/* ── QUICK 3 TARJETAS ─────────────────────── */}
      <Animated.View style={[ss.quickRow, { opacity:fadeAnim }]}>
        {[
          { icon:"molecule-co2",    label:"CO₂",  val:Math.round(data?.co2||0),  sub:"ppm",                      color:C.green                   },
          { icon:"chemical-weapon", label:"TVOC",  val:Math.round(data?.tvoc||0), sub:"ppb",                      color:C.yellow                  },
          { icon:"sync",            label:"Sync",  val:lastSync ?? "---",         sub:`${hist?.length||0} lect`,  color:online ? C.green : C.text3 },
        ].map((item, i) => (
          <View key={i} style={ss.quickCard}>
            <View style={[ss.quickIco, { backgroundColor:item.color }]}>
              <MaterialCommunityIcons name={item.icon} size={14} color="#fff" />
            </View>
            <Text style={[ss.quickVal, { color:C.text }]}>{item.val}</Text>
            <Text style={ss.quickSub}>{item.sub}</Text>
            <Text style={ss.quickLabel}>{item.label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* ── MINI GRÁFICA ─────────────────────────── */}
      {chartBars.length >= 3 && (
        <Animated.View style={[ss.trendCard, { opacity:fadeAnim }]}>
          <View style={ss.trendHeader}>
            <Text style={ss.trendTtl}>Tendencia reciente</Text>
            <View style={ss.trendPill}><Text style={ss.trendPillTxt}>PM2.5 µg/m³</Text></View>
          </View>
          <View style={ss.trendBars}>
            {chartBars.map((h, i) => {
              const hi = getInfo(h.pm25 || 0);
              const barH = Math.max(4, Math.min(44, ((h.pm25||0) / 60) * 44));
              return (
                <View key={i} style={ss.trendBarWrap}>
                  <View style={[ss.trendBar, { height:barH, backgroundColor:hi.color + "CC" }]} />
                </View>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* ── SENSORES EN TIEMPO REAL — solo cuando hay datos reales */}
      {hasData && (
        <Animated.View style={{ opacity:fadeAnim }}>
          <Card style={ss.sensorCard}>
            <View style={ss.cardHeader}>
              <Text style={ss.cardTitle}>Sensores en tiempo real</Text>
              <LiveDot />
            </View>
            <SensorRow icon="air-purifier"    label="PM2.5" value={data.pm25.toFixed(1)}       unit="µg/m³" color={info.color} />
            <SensorRow icon="blur"            label="PM10"  value={(data.pm10||0).toFixed(1)}   unit="µg/m³" color={C.yellow}   />
            <SensorRow icon="molecule-co2"    label="CO₂"   value={Math.round(data.co2||0)}     unit="ppm"   color={C.text2}    />
            <SensorRow icon="chemical-weapon" label="TVOC"  value={Math.round(data.tvoc||0)}    unit="ppb"   color={C.orange}   />
          </Card>
        </Animated.View>
      )}

      {/* Banner alarma */}
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
  // Hero card
  heroCard:          { margin:14, borderRadius:24,
                       backgroundColor:C.greenD,
                       padding:22, paddingBottom:18,
                       overflow:"hidden", position:"relative" },
  heroDeco1:         { position:"absolute", top:-40, right:-40,
                       width:160, height:160, borderRadius:80,
                       borderWidth:18, borderColor:"rgba(255,255,255,0.06)" },
  heroDeco2:         { position:"absolute", top:-80, right:-80,
                       width:240, height:240, borderRadius:120,
                       borderWidth:14, borderColor:"rgba(255,255,255,0.04)" },
  liveRow:           { flexDirection:"row", alignItems:"center", gap:6, marginBottom:8 },
  liveDot:           { width:6, height:6, borderRadius:3, backgroundColor:"#7CB342",
                       shadowColor:"#7CB342", shadowOffset:{width:0,height:0},
                       shadowOpacity:1, shadowRadius:6 },
  liveTxt:           { fontFamily:"JetBrainsMono_400Regular", fontSize:9,
                       letterSpacing:2, color:"#7CB342", fontWeight:"500" },
  heroLevelTxt:      { fontFamily:"Outfit_700Bold", fontSize:20, color:"#fff",
                       letterSpacing:-0.3 },
  heroNum:           { fontFamily:"JetBrainsMono_400Regular", fontSize:76,
                       lineHeight:84, color:"#fff", letterSpacing:-2,
                       fontWeight:"700", includeFontPadding:false },
  heroUnit:          { fontFamily:"Outfit_400Regular", fontSize:12,
                       color:"rgba(255,255,255,0.7)", marginTop:4, marginBottom:14,
                       letterSpacing:0.5 },
  progressWrap:      { height:6, borderRadius:3, backgroundColor:"rgba(255,255,255,0.15)",
                       overflow:"hidden", marginBottom:6 },
  progressBar:       { height:"100%", backgroundColor:"#7CB342", borderRadius:3 },
  scaleRow:          { flexDirection:"row", justifyContent:"space-between" },
  scaleTxt:          { fontFamily:"JetBrainsMono_400Regular", fontSize:8,
                       color:"rgba(255,255,255,0.5)", letterSpacing:0.5 },
  heroBtnRow:        { flexDirection:"row", gap:8, marginTop:16 },
  heroBtnPrimary:    { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center",
                       gap:6, paddingVertical:10, borderRadius:10,
                       backgroundColor:"#fff" },
  heroBtnPrimaryTxt: { fontFamily:"Outfit_700Bold", fontSize:12, color:C.greenD },
  heroBtnGhost:      { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center",
                       gap:6, paddingVertical:10, borderRadius:10,
                       backgroundColor:"rgba(255,255,255,0.12)" },
  heroBtnGhostTxt:   { fontFamily:"Outfit_700Bold", fontSize:12, color:"#fff" },

  // Quick row
  quickRow:          { flexDirection:"row", gap:8, marginHorizontal:14, marginBottom:12 },
  quickCard:         { flex:1, backgroundColor:C.card, borderRadius:14, padding:12,
                       alignItems:"center", gap:3,
                       shadowColor:"#1C2B1E", shadowOffset:{width:0,height:2},
                       shadowOpacity:.07, shadowRadius:8, elevation:2 },
  quickIco:          { width:28, height:28, borderRadius:8, alignItems:"center",
                       justifyContent:"center", marginBottom:4 },
  quickVal:          { fontFamily:"JetBrainsMono_400Regular", fontSize:15,
                       fontWeight:"700", color:C.text },
  quickSub:          { fontFamily:"JetBrainsMono_400Regular", fontSize:8,
                       color:C.text3, letterSpacing:0.5 },
  quickLabel:        { fontFamily:"Outfit_400Regular", fontSize:9, color:C.text2 },

  // Trend chart
  trendCard:         { marginHorizontal:14, marginBottom:12, backgroundColor:C.card,
                       borderRadius:16, padding:14,
                       shadowColor:"#1C2B1E", shadowOffset:{width:0,height:2},
                       shadowOpacity:.07, shadowRadius:8, elevation:2 },
  trendHeader:       { flexDirection:"row", justifyContent:"space-between",
                       alignItems:"center", marginBottom:10 },
  trendTtl:          { fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.text },
  trendPill:         { backgroundColor:C.bg2, paddingHorizontal:8, paddingVertical:3,
                       borderRadius:8 },
  trendPillTxt:      { fontFamily:"JetBrainsMono_400Regular", fontSize:8,
                       color:C.text2, letterSpacing:0.5 },
  trendBars:         { flexDirection:"row", alignItems:"flex-end", height:48, gap:3 },
  trendBarWrap:      { flex:1, alignItems:"center", justifyContent:"flex-end", height:48 },
  trendBar:          { width:"100%", borderRadius:3, minHeight:4 },

  // Sensor card
  sensorCard:        { marginHorizontal:14, marginBottom:12 },
  cardHeader:        { flexDirection:"row", alignItems:"center",
                       justifyContent:"space-between", marginBottom:12 },
  cardTitle:         { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.text },
  offlineBanner:     { flexDirection:"row", alignItems:"center", gap:8,
                       marginHorizontal:14, marginBottom:12,
                       backgroundColor:C.bg2, borderRadius:12,
                       paddingHorizontal:14, paddingVertical:10 },
  offlineTxt:        { fontFamily:"Outfit_400Regular", fontSize:12, color:C.text3, flex:1 },
  alertBanner:       { marginHorizontal:14, marginBottom:12, backgroundColor:C.card,
                       borderRadius:16, padding:16,
                       shadowColor:"#1C2B1E", shadowOffset:{width:0,height:2},
                       shadowOpacity:.07, shadowRadius:8, elevation:2 },
  alertTitle:        { fontFamily:"Outfit_700Bold", fontSize:14, color:C.red, marginBottom:6 },
  alertDesc:         { fontFamily:"Outfit_400Regular", fontSize:12, color:C.text, lineHeight:18 },

  // Empty (no station)
  emptyWrap:         { flex:1, alignItems:"center", justifyContent:"center", padding:40, gap:12 },
  emptyIcoBox:       { width:72, height:72, borderRadius:20, backgroundColor:C.bg2,
                       alignItems:"center", justifyContent:"center", marginBottom:4 },
  emptyTitle:        { fontFamily:"Outfit_700Bold", fontSize:18, color:C.text, textAlign:"center" },
  emptyDesc:         { fontFamily:"Outfit_400Regular", fontSize:13, color:C.text2,
                       textAlign:"center", lineHeight:20 },
  // Modal
  modalOverlay:      { flex:1, backgroundColor:"rgba(28,43,30,.55)",
                       justifyContent:"center", alignItems:"center", padding:20 },
  modalBox:          { backgroundColor:C.card, borderRadius:20, padding:20, width:"100%",
                       borderWidth:1, borderColor:C.border,
                       shadowColor:"#1C2B1E", shadowOffset:{width:0,height:8},
                       shadowOpacity:.12, shadowRadius:24, elevation:12 },
  modalHeader:       { flexDirection:"row", alignItems:"center",
                       justifyContent:"space-between", marginBottom:16 },
  modalTitle:        { fontFamily:"Outfit_700Bold", fontSize:15, color:C.text },
  closeBtn:          { width:30, height:30, borderRadius:8, backgroundColor:C.bg3,
                       alignItems:"center", justifyContent:"center" },
  modalSection:      { marginBottom:16 },
  modalSub:          { fontFamily:"JetBrainsMono_400Regular", fontSize:9, color:C.text3,
                       letterSpacing:2, marginBottom:8, textTransform:"uppercase" },
  nivelBox:          { flexDirection:"row", alignItems:"center", padding:14, borderRadius:12 },
  nivelLabel:        { fontFamily:"Outfit_700Bold", fontSize:20 },
  promediosGrid:     { flexDirection:"row", gap:8 },
  promedioCard:      { flex:1, backgroundColor:C.bg2, borderRadius:12, padding:10,
                       alignItems:"center", gap:4 },
  promedioVal:       { fontFamily:"JetBrainsMono_400Regular", fontSize:18, fontWeight:"800" },
  promedioUnit:      { fontFamily:"JetBrainsMono_400Regular", fontSize:9, color:C.text3 },
  promedioLabel:     { fontFamily:"Outfit_400Regular", fontSize:9, color:C.text2 },
  modalCloseBtn:     { paddingVertical:12, borderRadius:12, alignItems:"center", marginTop:4 },
});
