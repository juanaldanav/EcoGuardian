// ============================================================
//   ScreenAjustes.js — Sin expo-notifications
//   Usa Alert nativo que funciona en Expo Go
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Switch,
  TouchableOpacity, Alert, TextInput, Modal,
  ActivityIndicator, Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from "../components/Card";
import { ref as dbRef, update, remove } from "firebase/database";
import { db } from "../constants/firebase";
import { useStation, useHistory } from "../hooks/useFirebase";
import { useAuth } from "../hooks/useAuth";
import { getInfo, fmtTime, isDeviceOnline, detectarInicioSesion } from "../utils/helpers";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";
import ScreenTienda from "./ScreenTienda";

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

// ── Pantalla Ajustes ──────────────────────────────────────────
export default function ScreenAjustes({ onGoAdmin }) {
  const { user, perfil, isAdmin, login, logout } = useAuth();

  // Estaciones vinculadas al usuario
  const estacionIds      = perfil?.estaciones ? Object.keys(perfil.estaciones) : [];
  const tieneDispositivo = estacionIds.length > 0;
  const primeraId        = estacionIds[0] || null;

  const { data: stationData } = useStation(primeraId);
  const { hist }              = useHistory(primeraId);
  const online                = isDeviceOnline(stationData);
  const inicioSesion   = detectarInicioSesion(hist);
  // Solo mostrar calidad cuando hay datos reales y el sensor está online
  const hasData          = online && (stationData?.pm25 ?? -1) > 0;
  const info             = hasData ? getInfo(stationData.pm25) : null;
  // Nombre amigable — prioridad: nombre del firmware, luego ID sin subrayados
  const stationLabel     = stationData?.nombre
    || (primeraId ? primeraId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Mi estación");

  // Tick cada 30s para recalcular isDeviceOnline sin esperar evento Firebase
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const [notifAlertas,   setNotifAlertas]   = useState(false);
  const [mostrarTienda,  setMostrarTienda]  = useState(false);
  const alertaActivaRef = useRef(false);

  // Login form state
  const [loginEmail,    setLoginEmail]    = useState("");
  const [loginPass,     setLoginPass]     = useState("");
  const [loginVerPass,  setLoginVerPass]  = useState(false);
  const [loginLoading,  setLoginLoading]  = useState(false);
  const [loginError,    setLoginError]    = useState("");

  // Carga persistencia de notifAlertas al montar
  useEffect(() => {
    AsyncStorage.getItem('notifAlertas').then(val => {
      if (val !== null) setNotifAlertas(val === 'true');
    });
  }, []);

  // Vigila cambios en la alarma de la estación del usuario
  useEffect(() => {
    if (!notifAlertas || !stationData) return;
    if (stationData?.alarma && !alertaActivaRef.current) {
      alertaActivaRef.current = true;
      const ni = getInfo(stationData?.pm25 || 0);
      Alert.alert(
        "Alerta de Calidad del Aire",
        `Nivel ${ni.label}\nPM2.5: ${(stationData?.pm25||0).toFixed(1)} µg/m³\n\nEvita actividad al aire libre.`,
        [{ text: "Entendido", style: "default" }]
      );
    }
    if (!stationData?.alarma) alertaActivaRef.current = false;
  }, [stationData?.alarma, notifAlertas]);

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

  async function handleLogin() {
    if (!loginEmail.trim() || !loginPass) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      await login(loginEmail.trim(), loginPass);
      setLoginEmail(""); setLoginPass("");
    } catch (e) {
      const msg = e.code === "auth/invalid-credential" || e.code === "auth/wrong-password"
        ? "Correo o contraseña incorrectos"
        : e.code === "auth/user-not-found" ? "Usuario no encontrado"
        : e.code === "auth/invalid-email"  ? "Correo inválido"
        : "Error al iniciar sesión";
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  }

  async function resetearDemo() {
    async function ejecutarReset() {
      try {
        await Promise.all([
          remove(dbRef(db, "estaciones/estacion_01")),
          remove(dbRef(db, "historial/estacion_01")),
          remove(dbRef(db, "alertas")),
        ]);
        await update(dbRef(db, `usuarios/${user.uid}`), {
          onboardingCompleto: false,
          estaciones:         null,
        });
      } catch (e) {
        if (Platform.OS === "web") {
          window.alert(`No se pudo reiniciar: ${e.message}`);
        } else {
          Alert.alert("Error", `No se pudo reiniciar: ${e.message}`);
        }
      }
    }

    if (Platform.OS === "web") {
      if (window.confirm("¿Reiniciar demo? Se borrarán mediciones, historial y alertas, y se desvinculará el dispositivo.")) {
        await ejecutarReset();
      }
      return;
    }

    Alert.alert(
      "Reiniciar demo",
      "Se borrarán las mediciones, historial y alertas actuales, y se desvinculará el dispositivo de tu cuenta. ¿Continuar?",
      [
        { text: "Cancelar" },
        { text: "Reiniciar", style: "destructive", onPress: ejecutarReset },
      ]
    );
  }

  async function vincularDispositivo() {
    try {
      await update(dbRef(db, `usuarios/${user.uid}`), { onboardingCompleto: false });
    } catch (e) {
      Alert.alert("Error", "No se pudo iniciar el asistente. Intenta de nuevo.");
    }
  }

  function handleLogout() {
    if (Platform.OS === "web") { logout(); return; }
    Alert.alert("Cerrar sesión", `¿Salir como ${perfil?.nombre}?`, [
      { text: "Cancelar" },
      { text: "Salir", style: "destructive", onPress: () => logout() },
    ]);
  }

  function probarAlerta() {
    const nivel = info?.label || "Sin datos";
    const pm25Str = hasData ? `${stationData.pm25.toFixed(1)} µg/m³` : "Sin lectura";
    Alert.alert(
      "Prueba de Alerta",
      `Las alertas están funcionando correctamente.\n\nEstación: ${stationLabel}\nPM2.5 actual: ${pm25Str}\nNivel: ${nivel}`,
      [{ text: "Cerrar", style: "default" }]
    );
  }

  return (
    <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>

      {/* ── CUENTA ──────────────────────────────────── */}
      <Card style={ss.card}>
        <Text style={ss.sectionTitle}>Cuenta</Text>
        <View style={ss.div} />

        {user ? (
          <>
            <Row
              icon="person-circle-outline"
              label={perfil?.nombre || user.email}
              sub={user.email}
              right={
                <View style={[ss.rolBadge, isAdmin && { backgroundColor: C.green + "22" }]}>
                  <Text style={[ss.rolTxt, { color: isAdmin ? C.green : C.text3 }]}>
                    {isAdmin ? "Admin" : "Usuario"}
                  </Text>
                </View>
              }
            />
            <View style={ss.div} />
            <TouchableOpacity onPress={handleLogout} style={ss.logoutBtn}>
              <Ionicons name="log-out-outline" size={16} color={C.red} />
              <Text style={ss.logoutTxt}>Cerrar sesión</Text>
            </TouchableOpacity>
            {isAdmin && (
              <>
                <View style={ss.div} />
                <TouchableOpacity onPress={onGoAdmin} style={ss.logoutBtn}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={C.green} />
                  <Text style={[ss.logoutTxt, { color: C.green }]}>Panel Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={resetearDemo} style={ss.logoutBtn}>
                  <Ionicons name="refresh-outline" size={16} color={C.orange} />
                  <Text style={[ss.logoutTxt, { color: C.orange }]}>Reiniciar demo</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <>
            <Text style={ss.inputLabel}>Correo</Text>
            <TextInput
              style={ss.input}
              value={loginEmail}
              onChangeText={setLoginEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={C.text3}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={ss.inputLabel}>Contraseña</Text>
            <View style={ss.inputRow}>
              <TextInput
                style={[ss.input, { flex: 1 }]}
                value={loginPass}
                onChangeText={setLoginPass}
                placeholder="••••••••"
                placeholderTextColor={C.text3}
                secureTextEntry={!loginVerPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setLoginVerPass(v => !v)} style={ss.eyeBtn}>
                <Ionicons name={loginVerPass ? "eye-off-outline" : "eye-outline"} size={18} color={C.text3} />
              </TouchableOpacity>
            </View>
            {loginError ? <Text style={ss.loginError}>{loginError}</Text> : null}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loginLoading}
              style={[ss.loginBtn, { backgroundColor: C.green }]}
            >
              {loginLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={ss.loginBtnTxt}>Iniciar sesión</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </Card>

      {/* ── MI DISPOSITIVO ──────────────────────────── */}
      <Card style={ss.card}>
        <Text style={ss.sectionTitle}>Mi dispositivo</Text>
        <View style={ss.div} />

        {tieneDispositivo ? (
          <>
            <Row
              icon="hardware-chip"
              label={stationLabel}
              sub={online ? "En línea · datos en tiempo real" : "Sin conexión reciente"}
              right={
                <View style={[ss.estadoBadge, !online && { backgroundColor: C.border + "80" }]}>
                  <View style={[ss.estadoDot, !online && { backgroundColor: C.text3 }]} />
                  <Text style={[ss.estadoTxt, !online && { color: C.text3 }]}>
                    {online ? "En línea" : "Offline"}
                  </Text>
                </View>
              }
            />
            {hasData && info && (
              <>
                <View style={ss.div} />
                <Row
                  icon="partly-sunny-outline"
                  label="Calidad del aire"
                  sub={`PM2.5: ${stationData.pm25.toFixed(1)} µg/m³`}
                  right={
                    <View style={[ss.nivelBadge, { backgroundColor: info.color+"22", borderColor: info.color+"44" }]}>
                      <Text style={[ss.nivelTxt, { color: info.color }]}>{info.label}</Text>
                    </View>
                  }
                />
              </>
            )}
            {!online && (
              <>
                <View style={ss.div} />
                <Row
                  icon="cloud-offline-outline"
                  label="Dispositivo sin conexión"
                  sub="El sensor no está enviando datos actualmente"
                />
              </>
            )}
          </>
        ) : (
          // Modo explorador — sin dispositivo vinculado
          <View style={ss.sinDispWrap}>
            <MaterialCommunityIcons name="map-search-outline" size={38} color={C.text3} />
            <Text style={ss.sinDispTitulo}>Modo explorador</Text>
            <Text style={ss.sinDispSub}>
              Estás explorando datos de la red pública. Vincula tu EcoG Station para ver tus propias lecturas.
            </Text>
            <TouchableOpacity
              style={ss.vincularBtn}
              onPress={vincularDispositivo}
              activeOpacity={0.8}
            >
              <Ionicons name="link-outline" size={15} color={C.green} />
              <Text style={ss.vincularBtnTxt}>Vincular dispositivo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={ss.tiendaLink}
              onPress={() => setMostrarTienda(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="storefront-outline" size={13} color={C.text3} />
              <Text style={ss.tiendaLinkTxt}>¿No tienes uno? Ir a la tienda</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* ── ESTADO DE TU ESTACIÓN ───────────────────── */}
      {tieneDispositivo && (
        <Card style={ss.card}>
          <Text style={ss.sectionTitle}>Tu estación</Text>
          <View style={ss.div} />
          {inicioSesion && (
            <>
              <Row
                icon="power-outline"
                label="Encendido"
                sub="Inicio de sesión actual"
                right={<Text style={ss.verde}>{fmtTime(inicioSesion)}</Text>}
              />
              <View style={ss.div} />
            </>
          )}
          <Row
            icon={online ? "time-outline" : "moon-outline"}
            label={online ? "Última lectura" : "Apagado"}
            sub={online ? "Recibiendo datos en tiempo real" : "Último dato registrado"}
            right={
              <Text style={[ss.gris, !online && { color: C.text3 }]}>
                {fmtTime(stationData?.timestamp)}
              </Text>
            }
          />
          <View style={ss.div} />
          <Row
            icon="cellular"
            label="Frecuencia de envío"
            sub="El sensor manda datos cada 30 seg"
            right={<Text style={ss.verde}>30 seg</Text>}
          />
          {stationData?.gps_valido && (
            <>
              <View style={ss.div} />
              <Row
                icon="location-outline"
                label="Ubicación GPS"
                sub={`${(stationData.lat||0).toFixed(4)}, ${(stationData.lng||0).toFixed(4)}`}
                right={
                  <View style={ss.estadoBadge}>
                    <View style={ss.estadoDot} />
                    <Text style={ss.estadoTxt}>Activo</Text>
                  </View>
                }
              />
            </>
          )}
        </Card>
      )}

      {/* ── PREFERENCIAS ────────────────────────────── */}
      <Card style={ss.card}>
        <Text style={ss.sectionTitle}>Preferencias</Text>
        <View style={ss.div} />

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

        {tieneDispositivo && (
          <>
            <View style={ss.div} />
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
          </>
        )}
      </Card>

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

      <View style={{ height: 24 }} />

      {/* Modal Tienda */}
      <Modal
        visible={mostrarTienda}
        animationType="slide"
        onRequestClose={() => setMostrarTienda(false)}
      >
        <ScreenTienda onBack={() => setMostrarTienda(false)} />
      </Modal>
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
  nivelBadge:      { paddingHorizontal:10, paddingVertical:4, borderRadius:10,
                     borderWidth:1 },
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
  // Cuenta
  rolBadge:    { paddingHorizontal:10, paddingVertical:4, borderRadius:10, backgroundColor:C.bg2 },
  rolTxt:      { fontFamily:"Outfit_600SemiBold", fontSize:11 },
  logoutBtn:   { flexDirection:"row", alignItems:"center", gap:8, paddingVertical:10 },
  logoutTxt:   { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.red },
  loginError:  { fontFamily:"Outfit_400Regular", fontSize:12, color:C.red, marginBottom:4 },
  loginBtn:    { paddingVertical:12, borderRadius:12, alignItems:"center", marginTop:4 },
  loginBtnTxt: { fontFamily:"Outfit_700Bold", fontSize:14, color:"#fff" },
  // Mi dispositivo — sin dispositivo
  sinDispWrap:   { alignItems:"center", paddingVertical:16, paddingTop:8 },
  sinDispTitulo: { fontFamily:"Outfit_700Bold", fontSize:14, color:C.text, marginTop:12, marginBottom:6 },
  sinDispSub:    { fontFamily:"Outfit_400Regular", fontSize:12, color:C.text3,
                   textAlign:"center", lineHeight:18, marginBottom:18 },
  vincularBtn:   { flexDirection:"row", alignItems:"center", gap:8,
                   backgroundColor:C.green+"14", borderRadius:12,
                   paddingHorizontal:20, paddingVertical:12, marginBottom:10,
                   borderWidth:1.5, borderColor:C.green+"30" },
  vincularBtnTxt:{ fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.green },
  tiendaLink:    { flexDirection:"row", alignItems:"center", gap:6 },
  tiendaLinkTxt: { fontFamily:"Outfit_400Regular", fontSize:12, color:C.text3 },
  // Input (login form)
  inputLabel:   { fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.text2, marginBottom:6 },
  input:        { backgroundColor:C.bg2, borderRadius:10, paddingHorizontal:14, paddingVertical:10,
                  fontFamily:"Outfit_400Regular", fontSize:14, color:C.text, marginBottom:14 },
  inputRow:     { flexDirection:"row", alignItems:"center", gap:8, marginBottom:14 },
  eyeBtn:       { padding:8, backgroundColor:C.bg2, borderRadius:10 },
});
