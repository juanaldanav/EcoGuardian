import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ImageBackground,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Card from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import { useComunidad, TIPOS_REPORTE } from "../hooks/useComunidad";
import { C } from "../constants/colors";

const { height: SCREEN_H } = Dimensions.get("window");
const HERO_H = SCREEN_H - 120;

function tiempoRelativo(ts) {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return "ahora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

const ESTADO_COLORES = {
  pendiente:  C.text3,
  activo:     C.red,
  verificado: C.yellow,
  resuelto:   C.green,
};

const ESTADO_LABELS = {
  pendiente:  "Pendiente",
  activo:     "Activo",
  verificado: "Verificado",
  resuelto:   "Resuelto",
};

export default function ScreenComunidad() {
  const { user, perfil, isAdmin, login } = useAuth();
  const { reportes, loading, publicar, actualizarEstado } = useComunidad();

  const [modalLogin, setModalLogin]         = useState(false);
  const [modalReporte, setModalReporte]     = useState(false);
  const [loginEmail, setLoginEmail]         = useState("");
  const [loginPass, setLoginPass]           = useState("");
  const [loginVerPass, setLoginVerPass]     = useState(false);
  const [loginLoading, setLoginLoading]     = useState(false);
  const [loginError, setLoginError]         = useState("");
  const [tipoSeleccionado, setTipoSel]      = useState(null);
  const [descripcion, setDescripcion]       = useState("");
  const [imagenUri, setImagenUri]           = useState(null);
  const [publicando, setPublicando]         = useState(false);

  function handleReportar() {
    if (user) setModalReporte(true);
    else      setModalLogin(true);
  }

  function handlePresionarCard(reporte) {
    if (!isAdmin) return;
    Alert.alert("Actualizar estado", `Reporte: ${reporte.descripcion}`, [
      { text: "Marcar verificado", onPress: () => actualizarEstado(reporte.id, "verificado") },
      { text: "Marcar resuelto",   onPress: () => actualizarEstado(reporte.id, "resuelto")   },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  async function handleLogin() {
    if (!loginEmail.trim() || !loginPass) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      await login(loginEmail.trim(), loginPass);
      setModalLogin(false);
      setLoginEmail(""); setLoginPass("");
    } catch (e) {
      const map = {
        "auth/invalid-credential": "Correo o contraseña incorrectos",
        "auth/wrong-password":     "Correo o contraseña incorrectos",
        "auth/user-not-found":     "Usuario no encontrado",
        "auth/invalid-email":      "Correo inválido",
      };
      setLoginError(map[e.code] || "Error al iniciar sesión");
    } finally {
      setLoginLoading(false);
    }
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert("Imagen muy grande", "El máximo permitido es 5 MB.");
        return;
      }
      setImagenUri(asset.uri);
    }
  }

  async function handlePublicar() {
    if (!tipoSeleccionado) { Alert.alert("Selecciona un tipo de reporte"); return; }
    if (!descripcion.trim()) { Alert.alert("Escribe una descripción"); return; }
    setPublicando(true);
    try {
      await publicar({
        tipo:        tipoSeleccionado,
        descripcion: descripcion.trim(),
        autorId:     user.uid,
        autorNombre: perfil?.nombre || user.email,
        imagenUri:   imagenUri || null,
      });
      setModalReporte(false);
      setTipoSel(null); setDescripcion(""); setImagenUri(null);
    } catch (e) {
      Alert.alert("Error al publicar", e.message || "Intenta de nuevo");
    } finally {
      setPublicando(false);
    }
  }

  return (
    <View style={ss.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── HERO — imagen completa ──────────────────── */}
        <ImageBackground
          source={require("../assets/comunidad-background.webp")}
          style={ss.heroBg}
          resizeMode="cover"
        >
          <View style={ss.greenFilter} />
          <View style={ss.heroContent}>
            <View style={ss.heroBadge}>
              <View style={ss.heroBadgeDot} />
              <Text style={ss.heroBadgeTxt}>RED CIUDADANA</Text>
            </View>
            <Text style={ss.heroTitle}>Comunidad</Text>
            <Text style={ss.heroSub}>Reportes ambientales de la zona</Text>
            <TouchableOpacity style={ss.btnReportar} onPress={handleReportar} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={18} color={C.greenD} />
              <Text style={ss.btnReportarTxt}>Reportar incidente</Text>
            </TouchableOpacity>
            {user && (
              <Text style={ss.heroSesion}>Sesión: {perfil?.nombre || user.email}</Text>
            )}
          </View>
        </ImageBackground>

        {/* ── FEED ────────────────────────────────────── */}
        {loading ? (
          <ActivityIndicator color={C.green} size="large" style={{ marginTop: 40 }} />
        ) : reportes.length === 0 ? (
          <View style={ss.vacioCont}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={36} color={C.text3} />
            <Text style={ss.vacioTexto}>Sin reportes aún</Text>
            <Text style={ss.vacioSub}>Sé el primero en reportar un incidente ambiental</Text>
          </View>
        ) : (
          reportes.map((reporte) => {
            const tipo       = TIPOS_REPORTE.find((t) => t.key === reporte.tipo);
            const iconoColor = tipo?.color || C.text3;
            const estadoColor = ESTADO_COLORES[reporte.estado] || C.text3;
            const estadoLabel = ESTADO_LABELS[reporte.estado]  || reporte.estado;

            return (
              <TouchableOpacity
                key={reporte.id}
                activeOpacity={isAdmin ? 0.6 : 1}
                onPress={() => handlePresionarCard(reporte)}
              >
                <Card style={ss.reporteCard}>
                  <View style={ss.reporteRow}>
                    <MaterialCommunityIcons name={tipo?.icon || "alert-circle-outline"} size={22} color={iconoColor} />
                    <View style={{ flex: 1 }}>
                      <View style={ss.reporteHeader}>
                        <Text style={ss.reporteTipo}>{tipo?.label || reporte.tipo}</Text>
                        <Text style={[ss.badgeTxt, { color: estadoColor }]}>{estadoLabel}</Text>
                      </View>
                      <Text style={ss.reporteDesc} numberOfLines={3}>{reporte.descripcion}</Text>
                      <Text style={ss.reporteMeta}>
                        {reporte.autorNombre} · {tiempoRelativo(reporte.creadoEn)}
                      </Text>
                    </View>
                  </View>
                  {reporte.imageUrl ? (
                    <Image source={{ uri: reporte.imageUrl }} style={ss.reporteImg} />
                  ) : null}
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ── MODAL LOGIN ─────────────────────────────── */}
      <Modal visible={modalLogin} animationType="fade" transparent onRequestClose={() => setModalLogin(false)}>
        <View style={ss.modalOverlay}>
          <View style={ss.modalBox}>
            <Text style={ss.modalTitulo}>Continuar con tu cuenta</Text>
            <Text style={ss.modalSub}>Inicia sesión para publicar y participar</Text>
            <View style={{ height: 1, backgroundColor: C.border }} />

            <Text style={ss.inputLabel}>Correo</Text>
            <TextInput
              style={ss.input}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="correo@ejemplo.com"
              placeholderTextColor={C.text3}
              value={loginEmail}
              onChangeText={setLoginEmail}
            />

            <Text style={ss.inputLabel}>Contraseña</Text>
            <View style={ss.inputRow}>
              <TextInput
                style={[ss.input, { flex: 1 }]}
                secureTextEntry={!loginVerPass}
                placeholder="Contraseña"
                placeholderTextColor={C.text3}
                value={loginPass}
                onChangeText={setLoginPass}
              />
              <TouchableOpacity style={ss.eyeBtn} onPress={() => setLoginVerPass(v => !v)}>
                <Ionicons name={loginVerPass ? "eye-off-outline" : "eye-outline"} size={18} color={C.text3} />
              </TouchableOpacity>
            </View>

            {loginError ? <Text style={ss.errorTxt}>{loginError}</Text> : null}

            <TouchableOpacity style={ss.btnPrimario} onPress={handleLogin} disabled={loginLoading}>
              {loginLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={ss.btnPrimarioTxt}>Iniciar sesión</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={ss.btnSecundario} onPress={() => { setModalLogin(false); setLoginEmail(""); setLoginPass(""); setLoginError(""); }} disabled={loginLoading}>
              <Text style={ss.btnSecundarioTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL CREAR REPORTE ─────────────────────── */}
      <Modal
        visible={modalReporte}
        animationType="fade"
        transparent
        onRequestClose={() => { setModalReporte(false); setTipoSel(null); setDescripcion(""); setImagenUri(null); }}
      >
        <View style={ss.modalOverlay}>
          <View style={ss.modalBox}>
            <Text style={ss.modalTitulo}>Nuevo reporte</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
              {TIPOS_REPORTE.map((tipo) => {
                const sel = tipoSeleccionado === tipo.key;
                return (
                  <TouchableOpacity
                    key={tipo.key}
                    style={[ss.chip, sel && { backgroundColor: tipo.color + "22", borderColor: tipo.color + "66", borderWidth: 1 }]}
                    onPress={() => setTipoSel(tipo.key)}
                  >
                    <MaterialCommunityIcons name={tipo.icon} size={15} color={tipo.color} />
                    <Text style={[ss.chipTexto, { color: tipo.color }]}>{tipo.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              style={[ss.input, { minHeight: 72, textAlignVertical: "top" }]}
              placeholder="Describe qué está pasando..."
              placeholderTextColor={C.text3}
              multiline
              value={descripcion}
              onChangeText={setDescripcion}
            />

            <TouchableOpacity style={ss.btnFoto} onPress={pickImage}>
              <Ionicons name="camera-outline" size={18} color={C.green} />
              <Text style={ss.btnFotoTxt}>{imagenUri ? "Cambiar foto" : "Adjuntar foto"}</Text>
            </TouchableOpacity>

            {imagenUri ? (
              <Image source={{ uri: imagenUri }} style={{ height: 120, borderRadius: 10 }} />
            ) : null}

            <TouchableOpacity style={ss.btnPrimario} onPress={handlePublicar} disabled={publicando}>
              {publicando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={ss.btnPrimarioTxt}>Publicar</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={ss.btnSecundario} onPress={() => { setModalReporte(false); setTipoSel(null); setDescripcion(""); setImagenUri(null); }} disabled={publicando}>
              <Text style={ss.btnSecundarioTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* Hero */
  heroBg: {
    height: HERO_H,
    justifyContent: "flex-end",
  },
  greenFilter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 60, 25, 0.62)",
  },
  heroContent: {
    padding: 28,
    paddingBottom: 36,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6fcf97",
  },
  heroBadgeTxt: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 2,
  },
  heroTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 42,
    color: "#fff",
    lineHeight: 48,
  },
  heroSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.80)",
    marginTop: 6,
    marginBottom: 24,
  },
  btnReportar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
  },
  btnReportarTxt: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: C.greenD,
  },
  heroSesion: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    marginTop: 12,
  },

  /* Feed */
  vacioCont: { alignItems: "center", marginTop: 48, gap: 8 },
  vacioTexto: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.text2 },
  vacioSub:   { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.text3, textAlign: "center", paddingHorizontal: 32 },

  /* Reporte card */
  reporteCard:   { marginHorizontal: 16, marginTop: 12, marginBottom: 2, padding: 14 },
  reporteRow:    { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  reporteHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  reporteTipo:   { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.text },
  reporteDesc:   { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.text2, lineHeight: 18, marginTop: 2 },
  reporteMeta:   { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.text3, marginTop: 4 },
  badgeTxt:      { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
  reporteImg:    { width: "100%", height: 160, borderRadius: 8, marginTop: 8 },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.50)", justifyContent: "center", padding: 20 },
  modalBox: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 24,
    padding: 24,
    gap: 14,
  },
  modalTitulo:  { fontFamily: "Outfit_700Bold", fontSize: 18, color: C.text },
  modalSub:     { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.text3, marginTop: -8 },
  inputLabel:   { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.text2 },
  input: {
    backgroundColor: C.bg2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: C.text,
  },
  inputRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn:    { padding: 8, backgroundColor: C.bg2, borderRadius: 10 },
  errorTxt:  { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.red },
  btnPrimario: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnPrimarioTxt:  { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#fff" },
  btnSecundario:   { alignItems: "center", paddingVertical: 10 },
  btnSecundarioTxt:{ fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.text3 },

  /* Chips */
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: C.bg2,
  },
  chipTexto: { fontFamily: "Outfit_600SemiBold", fontSize: 13 },

  /* Foto */
  btnFoto: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: C.green + "12",
  },
  btnFotoTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.green },
});
