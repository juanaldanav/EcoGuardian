// ============================================================
//   ScreenOnboarding.js — Wizard de primer uso
//   Flujo: bienvenida → dispositivo → QR → nombre → WiFi → listo
// ============================================================
import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Image, ScrollView, Platform, Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ref, update } from "firebase/database";
import { db } from "../constants/firebase";
import { C } from "../constants/colors";

// QR scan solo en nativo; en web se pide código manual
let CameraView = null;
let useCameraPermissions = () => [null, () => {}];
if (Platform.OS !== "web") {
  const cam = require("expo-camera");
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
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
  const [paso,          setPaso]          = useState(0);
  const [sinDispositivo, setSinDispositivo] = useState(false);
  const [stationId,     setStationId]     = useState("");
  const [codigoManual,  setCodigoManual]  = useState(false);
  const [codigoInput,   setCodigoInput]   = useState("");
  const [stationName,   setStationName]   = useState("");
  const [ssid,          setSsid]          = useState("");
  const [wifiPass,      setWifiPass]      = useState("");
  const [verPass,       setVerPass]       = useState(false);
  const [saving,        setSaving]        = useState(false);

  const nombreDisplay = nombre?.split(" ")[0] || "bienvenido";

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
      // App.js detecta onboardingCompleto:true automáticamente
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar la configuración. Revisa tu conexión.");
      setSaving(false);
    }
  }

  // ── PASO 0: Bienvenida ─────────────────────────────────────
  if (paso === 0) {
    return (
      <View style={ss.root}>
        <View style={ss.centrado}>
          <View style={ss.logoBox}>
            <Image
              source={require("../assets/ecoguardian-mark.png")}
              style={{ width: 52, height: 52, resizeMode: "contain" }}
            />
          </View>
          <Text style={ss.bienvenidaTitulo}>Hola, {nombreDisplay}</Text>
          <Text style={ss.bienvenidaSub}>
            Vamos a configurar tu estación de monitoreo. Solo toma un par de minutos.
          </Text>
          <TouchableOpacity style={ss.btnPrim} onPress={() => setPaso(1)} activeOpacity={0.8}>
            <Text style={ss.btnPrimTxt}>Comenzar</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── PASO 1: ¿Tienes dispositivo? ───────────────────────────
  if (paso === 1) {
    return (
      <View style={ss.root}>
        <Progreso paso={0} total={4} />
        <ScrollView contentContainerStyle={ss.scrollContent}>
          <MaterialCommunityIcons name="air-purifier" size={56} color={C.green} style={ss.stepIcon} />
          <Text style={ss.stepTitulo}>¿Ya tienes tu dispositivo EcoGuardian?</Text>
          <Text style={ss.stepSub}>
            Tu kit incluye el sensor de calidad del aire con GPS y conectividad WiFi.
          </Text>

          <TouchableOpacity
            style={[ss.opcionBtn, { borderColor: C.green }]}
            onPress={() => setPaso(2)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={24} color={C.green} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[ss.opcionTitulo, { color: C.green }]}>Sí, ya tengo mi kit</Text>
              <Text style={ss.opcionSub}>Escanearé el QR para enlazarlo</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={C.green} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[ss.opcionBtn, { borderColor: C.border, marginTop: 12 }]}
            onPress={() => { setSinDispositivo(true); setPaso(5); }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="clock-outline" size={24} color={C.text3} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={ss.opcionTitulo}>Aún no tengo uno</Text>
              <Text style={ss.opcionSub}>Exploraré la red y lo configuro después</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={C.text3} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── PASO 2: Escanear QR ────────────────────────────────────
  if (paso === 2) {
    function confirmarCodigo(id) {
      const limpio = id.trim();
      if (!limpio) return;
      setStationId(limpio);
      setPaso(3);
    }

    return (
      <View style={ss.root}>
        <Progreso paso={1} total={4} />
        <View style={ss.headerRow}>
          <TouchableOpacity onPress={() => setPaso(1)} style={ss.backBtn}>
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
              placeholder="estacion_01"
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
            {Platform.OS !== "web" && (
              <TouchableOpacity onPress={() => setCodigoManual(false)} style={ss.linkBtn}>
                <Text style={ss.linkBtnTxt}>Volver a la cámara</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  // ── PASO 3: Nombre de estación ─────────────────────────────
  if (paso === 3) {
    return (
      <View style={ss.root}>
        <Progreso paso={2} total={4} />
        <View style={ss.headerRow}>
          <TouchableOpacity onPress={() => setPaso(2)} style={ss.backBtn}>
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
            onPress={() => setPaso(4)}
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

  // ── PASO 4: WiFi ───────────────────────────────────────────
  if (paso === 4) {
    return (
      <View style={ss.root}>
        <Progreso paso={3} total={4} />
        <View style={ss.headerRow}>
          <TouchableOpacity onPress={() => setPaso(3)} style={ss.backBtn}>
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

  // ── PASO 5: Confirmación sin dispositivo ───────────────────
  if (paso === 5 && sinDispositivo) {
    return (
      <View style={ss.root}>
        <View style={ss.centrado}>
          <View style={[ss.logoBox, { backgroundColor: C.bg2 }]}>
            <MaterialCommunityIcons name="earth" size={44} color={C.green} />
          </View>
          <Text style={ss.bienvenidaTitulo}>Todo listo</Text>
          <Text style={[ss.bienvenidaSub, { marginBottom: 12 }]}>
            Puedes explorar datos de calidad del aire de la red pública y reportar incidentes en tu comunidad.
          </Text>
          <Text style={[ss.bienvenidaSub, { fontSize: 12, marginBottom: 40 }]}>
            Cuando tengas tu dispositivo, vincúlalo desde la sección Ajustes.
          </Text>
          <TouchableOpacity
            style={[ss.btnPrim, { opacity: saving ? 0.6 : 1 }]}
            onPress={() => finalizar(false)}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Text style={ss.btnPrimTxt}>Entrar a EcoGuardian</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
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
});
