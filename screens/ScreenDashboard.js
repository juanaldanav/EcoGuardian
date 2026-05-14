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
import { useStationContext } from "../context/StationContext";
import { getInfo, timeSince, isDeviceOnline, METRICAS, getCO2Info, getTVOCInfo } from "../utils/helpers";
import { C } from "../constants/colors";

// OMS breakpoints para la barra de escala
const OMS_SCALE = [
  { pct: 8,  color: C.green  },
  { pct: 23, color: C.yellow },
  { pct: 13, color: C.orange },
  { pct: 32, color: C.red    },
  { pct: 24, color: C.purple },
];

const COLOR_MAP = { green: C.green, yellow: C.yellow, orange: C.orange, red: C.red, purple: C.purple };

// ── Gráfica de área (polígono de frecuencias) — SVG web ──────
function AreaChart({ data }) {
  if (!data || data.length < 2) return null;
  const maxVal = Math.max(...data.map(h => h.pm25 || 0), 1);
  const n = data.length;
  const H = 60;
  const pts = data.map((h, i) => [
    (i / (n - 1)) * 100,
    H - 4 - (((h.pm25 || 0) / maxVal) * (H - 10)),
  ]);
  const lineStr = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const areaStr = `0,${H} ${lineStr} 100,${H}`;
  const avg     = data.reduce((s, h) => s + (h.pm25 || 0), 0) / n;
  const col     = getInfo(avg).color;
  const gradId  = `ag${col.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <View style={{ height: H, marginTop: 4 }}>
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none"
        style={{ width:"100%", height:H, display:"block" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={col} stopOpacity="0.4" />
            <stop offset="100%" stopColor={col} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <polygon  points={areaStr} fill={`url(#${gradId})`} />
        <polyline points={lineStr} fill="none" stroke={col}
          strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2" fill={col} />
        ))}
      </svg>
    </View>
  );
}

// ── Pantalla bloqueada para exploradores ─────────────────────
function ExplorerGate() {
  return (
    <View style={ss.gateWrap}>
      <View style={ss.gateIco}>
        <MaterialCommunityIcons name="leaf-off" size={34} color={C.text3} />
      </View>
      <Text style={ss.gateTitle}>Solo para suscriptores</Text>
      <Text style={ss.gateDesc}>
        Este módulo requiere un dispositivo EcoG activo.{"\n"}
        Ve a Ajustes para adoptar tu estación.
      </Text>
      <View style={ss.gateBadge}>
        <MaterialCommunityIcons name="check-circle" size={14} color={C.green} />
        <Text style={ss.gateBadgeTxt}>Plan EcoG Station · $599 MXN/mes</Text>
      </View>
    </View>
  );
}

