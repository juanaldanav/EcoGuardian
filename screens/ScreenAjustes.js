// ============================================================
//   ScreenAjustes.js — Sin expo-notifications
//   Usa Alert nativo que funciona en Expo Go
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Switch,
  TouchableOpacity, Alert, TextInput, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from "../components/Card";
import { useStation, useWifiNetworks } from "../hooks/useFirebase";
import { getInfo, timeSince, isDeviceOnline } from "../utils/helpers";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";

// ── Fila reutilizable ────────────────────────────────────────
function Row({ icon, label, sub, right, onPress }) {
  const content = (
    <View style={ss.row}>
      <View style={ss.rowIcon}>
        <Ionicons name={icon} size={18} color={C.green} />
      </View>
      <View style={{ flex:1 }}>
        <Text style={ss.rowLabel}>{label}</Text>
        {sub && <Text style={ss.rowSub}>{sub}</Text>}
      </View>
      {right}
    </View>
  );

  return onPress
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>
    : content;
}

// ── Pantalla Ajustes ─────────────────────────────────────────
// ── Modal agregar red ─────────────────────────────────────────
function ModalRed({ visible, onClose, onGuardar }) {
  const [ssid, setSsid]       = useState("");
  const [pass, setPass]       = useState("");
  const [verPass, setVerPass] = useState(false);

  function guardar() {
    if (!ssid.trim()) return Alert.alert("Falta el nombre de la red");
    onGuardar(ssid.trim(), pass);
    setSsid(""); setPass("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={ss.modalOverlay}>
        <View style={ss.modalBox}>
          <Text style={ss.modalTitle}>Agregar red WiFi</Text>
          <Text style={ss.modalHint}>El dispositivo la usará en el próximo arranque</Text>

          <Text style={ss.inputLabel}>Nombre de la red (SSID)</Text>
          <TextInput
            style={ss.input}
            value={ssid}
            onChangeText={setSsid}
            placeholder="Mi Red WiFi"
            placeholderTextColor={C.text3}
            autoCapitalize="none"
          />

          <Text style={ss.inputLabel}>Contraseña</Text>
          <View style={ss.inputRow}>
            <TextInput
              style={[ss.input, { flex: 1 }]}
              value={pass}
              onChangeText={setPass}
              placeholder="Contraseña (vacío si es abierta)"
              placeholderTextColor={C.text3}
              secureTextEntry={!verPass}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setVerPass(v => !v)} style={ss.eyeBtn}>
              <Ionicons name={verPass ? "eye-off-outline" : "eye-outline"} size={18} color={C.text3} />
            </TouchableOpacity>
          </View>

          <View style={ss.modalBtns}>
            <TouchableOpacity onPress={onClose} style={ss.modalBtnSec}>
              <Text style={ss.modalBtnSecTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={guardar} style={[ss.modalBtnPrim, { backgroundColor: C.green }]}>
              <Text style={ss.modalBtnPrimTxt}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Pantalla Ajustes ──────────────────────────────────────────
export default function ScreenAjustes() {
  const { data }                    = useStation();
  const { redes, agregar, eliminar } = useWifiNetworks();
  const online = isDeviceOnline(data?.timestamp);
  const [notifAlertas, setNotifAlertas] = useState(false);
  const [modalRed, setModalRed]     = useState(false);
  const alertaActivaRef             = useRef(false);

  const info = getInfo(data?.pm25 || 0);

  // Carga persistencia de notifAlertas al montar
  useEffect(() => {
    AsyncStorage.getItem('notifAlertas').then(val => {
      if (val !== null) setNotifAlertas(val === 'true');
    });
  }, []);

  // Vigila cambios en la alarma de Firebase
  useEffect(() => {
    if (!notifAlertas) return;

    // Si la alarma se activa y no habíamos notificado aún
    if (data?.alarma && !alertaActivaRef.current) {
      alertaActivaRef.current = true;
      const ni = getInfo(data?.pm25 || 0);
      Alert.alert(
        "Alerta de Calidad del Aire",
        `Nivel ${ni.label}\nPM2.5: ${(data?.pm25||0).toFixed(1)} µg/m³\n\nEvita actividad al aire libre.`,
        [{ text: "Entendido", style: "default" }]
      );
    }

    // Resetea cuando el aire vuelve a ser bueno
    if (!data?.alarma) {
      alertaActivaRef.current = false;
    }
  }, [data?.alarma, notifAlertas]);

  function toggleNotifAlertas(valor) {
    AsyncStorage.setItem('notifAlertas', String(valor));
    setNotifAlertas(valor);
    if (valor) {
      Alert.alert(
        "Alertas activadas",
        "Recibirás avisos dentro de la app cuando PM2.5 supere 35 µg/m³.",
        [{ text: "OK" }]
      );
    } else {
      Alert.alert("Alertas desactivadas", "Ya no recibirás avisos de calidad del aire.");
    }
  }

  function probarAlerta() {
    Alert.alert(
      "Prueba de Alerta",
      `Las alertas están funcionando correctamente.\n\nEstación: ${data?.nombre || "Centro Culiacán"}\nPM2.5 actual: ${(data?.pm25||0).toFixed(1)} µg/m³\nNivel: ${info.label}`,
      [{ text: "Cerrar", style: "default" }]
    );
  }

  return (
    <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>

      {/* ── ESTADO DEL SISTEMA ──────────────────────── */}
      <Card style={ss.card}>
        <Text style={ss.sectionTitle}>Estado del sistema</Text>
        <View style={ss.div} />

        <Row
          icon="wifi"
          label="Firebase"
          sub="ecoguardian-68553-default-rtdb"
          right={
            <View style={ss.estadoBadge}>
              <View style={ss.estadoDot} />
              <Text style={ss.estadoTxt}>Conectado</Text>
            </View>
          }
        />
        <View style={ss.div} />

        <Row
          icon="hardware-chip"
          label="Estación"
          sub={online ? "estacion_01 — En línea" : "estacion_01 — Sin conexión"}
          right={
            <View style={[ss.nivelBadge, { backgroundColor:info.color+"22", borderColor:info.color+"44" }]}>
              <Text style={[ss.nivelTxt, { color:info.color }]}>{info.emoji} {info.label}</Text>
            </View>
          }
        />
        <View style={ss.div} />

        <Row
          icon="time-outline"
          label="Última actualización"
          sub={isDeviceOnline(data?.timestamp) ? "Datos en tiempo real" : "Dispositivo sin conexión"}
          right={
            <Text style={[ss.gris, !isDeviceOnline(data?.timestamp) && { color:C.text3 }]}>
              {timeSince(data?.timestamp) ? `hace ${timeSince(data?.timestamp)}` : "Sin datos"}
            </Text>
          }
        />
        <View style={ss.div} />

        <Row
          icon="cellular"
          label="Intervalo de envío"
          sub="Frecuencia de datos del ESP32"
          right={<Text style={ss.verde}>30 seg</Text>}
        />
      </Card>

      {/* ── PREFERENCIAS ────────────────────────────── */}
      <Card style={ss.card}>
        <Text style={ss.sectionTitle}>Preferencias</Text>
        <View style={ss.div} />

        {/* Alertas */}
        <Row
          icon="warning-outline"
          label="Alertas de calidad del aire"
          sub={
            notifAlertas
              ? "Activo — aviso cuando PM2.5 > 35 µg/m³"
              : "Desactivado"
          }
          right={
            <Switch
              value={notifAlertas}
              onValueChange={toggleNotifAlertas}
              trackColor={{ false:C.border, true:C.green+"88" }}
              thumbColor={notifAlertas ? C.green : C.text3}
            />
          }
        />
        <View style={ss.div} />

        {/* Probar alerta */}
        <Row
          icon="notifications-outline"
          label="Probar alerta"
          sub="Muestra una alerta de prueba ahora"
          onPress={probarAlerta}
          right={
            <View style={ss.probarBtn}>
              <Ionicons name="play" size={12} color={C.green} />
              <Text style={ss.probarTxt}>Probar</Text>
            </View>
          }
        />
      </Card>

      {/* Banner si las alertas están activas */}
      {notifAlertas && (
        <View style={ss.activoBanner}>
          <Ionicons name="shield-checkmark" size={18} color={C.green} />
          <View style={{ flex:1, marginLeft:10 }}>
            <Text style={ss.activoBannerTitle}>Alertas activas</Text>
            <Text style={ss.activoBannerSub}>
              La app vigilará la calidad del aire mientras esté abierta
            </Text>
          </View>
        </View>
      )}

      {/* ── REDES WIFI ──────────────────────────────── */}
      <Card style={ss.card}>
        <View style={ss.wifiHeader}>
          <Text style={ss.sectionTitle}>Redes WiFi del dispositivo</Text>
          <TouchableOpacity onPress={() => setModalRed(true)} style={ss.addBtn}>
            <Ionicons name="add" size={16} color={C.green} />
            <Text style={ss.addBtnTxt}>Agregar</Text>
          </TouchableOpacity>
        </View>
        <Text style={ss.rowSub}>
          El ESP32 las prueba en orden al encender. Los cambios aplican en el siguiente arranque.
        </Text>

        {redes.length === 0
          ? <View style={ss.emptyRed}>
              <Ionicons name="wifi-outline" size={28} color={C.text3} />
              <Text style={ss.emptyRedTxt}>Sin redes configuradas</Text>
            </View>
          : redes.map((red, i) => (
              <View key={red.id} style={[ss.redRow, i < redes.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }]}>
                <Ionicons name="wifi" size={16} color={C.green} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={ss.redSSID}>{red.ssid}</Text>
                  <Text style={ss.redPass}>{red.password ? "••••••••" : "Red abierta"}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => Alert.alert("Eliminar red", `¿Quitar "${red.ssid}"?`, [
                    { text: "Cancelar" },
                    { text: "Eliminar", style: "destructive", onPress: () => eliminar(red.id) },
                  ])}
                  style={ss.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={C.text3} />
                </TouchableOpacity>
              </View>
            ))
        }
      </Card>

      <View style={{ height: 24 }} />

      <ModalRed
        visible={modalRed}
        onClose={() => setModalRed(false)}
        onGuardar={agregar}
      />
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  card:            { marginHorizontal:16, marginTop:4, marginBottom:12 },
  sectionTitle:    { fontFamily:"Outfit_700Bold", fontSize:13, color:C.text, marginBottom:12 },
  row:             { flexDirection:"row", alignItems:"center", paddingVertical:10, gap:12 },
  rowIcon:         { width:34, height:34, borderRadius:10, backgroundColor:C.green+"18",
                     alignItems:"center", justifyContent:"center" },
  rowLabel:        { fontFamily:"Outfit_600SemiBold", color:C.text, fontSize:13 },
  rowSub:          { fontFamily:"Outfit_400Regular", color:C.text3, fontSize:11, marginTop:1, lineHeight:15 },
  div:             { height:1, backgroundColor:C.border, marginVertical:2 },
  verde:           { fontSize:12, fontWeight:"700", color:C.green },
  gris:            { fontSize:11, fontWeight:"600", color:C.text2 },
  estadoBadge:     { flexDirection:"row", alignItems:"center", gap:5,
                     backgroundColor:C.green+"15", paddingHorizontal:10,
                     paddingVertical:4, borderRadius:10 },
  estadoDot:       { width:6, height:6, borderRadius:3, backgroundColor:C.green },
  estadoTxt:       { fontSize:11, fontWeight:"700", color:C.green },
  nivelBadge:      { paddingHorizontal:10, paddingVertical:4, borderRadius:10 },
  nivelTxt:        { fontSize:11, fontWeight:"700" },
  probarBtn:       { flexDirection:"row", alignItems:"center", gap:4,
                     backgroundColor:C.green+"12", paddingHorizontal:10,
                     paddingVertical:5, borderRadius:8 },
  probarTxt:       { fontSize:11, fontWeight:"700", color:C.green },
  activoBanner:    { marginHorizontal:16, marginBottom:12, flexDirection:"row", alignItems:"center",
                     backgroundColor:C.card, borderRadius:14, padding:14,
                     shadowColor:"#1C2B1E", shadowOffset:{width:0,height:2},
                     shadowOpacity:.07, shadowRadius:8, elevation:2 },
  activoBannerTitle:{ color:C.green, fontSize:13, fontWeight:"700" },
  activoBannerSub: { color:C.text3, fontSize:11, marginTop:2 },
  // Redes WiFi
  wifiHeader:   { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:4 },
  addBtn:       { flexDirection:"row", alignItems:"center", gap:4,
                  paddingHorizontal:10, paddingVertical:5, borderRadius:8, backgroundColor:C.green+"12" },
  addBtnTxt:    { fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.green },
  emptyRed:     { alignItems:"center", paddingVertical:20, gap:8 },
  emptyRedTxt:  { fontFamily:"Outfit_400Regular", fontSize:12, color:C.text3 },
  redRow:       { flexDirection:"row", alignItems:"center", paddingVertical:12 },
  redSSID:      { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.text },
  redPass:      { fontFamily:"JetBrainsMono_400Regular", fontSize:11, color:C.text3, marginTop:2 },
  deleteBtn:    { padding:6 },
  // Modal
  modalOverlay: { flex:1, backgroundColor:"rgba(28,43,30,.45)", justifyContent:"center",
                  alignItems:"center", padding:24 },
  modalBox:     { backgroundColor:C.card, borderRadius:20, padding:24, width:"100%",
                  shadowColor:"#1C2B1E", shadowOffset:{width:0,height:8},
                  shadowOpacity:.12, shadowRadius:24, elevation:12 },
  modalTitle:   { fontFamily:"Outfit_700Bold", fontSize:16, color:C.text, marginBottom:4 },
  modalHint:    { fontFamily:"Outfit_400Regular", fontSize:12, color:C.text3, marginBottom:20 },
  inputLabel:   { fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.text2, marginBottom:6 },
  input:        { backgroundColor:C.bg2, borderRadius:10, paddingHorizontal:14, paddingVertical:10,
                  fontFamily:"Outfit_400Regular", fontSize:14, color:C.text, marginBottom:14 },
  inputRow:     { flexDirection:"row", alignItems:"center", gap:8, marginBottom:14 },
  eyeBtn:       { padding:8, backgroundColor:C.bg2, borderRadius:10 },
  modalBtns:    { flexDirection:"row", gap:10, marginTop:4 },
  modalBtnSec:  { flex:1, paddingVertical:12, borderRadius:12, backgroundColor:C.bg2,
                  alignItems:"center" },
  modalBtnSecTxt:{ fontFamily:"Outfit_600SemiBold", fontSize:14, color:C.text2 },
  modalBtnPrim: { flex:1, paddingVertical:12, borderRadius:12, alignItems:"center" },
  modalBtnPrimTxt:{ fontFamily:"Outfit_700Bold", fontSize:14, color:"#fff" },
});