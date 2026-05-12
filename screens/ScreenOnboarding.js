// ============================================================
//   ScreenOnboarding.js — Wizard de primer uso
//   Flujo: bienvenida → dispositivo → QR → nombre → WiFi → listo
// ============================================================
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Image, ScrollView, Platform, Alert,
  Animated, Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ref, update, get } from "firebase/database";
import { db } from "../constants/firebase";
import { C } from "../constants/colors";
import ScreenTienda from "./ScreenTienda";

const W = Dimensions.get("window").width;

// QR scan solo en nativo; en web se pide código manual
let CameraView = null;
let useCameraPermissions = () => [null, () => {}];
if (Platform.OS !== "web") {
  const cam = require("expo-camera");
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
}

// ── Selector de estaciones (web) ─────────────────────────────
function StationPicker({ onSelect }) {
  const [estaciones, setEstaciones] = React.useState(null);

  React.useEffect(() => {
    get(ref(db, "estaciones")).then(snap => {
      if (!snap.exists()) { setEstaciones([]); return; }
      const lista = Object.entries(snap.val()).map(([id, val]) => ({
        id,
        nombre: val.nombre || id,
      }));
      setEstaciones(lista);
    }).catch(() => setEstaciones([]));
  }, []);

  if (estaciones === null) {
    return (
      <View style={ss.pickerLoading}>
        <ActivityIndicator color={C.green} />
        <Text style={ss.pickerLoadingTxt}>Buscando dispositivos...</Text>
      </View>
    );
  }

  if (estaciones.length === 0) {
    return (
      <ScrollView contentContainerStyle={ss.scrollContent}>
        <MaterialCommunityIcons name="devices" size={48} color={C.text3} style={ss.stepIcon} />
        <Text style={ss.stepTitulo}>Sin dispositivos disponibles</Text>
        <Text style={ss.stepSub}>No encontramos estaciones registradas. Verifica que el dispositivo esté encendido y conectado.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={ss.scrollContent}>
      <MaterialCommunityIcons name="access-point" size={48} color={C.green} style={ss.stepIcon} />
      <Text style={ss.stepTitulo}>Selecciona tu dispositivo</Text>
      <Text style={ss.stepSub}>
        {estaciones.length === 1
          ? "Encontramos 1 dispositivo disponible. Tócalo para vincularlo a tu cuenta."
          : `Encontramos ${estaciones.length} dispositivos. Toca el tuyo para vincularlo.`}
      </Text>
      <View style={ss.deviceHint}>
        <Ionicons name="information-circle-outline" size={14} color={C.text3} />
        <Text style={ss.deviceHintTxt}>
          Asegúrate de que el dispositivo esté encendido y conectado a WiFi antes de continuar. Si la lista está vacía, espera ~30 seg y regresa.
        </Text>
      </View>
      {estaciones.map(e => (
        <TouchableOpacity
          key={e.id}
          style={ss.stationCard}
          onPress={() => onSelect(e.id)}
          activeOpacity={0.8}
        >
          <View style={ss.stationCardIco}>
            <MaterialCommunityIcons name="air-purifier" size={22} color={C.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ss.stationCardNombre}>{e.nombre}</Text>
            <Text style={ss.stationCardId}>{e.id}</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={C.green} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Barra de progreso ─────────────────────────────────────────
function Progreso({ paso, total }) {
  return (
    <View style={ss.progresoWrap}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[ss.progresoDot, i <= paso && { backgroundColor: C.green }]}
        />
      ))}
    </View>
  );
}

// ── Scanner QR ───────────────────────────────────────────────
function QRScanner({ onScanned }) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);

  if (Platform.OS === "web") return null;

  if (!permission) {
    return <View style={ss.cameraPlaceholder}><ActivityIndicator color={C.green} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={ss.cameraPlaceholder}>
        <MaterialCommunityIcons name="camera-off" size={40} color={C.text3} />
        <Text style={ss.cameraHint}>Necesitamos acceso a la cámara para escanear el QR</Text>
        <TouchableOpacity onPress={requestPermission} style={ss.cameraBtn}>
          <Text style={ss.cameraBtnTxt}>Permitir cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={ss.cameraWrap}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={(r) => {
          if (scanned.current) return;
          scanned.current = true;
          onScanned(r.data);
        }}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />
      <View style={ss.cameraOverlay}>
        <View style={ss.cameraFrame} />
      </View>
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────────
export default function ScreenOnboarding({ uid, nombre }) {
  const [paso,           setPaso]          = useState(0);
  const [mostrarTienda,  setMostrarTienda] = useState(false);
  const [sinDispositivo, setSinDispositivo] = useState(false);
  const [stationId,      setStationId]     = useState("");
  const [codigoManual,   setCodigoManual]  = useState(false);
  const [codigoInput,    setCodigoInput]   = useState("");
  const [stationName,    setStationName]   = useState("");
  const [ssid,           setSsid]          = useState("");
  const [wifiPass,       setWifiPass]      = useState("");
  const [verPass,        setVerPass]       = useState(false);
  const [saving,         setSaving]        = useState(false);

  // Transición entre pasos
  const slideX        = useRef(new Animated.Value(0)).current;
  const slideOpacity  = useRef(new Animated.Value(1)).current;

  // Animación dots flotantes (paso 0)
  const dot1Y = useRef(new Animated.Value(0)).current;
  const dot2Y = useRef(new Animated.Value(0)).current;
  const dot3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeFloat = (anim, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -8, duration: 1600, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0,  duration: 1600, useNativeDriver: true }),
        ])
      ).start();
    };
    makeFloat(dot1Y, 0);
    makeFloat(dot2Y, 600);
    makeFloat(dot3Y, 1200);
  }, []);

  const nombreDisplay = nombre?.split(" ")[0] || "bienvenido";

  // Navega al siguiente paso con animación slide+fade
  function navigateTo(nextPaso, dir = 1) {
    Animated.parallel([
      Animated.timing(slideX,       { toValue: -dir * 22, duration: 140, useNativeDriver: true }),
      Animated.timing(slideOpacity, { toValue: 0,          duration: 120, useNativeDriver: true }),
    ]).start(() => {
      slideX.setValue(dir * 22);
      setPaso(nextPaso);
      Animated.parallel([
        Animated.spring(slideX,      { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }),
        Animated.timing(slideOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }

  if (mostrarTienda) {
    return <ScreenTienda onBack={() => setMostrarTienda(false)} />;
  }

  async function finalizar(conDispositivo) {
    setSaving(true);
    try {
      const updates = {};
      updates[`usuarios/${uid}/onboardingCompleto`] = true;
      if (conDispositivo && stationId) {
        updates[`usuarios/${uid}/estaciones/${stationId}`] = true;
        if (stationName.trim()) {
          updates[`estaciones/${stationId}/nombre`] = stationName.trim();
        }
        if (ssid.trim()) {
          const redId = "red_" + Date.now();
          updates[`configuracion/redes/${redId}`] = {
            ssid:     ssid.trim(),
            password: wifiPass,
          };
        }
      }
      await update(ref(db), updates);
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar la configuración. Revisa tu conexión.");
      setSaving(false);
    }
  }

  // ── Renderizadores por paso ────────────────────────────────

  function renderWelcome() {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView
          contentContainerStyle={ss.welcomeScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero art */}
          <View style={ss.heroArt}>
            <View style={[ss.arc, ss.arc1]} />
            <View style={[ss.arc, ss.arc2]} />
            <View style={[ss.arc, ss.arc3]} />
            <Animated.View style={[ss.floatDot, ss.dot1, { transform: [{ translateY: dot1Y }] }]} />
            <Animated.View style={[ss.floatDot, ss.dot2, { transform: [{ translateY: dot2Y }] }]} />
            <Animated.View style={[ss.floatDot, ss.dot3, { transform: [{ translateY: dot3Y }] }]} />
            <Image
              source={require("../assets/ecoguardian-mark.png")}
              style={ss.heroLogo}
            />
          </View>

          <Text style={ss.greeting}>HOLA, {nombreDisplay.toUpperCase()}</Text>

          <Text style={ss.welcomeH2}>
            Vamos a configurar tu{" "}
            <Text style={ss.welcomeH2Bold}>estación de monitoreo</Text>
          </Text>

          <Text style={ss.welcomeLead}>
            Conectaremos tu sensor EcoGuardian a la red de tu casa para empezar a recibir lecturas de calidad del aire en tiempo real.
          </Text>

          <View style={ss.timePill}>
            <Ionicons name="time-outline" size={12} color={C.green} />
            <Text style={ss.timePillTxt}>3 MIN · 4 PASOS</Text>
          </View>
        </ScrollView>

        <View style={ss.welcomeFoot}>
          <TouchableOpacity
            style={ss.btnHero}
            onPress={() => navigateTo(1)}
            activeOpacity={0.85}
          >
            <Text style={ss.btnHeroTxt}>Comenzar configuración</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderHasDevice() {
    return (
      <View style={ss.root}>
        <Progreso paso={0} total={4} />
        <ScrollView contentContainerStyle={ss.scrollContent}>
          <MaterialCommunityIcons name="air-purifier" size={56} color={C.green} style={ss.stepIcon} />
          <Text style={ss.stepTitulo}>¿Ya tienes tu EcoG?</Text>
          <Text style={ss.stepSub}>
            Tu kit incluye el sensor de calidad del aire con GPS y conectividad WiFi.
          </Text>

          <TouchableOpacity
            style={[ss.opcionBtn, { borderColor: C.green }]}
            onPress={() => navigateTo(2)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={24} color={C.green} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[ss.opcionTitulo, { color: C.green }]}>Sí, ya lo tengo</Text>
              <Text style={ss.opcionSub}>Vincular ahora</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={C.green} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[ss.opcionBtn, { borderColor: C.border, marginTop: 12 }]}
            onPress={() => setMostrarTienda(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="storefront-outline" size={24} color={C.greenD} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[ss.opcionTitulo, { color: C.greenD }]}>Aún no, voy a comprarlo</Text>
              <Text style={ss.opcionSub}>Ir a la tienda</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={C.greenD} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[ss.opcionBtn, { borderColor: C.border, marginTop: 12 }]}
            onPress={() => { setSinDispositivo(true); navigateTo(5); }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="map-search-outline" size={24} color={C.text3} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={ss.opcionTitulo}>Solo quiero explorar</Text>
              <Text style={ss.opcionSub}>Ver la red de la ciudad</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={C.text3} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  function renderScanQR() {
    function confirmarCodigo(id) {
      const limpio = id.trim();
      if (!limpio) return;
      setStationId(limpio);
      navigateTo(3);
    }

    return (
      <View style={ss.root}>
        <Progreso paso={1} total={4} />
        <View style={ss.headerRow}>
          <TouchableOpacity onPress={() => navigateTo(1, -1)} style={ss.backBtn}>
            <Ionicons name="arrow-back" size={20} color={C.text2} />
          </TouchableOpacity>
          <Text style={ss.headerTitulo}>Escanear dispositivo</Text>
        </View>

        {Platform.OS !== "web" && !codigoManual ? (
          <>
            <Text style={ss.qrHint}>Apunta la cámara al QR del dispositivo</Text>
            <QRScanner onScanned={(data) => confirmarCodigo(data)} />
            <TouchableOpacity onPress={() => setCodigoManual(true)} style={ss.linkBtn}>
              <Text style={ss.linkBtnTxt}>Ingresar código manualmente</Text>
            </TouchableOpacity>
          </>
        ) : Platform.OS === "web" ? (
          <StationPicker onSelect={confirmarCodigo} />
        ) : (
          <ScrollView contentContainerStyle={ss.scrollContent}>
            <MaterialCommunityIcons name="qrcode-scan" size={48} color={C.green} style={ss.stepIcon} />
            <Text style={ss.stepTitulo}>Ingresa el código del dispositivo</Text>
            <Text style={ss.stepSub}>
              Encuéntralo en la parte inferior del dispositivo o en la caja.
            </Text>
            <TextInput
              style={ss.input}
              value={codigoInput}
              onChangeText={setCodigoInput}
              placeholder="Código del dispositivo"
              placeholderTextColor={C.text3}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[ss.btnPrim, { opacity: codigoInput.trim() ? 1 : 0.5 }]}
              onPress={() => confirmarCodigo(codigoInput)}
              disabled={!codigoInput.trim()}
              activeOpacity={0.8}
            >
              <Text style={ss.btnPrimTxt}>Continuar</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCodigoManual(false)} style={ss.linkBtn}>
              <Text style={ss.linkBtnTxt}>Volver a la cámara</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    );
  }

  function renderStationName() {
    return (
      <View style={ss.root}>
        <Progreso paso={2} total={4} />
        <View style={ss.headerRow}>
          <TouchableOpacity onPress={() => navigateTo(2, -1)} style={ss.backBtn}>
            <Ionicons name="arrow-back" size={20} color={C.text2} />
          </TouchableOpacity>
          <Text style={ss.headerTitulo}>Nombre de tu estación</Text>
        </View>
        <ScrollView contentContainerStyle={ss.scrollContent}>
          <MaterialCommunityIcons name="map-marker" size={48} color={C.green} style={ss.stepIcon} />
          <Text style={ss.stepTitulo}>¿Cómo se llama tu estación?</Text>
          <Text style={ss.stepSub}>
            Usa un nombre que identifique el lugar donde estará el sensor.
          </Text>
          <TextInput
            style={ss.input}
            value={stationName}
            onChangeText={setStationName}
            placeholder="Ej: Mi Casa, Oficina, Escuela..."
            placeholderTextColor={C.text3}
            autoCapitalize="words"
            maxLength={40}
          />
          <Text style={ss.charCount}>{stationName.length}/40</Text>
          <TouchableOpacity
            style={[ss.btnPrim, { opacity: stationName.trim() ? 1 : 0.5 }]}
            onPress={() => navigateTo(4)}
            disabled={!stationName.trim()}
            activeOpacity={0.8}
          >
            <Text style={ss.btnPrimTxt}>Continuar</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  function renderWifi() {
    return (
      <View style={ss.root}>
        <Progreso paso={3} total={4} />
        <View style={ss.headerRow}>
          <TouchableOpacity onPress={() => navigateTo(3, -1)} style={ss.backBtn}>
            <Ionicons name="arrow-back" size={20} color={C.text2} />
          </TouchableOpacity>
          <Text style={ss.headerTitulo}>Red WiFi del sensor</Text>
        </View>
        <ScrollView contentContainerStyle={ss.scrollContent}>
          <MaterialCommunityIcons name="wifi" size={48} color={C.green} style={ss.stepIcon} />
          <Text style={ss.stepTitulo}>Conéctalo a tu WiFi</Text>
          <Text style={ss.stepSub}>
            El sensor usará esta red para enviar datos a la app. Debe ser la misma red donde estará instalado.
          </Text>

          <Text style={ss.inputLabel}>Nombre de la red (SSID)</Text>
          <TextInput
            style={ss.input}
            value={ssid}
            onChangeText={setSsid}
            placeholder="Mi Red WiFi"
            placeholderTextColor={C.text3}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={ss.inputLabel}>Contraseña</Text>
          <View style={ss.inputRow}>
            <TextInput
              style={[ss.input, { flex: 1, marginBottom: 0 }]}
              value={wifiPass}
              onChangeText={setWifiPass}
              placeholder="Contraseña (vacío si red abierta)"
              placeholderTextColor={C.text3}
              secureTextEntry={!verPass}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setVerPass(v => !v)} style={ss.eyeBtn}>
              <Ionicons
                name={verPass ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={C.text3}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[ss.btnPrim, { opacity: ssid.trim() && !saving ? 1 : 0.5 }]}
            onPress={() => finalizar(true)}
            disabled={!ssid.trim() || saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Text style={ss.btnPrimTxt}>Finalizar configuración</Text>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => finalizar(true)} style={ss.linkBtn} disabled={saving}>
            <Text style={ss.linkBtnTxt}>Omitir por ahora</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  function renderSuccess() {
    if (!sinDispositivo) return null;
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={ss.welcomeScroll} showsVerticalScrollIndicator={false}>

          {/* Hero — mismo lenguaje que paso 0, altura fija en lugar de aspecto 1:1 */}
          <View style={ss.successHero}>
            <View style={[ss.arc, ss.arc1]} />
            <View style={[ss.arc, ss.arc3]} />
            <View style={ss.successIconCircle}>
              <Ionicons name="checkmark" size={44} color="#fff" />
            </View>
          </View>

          <Text style={ss.greeting}>MODO EXPLORADOR</Text>

          <Text style={ss.welcomeH2}>
            Todo listo,{" "}
            <Text style={ss.welcomeH2Bold}>{nombreDisplay}</Text>
          </Text>

          <Text style={ss.welcomeLead}>
            Tienes acceso a los datos de la red pública de monitoreo. Puedes ver el mapa y reportar incidentes.
          </Text>

          {/* Items */}
          {[
            { icon: "map",        label: "Mapa en tiempo real",          sub: "Estaciones activas de la red pública" },
            { icon: "stats-chart", label: "Historial de calidad del aire", sub: "Últimas 30 lecturas disponibles"       },
            { icon: "people",     label: "Comunidad",                    sub: "Reporta incidentes en tu ciudad"        },
          ].map((item, i) => (
            <View key={i} style={ss.successItem}>
              <View style={ss.successItemIco}>
                <Ionicons name={item.icon} size={16} color={C.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ss.successItemLbl}>{item.label}</Text>
                <Text style={ss.successItemSub}>{item.sub}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={C.green} />
            </View>
          ))}

          <View style={ss.successNote}>
            <Ionicons name="information-circle-outline" size={14} color={C.text3} />
            <Text style={ss.successNoteTxt}>
              Cuando tengas tu dispositivo, vincúlalo desde Ajustes.
            </Text>
          </View>

        </ScrollView>

        <View style={ss.welcomeFoot}>
          <TouchableOpacity
            style={[ss.btnHero, { opacity: saving ? 0.6 : 1 }]}
            onPress={() => finalizar(false)}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={ss.btnHeroTxt}>Entrar a EcoGuardian</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderPaso() {
    switch (paso) {
      case 0: return renderWelcome();
      case 1: return renderHasDevice();
      case 2: return renderScanQR();
      case 3: return renderStationName();
      case 4: return renderWifi();
      case 5: return renderSuccess();
      default: return null;
    }
  }

  return (
    <View style={ss.root}>
      <Animated.View
        style={[
          { flex: 1 },
          { opacity: slideOpacity, transform: [{ translateX: slideX }] },
        ]}
      >
        {renderPaso()}
      </Animated.View>
    </View>
  );
}

const ss = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  centrado:     { flex: 1, alignItems: "center", justifyContent: "center",
                  paddingHorizontal: 32 },
  scrollContent:{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 },
  progresoWrap: { flexDirection: "row", justifyContent: "center", gap: 6,
                  paddingTop: 56, paddingBottom: 8 },
  progresoDot:  { width: 28, height: 4, borderRadius: 2, backgroundColor: C.border },
  headerRow:    { flexDirection: "row", alignItems: "center", gap: 12,
                  paddingHorizontal: 20, paddingVertical: 16 },
  backBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg2,
                  alignItems: "center", justifyContent: "center" },
  headerTitulo: { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.text },
  logoBox:      { width: 88, height: 88, borderRadius: 26, backgroundColor: C.greenD,
                  alignItems: "center", justifyContent: "center", marginBottom: 24,
                  shadowColor: C.greenD, shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 },
  bienvenidaTitulo: { fontFamily: "Outfit_700Bold", fontSize: 28, color: C.text,
                      textAlign: "center", marginBottom: 12 },
  bienvenidaSub:    { fontFamily: "Outfit_400Regular", fontSize: 14, color: C.text3,
                      textAlign: "center", lineHeight: 22, marginBottom: 40 },
  stepIcon:     { alignSelf: "center", marginBottom: 20, marginTop: 8 },
  stepTitulo:   { fontFamily: "Outfit_700Bold", fontSize: 20, color: C.text,
                  marginBottom: 10 },
  stepSub:      { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.text3,
                  lineHeight: 20, marginBottom: 28 },
  opcionBtn:    { flexDirection: "row", alignItems: "center", backgroundColor: C.card,
                  borderRadius: 16, padding: 18, borderWidth: 1.5 },
  opcionTitulo: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.text },
  opcionSub:    { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.text3, marginTop: 2 },
  inputLabel:   { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.text2, marginBottom: 6 },
  input:        { backgroundColor: C.bg2, borderRadius: 12, paddingHorizontal: 14,
                  paddingVertical: 13, fontFamily: "Outfit_400Regular", fontSize: 14,
                  color: C.text, marginBottom: 16 },
  inputRow:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
  eyeBtn:       { padding: 13, backgroundColor: C.bg2, borderRadius: 12 },
  charCount:    { fontFamily: "JetBrainsMono_400Regular", fontSize: 11, color: C.text3,
                  textAlign: "right", marginTop: -12, marginBottom: 16 },
  btnPrim:      { flexDirection: "row", alignItems: "center", justifyContent: "center",
                  gap: 8, backgroundColor: C.green, paddingVertical: 15,
                  borderRadius: 14, marginTop: 4 },
  btnPrimTxt:   { fontFamily: "Outfit_700Bold", fontSize: 15, color: "#fff" },
  linkBtn:      { alignItems: "center", paddingVertical: 14 },
  linkBtnTxt:   { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.text3 },
  // Cámara
  qrHint:       { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.text3,
                  textAlign: "center", paddingHorizontal: 24, paddingVertical: 8 },
  cameraWrap:   { flex: 1, marginHorizontal: 16, borderRadius: 20, overflow: "hidden" },
  cameraOverlay:{ ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  cameraFrame:  { width: 220, height: 220, borderRadius: 16,
                  borderWidth: 2, borderColor: "#fff", backgroundColor: "transparent" },
  cameraPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center",
                       marginHorizontal: 16, backgroundColor: C.bg2, borderRadius: 20, gap: 16 },
  cameraHint:   { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.text3,
                  textAlign: "center", paddingHorizontal: 24 },
  cameraBtn:    { backgroundColor: C.green, paddingHorizontal: 24, paddingVertical: 12,
                  borderRadius: 12 },
  cameraBtnTxt: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#fff" },
  // StationPicker
  pickerLoading:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  pickerLoadingTxt: { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.text3 },
  deviceHint:       { flexDirection: "row", alignItems: "flex-start", gap: 8,
                      backgroundColor: C.bg2, borderRadius: 12,
                      padding: 12, marginBottom: 20 },
  deviceHintTxt:    { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.text3,
                      flex: 1, lineHeight: 18 },
  stationCard:      { flexDirection: "row", alignItems: "center",
                      backgroundColor: C.card, borderRadius: 16,
                      padding: 16, marginBottom: 12,
                      borderWidth: 1.5, borderColor: C.green,
                      shadowColor: C.greenD, shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  stationCardIco:   { width: 44, height: 44, borderRadius: 12,
                      backgroundColor: C.bg2, alignItems: "center",
                      justifyContent: "center", marginRight: 14 },
  stationCardNombre:{ fontFamily: "Outfit_600SemiBold", fontSize: 15, color: C.text },
  stationCardId:    { fontFamily: "JetBrainsMono_400Regular", fontSize: 10,
                      color: C.text3, marginTop: 2 },

  // ── Paso 0: Welcome ───────────────────────────────────────
  welcomeScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  heroArt: {
    aspectRatio: 1,
    backgroundColor: C.greenD,
    borderRadius: 24,
    marginBottom: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: C.greenD,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 12,
  },
  arc: {
    position: "absolute",
    borderRadius: 9999,
    borderColor: "rgba(255,255,255,0.08)",
  },
  arc1: { top: -60, right: -60, width: 180, height: 180, borderWidth: 14 },
  arc2: { top: -100, right: -100, width: 260, height: 260, borderWidth: 12 },
  arc3: { bottom: -80, left: -80, width: 220, height: 220, borderWidth: 10 },
  floatDot: {
    position: "absolute",
    width: 8, height: 8,
    backgroundColor: C.accent,
    borderRadius: 4,
  },
  dot1: { top: "22%", left: "18%" },
  dot2: { top: "60%", left: "74%" },
  dot3: { top: "80%", left: "30%" },
  heroLogo: {
    width: 88, height: 88,
    resizeMode: "contain",
    zIndex: 2,
  },
  greeting: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    color: C.green,
    letterSpacing: 3,
    marginBottom: 8,
  },
  welcomeH2: {
    fontFamily: "Outfit_400Regular",
    fontSize: 22,
    color: C.text,
    lineHeight: 30,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  welcomeH2Bold: {
    fontFamily: "Outfit_700Bold",
    color: C.green,
  },
  welcomeLead: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: C.text2,
    lineHeight: 21,
    marginBottom: 20,
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  timePillTxt: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    letterSpacing: 2,
    color: C.text2,
  },
  welcomeFoot: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    backgroundColor: C.bg,
  },
  btnHero: {
    backgroundColor: C.green,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#14241a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 1,
      },
      android: { elevation: 6 },
      web: { boxShadow: "0 4px 0 #14241a" },
    }),
  },
  btnHeroTxt: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: "#fff",
    letterSpacing: 0.3,
  },

  // ── Paso 5: Explorador (Todo listo) ───────────────────────
  successHero: {
    height: 190,
    backgroundColor: C.greenD,
    borderRadius: 24,
    marginBottom: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: C.greenD,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 12,
  },
  successIconCircle: {
    width: 92, height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  successItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  successItemIco: {
    width: 34, height: 34,
    borderRadius: 10,
    backgroundColor: C.green + "16",
    alignItems: "center",
    justifyContent: "center",
  },
  successItemLbl: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: C.text,
    marginBottom: 2,
  },
  successItemSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: C.text3,
    lineHeight: 15,
  },
  successNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  successNoteTxt: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: C.text3,
    flex: 1,
    lineHeight: 16,
  },
});