// ── Modal de información de métrica ──────────────────────────
function MetricaModal({ metricaKey, valorActual, onClose }) {
  const m = METRICAS[metricaKey];
  if (!m) return null;

  const scaleAnim = useRef(new Animated.Value(0.72)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim,  { toValue:1, useNativeDriver:true, tension:160, friction:7 }),
      Animated.spring(slideAnim,  { toValue:0, useNativeDriver:true, tension:160, friction:7 }),
      Animated.timing(fadeAnim,   { toValue:1, duration:140, useNativeDriver:true }),
    ]).start();
  }, []);

  const rangoActual = valorActual != null
    ? m.rangos.find(r => valorActual >= r.min && (r.max == null || valorActual < r.max))
    : null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[ss.modalOverlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[ss.modalBox, {
                transform:[{ scale: scaleAnim }, { translateY: slideAnim }]
              }]}>

              {/* Header */}
              <View style={ss.modalHeader}>
                <View style={[ss.metricaIcoBox, {
                  backgroundColor: rangoActual ? COLOR_MAP[rangoActual.color] : C.green
                }]}>
                  <MaterialCommunityIcons name={m.icono} size={20} color="#fff" />
                </View>
                <View style={{ flex:1, marginLeft:10 }}>
                  <Text style={ss.modalTitle}>{m.nombre}</Text>
                  <Text style={ss.metricaUnidad}>{m.unidad}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={ss.closeBtn}>
                  <Ionicons name="close" size={18} color={C.text2} />
                </TouchableOpacity>
              </View>

              {/* Lectura actual — fondo sólido */}
              {valorActual != null && rangoActual && (
                <View style={[ss.lecturaActual, { backgroundColor: COLOR_MAP[rangoActual.color] }]}>
                  <Text style={ss.lecturaVal}>
                    {typeof valorActual === "number" && valorActual % 1 !== 0
                      ? valorActual.toFixed(1) : Math.round(valorActual)} {m.unidad}
                  </Text>
                  <Text style={ss.lecturaLabel}>
                    {rangoActual.label} · {rangoActual.desc}
                  </Text>
                </View>
              )}

              {/* Descripción */}
              <Text style={ss.metricaDesc}>{m.descripcion}</Text>
              <Text style={ss.metricaImpacto}>{m.impacto}</Text>

              {/* Norma — fondo sólido */}
              <View style={ss.normaBadge}>
                <Ionicons name="document-text-outline" size={12} color="#fff" />
                <Text style={ss.normaTxt}>{m.norma}</Text>
              </View>
              <Text style={ss.limiteRef}>Referencia: {m.limiteRef}</Text>

              {/* Tabla de rangos */}
              <Text style={ss.rangosTitle}>CLASIFICACIÓN DE NIVELES</Text>
              {m.rangos.map((r, i) => {
                const active = rangoActual?.label === r.label;
                return (
                  <View key={i} style={[ss.rangoRow,
                    active && { backgroundColor: COLOR_MAP[r.color], borderRadius:8 }]}>
                    <View style={[ss.rangoDot, {
                      backgroundColor: active ? "#fff" : COLOR_MAP[r.color]
                    }]} />
                    <View style={{ flex:1 }}>
                      <Text style={[ss.rangoLabel, active && { color:"#fff" }]}>
                        {r.label}
                      </Text>
                      <Text style={[ss.rangoDesc, active && { color:"rgba(255,255,255,0.8)" }]}>
                        {r.desc}
                      </Text>
                    </View>
                    <Text style={[ss.rangoRango, active && { color:"rgba(255,255,255,0.9)" }]}>
                      {r.max != null ? `${r.min}–${r.max}` : `>${r.min}`}
                    </Text>
                  </View>
                );
              })}

            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

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
export default function ScreenDashboard({ onGoAlerts }) {
  const { selectedId, setSelectedId, listaIds, stations,
          loading: stCtxLoading, isExplorer, stationLabel } = useStationContext();
  const stationId         = selectedId;
  const { data, loading } = useStation(stationId);
  const { hist }          = useHistory(stationId);
  const [modalVisible,   setModalVisible]   = useState(false);
  const [metricaModal,   setMetricaModal]   = useState(null);
  const [dropdownOpen,   setDropdownOpen]   = useState(false);

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

  if (isExplorer) return <ExplorerGate />;

  if (!stationId) {
    if (stCtxLoading) {
      return (
        <View style={ss.emptyWrap}>
          <ActivityIndicator size="large" color={C.green} />
          <Text style={ss.emptyDesc}>Conectando con la red...</Text>
        </View>
      );
    }
    return (
      <View style={ss.emptyWrap}>
        <View style={ss.emptyIcoBox}>
          <MaterialCommunityIcons name="access-point-off" size={36} color={C.text3} />
        </View>
        <Text style={ss.emptyTitle}>Sin datos disponibles</Text>
        <Text style={ss.emptyDesc}>No hay estaciones activas en la red.</Text>
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

        {/* Selector de estación — siempre visible */}
        <TouchableOpacity
          style={ss.selectorBtn}
          onPress={() => listaIds.length > 1 && setDropdownOpen(true)}
          activeOpacity={listaIds.length > 1 ? 0.8 : 1}
        >
          <Ionicons name="layers-outline" size={13} color="rgba(255,255,255,0.8)" />
          <Text style={ss.selectorTxt} numberOfLines={1}>
            {stationLabel(stationId)}
          </Text>
          {listaIds.length > 1 && (
            <Ionicons name="chevron-down" size={13} color="rgba(255,255,255,0.8)" />
          )}
        </TouchableOpacity>

        {/* Live row */}
        <View style={ss.liveRow}>
          <Animated.View style={[ss.liveDot, { transform:[{ scale:pulseAnim }], opacity: online ? 1 : 0.4 }]} />
          <Text style={ss.liveTxt}>
            {online ? `EN VIVO · ${stationLabel(stationId)}` : "SIN CONEXIÓN"}
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
          <TouchableOpacity style={ss.heroBtnGhost} onPress={onGoAlerts} activeOpacity={0.8}>
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
      {(() => {
        const co2Info  = getCO2Info(data?.co2);
        const tvocInfo = getTVOCInfo(data?.tvoc);
        return (
          <Animated.View style={[ss.quickRow, { opacity:fadeAnim }]}>
            {[
              { icon:"molecule-co2",    label:"CO₂",  val:Math.round(data?.co2||0),  sub:"ppm", color:co2Info.color,               nivel:co2Info.label,  key:"co2"  },
              { icon:"chemical-weapon", label:"TVOC",  val:Math.round(data?.tvoc||0), sub:"ppb", color:tvocInfo.color,              nivel:tvocInfo.label, key:"tvoc" },
              { icon:"sync",            label:"Sync",  val:lastSync ?? "---",         sub:`${hist?.length||0} lect`, color:online ? C.green : C.text3, nivel:null, key:"sync" },
            ].map((item) => (
              <View key={item.key} style={ss.quickCard}>
                <View style={[ss.quickIco, { backgroundColor:item.color }]}>
                  <MaterialCommunityIcons name={item.icon} size={14} color="#fff" />
                </View>
                <Text style={[ss.quickVal, { color:C.text }]}>{item.val}</Text>
                <Text style={ss.quickSub}>{item.sub}</Text>
                {item.nivel && (
                  <View style={[ss.quickNivel, { backgroundColor: item.color + "18" }]}>
                    <Text style={[ss.quickNivelTxt, { color: item.color }]}>{item.nivel}</Text>
                  </View>
                )}
                <Text style={ss.quickLabel}>{item.label}</Text>
              </View>
            ))}
          </Animated.View>
        );
      })()}

      {/* ── GRÁFICA DE TENDENCIA ─────────────────── */}
      {chartBars.length >= 3 && (
        <Animated.View style={[ss.trendCard, { opacity:fadeAnim }]}>
          <View style={ss.trendHeader}>
            <Text style={ss.trendTtl}>Tendencia reciente</Text>
            <View style={ss.trendPill}><Text style={ss.trendPillTxt}>PM2.5 µg/m³</Text></View>
          </View>
          <AreaChart data={chartBars} />
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
            <SensorRow icon="air-purifier"    label="PM2.5" value={data.pm25.toFixed(1)}       unit="µg/m³" color={info.color} onPress={() => setMetricaModal("pm25")} />
            <SensorRow icon="blur"            label="PM10"  value={(data.pm10||0).toFixed(1)}   unit="µg/m³" color={C.yellow}   onPress={() => setMetricaModal("pm10")} />
            <SensorRow icon="molecule-co2"    label="CO₂"   value={Math.round(data.co2||0)}     unit="ppm"   color={C.text2}    onPress={() => setMetricaModal("co2")}  />
            <SensorRow icon="chemical-weapon" label="TVOC"  value={Math.round(data.tvoc||0)}    unit="ppb"   color={C.orange}   onPress={() => setMetricaModal("tvoc")} />
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

      {metricaModal && (
        <MetricaModal
          metricaKey={metricaModal}
          valorActual={
            metricaModal === "pm25" ? data?.pm25 :
            metricaModal === "pm10" ? data?.pm10 :
            metricaModal === "co2"  ? data?.co2  :
            metricaModal === "tvoc" ? data?.tvoc  : null
          }
          onClose={() => setMetricaModal(null)}
        />
      )}

      {/* ── DROPDOWN SELECTOR ─────────────────────── */}
      <Modal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setDropdownOpen(false)}>
          <View style={ss.dropOverlay}>
            <TouchableWithoutFeedback>
              <View style={ss.dropBox}>
                <Text style={ss.dropTitle}>Seleccionar estación</Text>
                {listaIds.map(id => (
                  <TouchableOpacity
                    key={id}
                    style={[ss.dropItem, id === stationId && ss.dropItemActive]}
                    onPress={() => { setSelectedId(id); setDropdownOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={id === stationId ? "radio-button-on" : "radio-button-off"}
                      size={16}
                      color={id === stationId ? C.green : C.text3}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[ss.dropItemName, id === stationId && { color: C.green }]}>
                        {stations[id]?.nombre || id}
                      </Text>
                      <Text style={ss.dropItemId}>{id}</Text>
                    </View>
                    {id === stationId && <Ionicons name="checkmark" size={16} color={C.green} />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  quickNivel:        { paddingHorizontal:6, paddingVertical:2, borderRadius:6, marginTop:3 },
  quickNivelTxt:     { fontFamily:"Outfit_600SemiBold", fontSize:8, letterSpacing:0.3 },
  quickLabel:        { fontFamily:"Outfit_400Regular", fontSize:9, color:C.text2, marginTop:2 },

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
  // Modal métrica
  metricaIcoBox:  { width:40, height:40, borderRadius:12, alignItems:"center", justifyContent:"center" },
  metricaUnidad:  { fontFamily:"JetBrainsMono_400Regular", fontSize:10, color:C.text3, marginTop:1 },
  metricaDesc:    { fontFamily:"Outfit_400Regular", fontSize:12, color:C.text2, lineHeight:18, marginBottom:8 },
  metricaImpacto: { fontFamily:"Outfit_400Regular", fontSize:11, color:C.text3, lineHeight:17, marginBottom:10 },
  normaBadge:     { flexDirection:"row", alignItems:"center", gap:5,
                    backgroundColor:C.green, borderRadius:8,
                    paddingHorizontal:10, paddingVertical:5, alignSelf:"flex-start", marginBottom:4 },
  normaTxt:       { fontFamily:"JetBrainsMono_400Regular", fontSize:9, color:"#fff", letterSpacing:0.5 },
  limiteRef:      { fontFamily:"Outfit_400Regular", fontSize:11, color:C.text3, marginBottom:12 },
  rangosTitle:    { fontFamily:"JetBrainsMono_400Regular", fontSize:9, color:C.text3,
                    letterSpacing:2, marginBottom:8 },
  rangoRow:       { flexDirection:"row", alignItems:"center", gap:10,
                    paddingVertical:7, paddingHorizontal:6, marginBottom:2 },
  rangoDot:       { width:8, height:8, borderRadius:4, flexShrink:0 },
  rangoLabel:     { fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.text },
  rangoDesc:      { fontFamily:"Outfit_400Regular", fontSize:10, color:C.text3, marginTop:1 },
  rangoRango:     { fontFamily:"JetBrainsMono_400Regular", fontSize:9, color:C.text3 },
  lecturaActual:  { flexDirection:"row", alignItems:"center", justifyContent:"space-between",
                    padding:14, borderRadius:12, marginBottom:12 },
  lecturaVal:     { fontFamily:"JetBrainsMono_400Regular", fontSize:20, fontWeight:"700", color:"#fff" },
  lecturaLabel:   { fontFamily:"Outfit_400Regular", fontSize:11, flex:1,
                    textAlign:"right", lineHeight:15, color:"rgba(255,255,255,0.85)" },

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

  // Selector de estación
  selectorBtn:       { flexDirection:"row", alignItems:"center", gap:5, alignSelf:"center",
                       backgroundColor:"rgba(255,255,255,0.12)", borderRadius:20,
                       paddingHorizontal:12, paddingVertical:5, marginBottom:10 },
  selectorTxt:       { fontFamily:"Outfit_600SemiBold", fontSize:11,
                       color:"rgba(255,255,255,0.9)", maxWidth:180 },

  // Dropdown modal
  dropOverlay:       { flex:1, backgroundColor:"rgba(0,0,0,0.45)",
                       justifyContent:"center", paddingHorizontal:24 },
  dropBox:           { backgroundColor:C.card, borderRadius:20, overflow:"hidden",
                       borderWidth:1, borderColor:C.border },
  dropTitle:         { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.text2,
                       letterSpacing:0.5, paddingHorizontal:18, paddingVertical:14,
                       borderBottomWidth:1, borderBottomColor:C.border },
  dropItem:          { flexDirection:"row", alignItems:"center",
                       paddingHorizontal:18, paddingVertical:14,
                       borderBottomWidth:1, borderBottomColor:C.border },
  dropItemActive:    { backgroundColor:C.green + "10" },
  dropItemName:      { fontFamily:"Outfit_600SemiBold", fontSize:14, color:C.text },
  dropItemId:        { fontFamily:"JetBrainsMono_400Regular", fontSize:10,
                       color:C.text3, marginTop:2 },

  // Explorer gate
  gateWrap:    { flex:1, alignItems:"center", justifyContent:"center",
                 padding:40, gap:14 },
  gateIco:     { width:72, height:72, borderRadius:20, backgroundColor:C.bg2,
                 alignItems:"center", justifyContent:"center" },
  gateTitle:   { fontFamily:"Outfit_700Bold", fontSize:18, color:C.text, textAlign:"center" },
  gateDesc:    { fontFamily:"Outfit_400Regular", fontSize:13, color:C.text2,
                 textAlign:"center", lineHeight:20 },
  gateBadge:   { flexDirection:"row", alignItems:"center", gap:8,
                 backgroundColor:C.green+"12", borderRadius:12,
                 paddingHorizontal:16, paddingVertical:10 },
  gateBadgeTxt:{ fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.green },
});
