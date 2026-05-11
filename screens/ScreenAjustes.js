// ============================================================
//   ScreenAjustes.js — Sin expo-notifications
//   Usa Alert nativo que funciona en Expo Go
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Switch,
  TouchableOpacity, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// Requiere: npm install @react-native-async-storage/async-storage
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from "../components/Card";
import { useStation } from "../hooks/useFirebase";
import { getInfo, timeSince } from "../utils/helpers";
import { C } from "../constants/colors";

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
export default function ScreenAjustes({ setDarkMode, darkMode }) {
  const { data }                    = useStation();
  const [notifAlertas, setNotifAlertas] = useState(false);
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
          sub="estacion_01 — Culiacán, Sinaloa"
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
          sub="Timestamp del sensor"
          right={<Text style={ss.gris}>{timeSince(data?.timestamp, data?.receivedAt)}</Text>}
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

        {/* Modo oscuro */}
        <Row
          icon="moon-outline"
          label="Modo oscuro"
          sub="Tema de la aplicación"
          right={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false:C.border, true:C.green+"88" }}
              thumbColor={darkMode ? C.green : C.text3}
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

      <View style={{ height:24 }} />
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  card:            { marginHorizontal:16, marginTop:4, marginBottom:12 },
  sectionTitle:    { fontSize:13, fontWeight:"800", color:C.text, marginBottom:12 },
  row:             { flexDirection:"row", alignItems:"center", paddingVertical:10, gap:12 },
  rowIcon:         { width:34, height:34, borderRadius:10, backgroundColor:C.green+"22",
                     alignItems:"center", justifyContent:"center" },
  rowLabel:        { color:C.text, fontSize:13, fontWeight:"600" },
  rowSub:          { color:C.text3, fontSize:11, marginTop:1, lineHeight:15 },
  div:             { height:1, backgroundColor:C.border, marginVertical:2 },
  verde:           { fontSize:12, fontWeight:"700", color:C.green },
  gris:            { fontSize:11, fontWeight:"600", color:C.text2 },
  estadoBadge:     { flexDirection:"row", alignItems:"center", gap:5,
                     backgroundColor:C.green+"22", paddingHorizontal:10,
                     paddingVertical:4, borderRadius:10, borderWidth:1, borderColor:C.green+"44" },
  estadoDot:       { width:6, height:6, borderRadius:3, backgroundColor:C.green },
  estadoTxt:       { fontSize:11, fontWeight:"700", color:C.green },
  nivelBadge:      { paddingHorizontal:10, paddingVertical:4, borderRadius:10, borderWidth:1 },
  nivelTxt:        { fontSize:11, fontWeight:"700" },
  probarBtn:       { flexDirection:"row", alignItems:"center", gap:4,
                     backgroundColor:C.green+"22", paddingHorizontal:10,
                     paddingVertical:5, borderRadius:8, borderWidth:1, borderColor:C.green+"44" },
  probarTxt:       { fontSize:11, fontWeight:"700", color:C.green },
  activoBanner:    { marginHorizontal:16, marginBottom:12, flexDirection:"row", alignItems:"center",
                     backgroundColor:C.green+"15", borderRadius:14, padding:14,
                     borderWidth:1, borderColor:C.green+"44" },
  activoBannerTitle:{ color:C.green, fontSize:13, fontWeight:"700" },
  activoBannerSub: { color:C.text3, fontSize:11, marginTop:2 },
});