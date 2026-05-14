// ============================================================
//   ScreenLogin.js — Login · Registro · Recuperar contraseña
// ============================================================
import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { C } from "../constants/colors";

function errMsg(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":       return "Correo o contraseña incorrectos";
    case "auth/user-not-found":       return "No existe una cuenta con ese correo";
    case "auth/invalid-email":        return "Correo inválido";
    case "auth/email-already-in-use": return "Ese correo ya tiene una cuenta — inicia sesión";
    case "auth/weak-password":        return "La contraseña debe tener al menos 8 caracteres";
    case "auth/too-many-requests":    return "Demasiados intentos. Intenta más tarde";
    default:                          return "Error al procesar la solicitud";
  }
}

// ── Campo de texto reutilizable ───────────────────────────────
function Campo({ icon, placeholder, value, onChangeText, secureTextEntry,
                 keyboardType, autoCapitalize, returnKeyType, onSubmitEditing,
                 right }) {
  return (
    <View style={ss.inputWrap}>
      <Ionicons name={icon} size={15} color={C.text3} style={ss.inputIcon} />
      <TextInput
        style={[ss.inputField, right && { flex: 1 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.text3}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? "none"}
        keyboardType={keyboardType ?? "default"}
        autoCorrect={false}
        returnKeyType={returnKeyType ?? "next"}
        onSubmitEditing={onSubmitEditing}
      />
      {right}
    </View>
  );
}

// ── Pantalla ──────────────────────────────────────────────────
export default function ScreenLogin() {
  const { login, register, resetPassword } = useAuth();

  // "login" | "registro" | "olvide"
  const [modo,        setModo]        = useState("login");
  const [nombre,      setNombre]      = useState("");
  const [email,       setEmail]       = useState("");
  const [pass,        setPass]        = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [verPass,     setVerPass]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [resetOk,     setResetOk]     = useState(false);

  function reset() {
    setNombre(""); setEmail(""); setPass(""); setPassConfirm("");
    setError(""); setVerPass(false); setResetOk(false);
  }

  function switchModo(m) { setModo(m); reset(); }

  function limpiarError() { if (error) setError(""); }

  async function handleSubmit() {
    setError("");

    if (modo === "olvide") {
      if (!email.trim()) { setError("Ingresa tu correo"); return; }
      setLoading(true);
      try {
        await resetPassword(email.trim());
        setResetOk(true);
      } catch (e) {
        setError(errMsg(e.code));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !pass) { setError("Completa todos los campos"); return; }

    if (modo === "registro") {
      if (!nombre.trim()) { setError("Ingresa tu nombre completo"); return; }
      if (pass.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
      if (pass !== passConfirm) { setError("Las contraseñas no coinciden"); return; }
    }

    setLoading(true);
    try {
      if (modo === "login") {
        await login(email.trim(), pass);
      } else {
        await register(email.trim(), pass, nombre.trim());
      }
    } catch (e) {
      setError(errMsg(e.code));
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = modo === "olvide"
    ? !!email.trim()
    : email.trim() && pass && (modo === "login" || (nombre.trim() && passConfirm));

  // ── Vista recuperar contraseña ──────────────────────────────
  const VistaOlvide = (
    <View>
      {resetOk ? (
        <View style={ss.resetOkBox}>
          <Ionicons name="checkmark-circle" size={36} color={C.green} />
          <Text style={ss.resetOkTitle}>¡Correo enviado!</Text>
          <Text style={ss.resetOkSub}>
            Revisa tu bandeja de entrada. El enlace expira en 1 hora.
          </Text>
          <TouchableOpacity onPress={() => switchModo("login")} style={ss.backLink}>
            <Ionicons name="arrow-back" size={14} color={C.green} />
            <Text style={ss.backLinkTxt}>Volver al inicio de sesión</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={ss.olvideDesc}>
            Ingresa tu correo y te enviamos un enlace para restablecer tu contraseña.
          </Text>
          <Text style={ss.label}>Correo electrónico</Text>
          <Campo
            icon="mail-outline"
            placeholder="correo@ejemplo.com"
            value={email}
            onChangeText={t => { setEmail(t); limpiarError(); }}
            keyboardType="email-address"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          {error ? <Text style={ss.error}>{error}</Text> : null}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !canSubmit}
            style={[ss.btn, { opacity: loading || !canSubmit ? 0.55 : 1 }]}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={ss.btnTxt}>Enviar enlace</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={() => switchModo("login")} style={ss.backLink}>
            <Ionicons name="arrow-back" size={14} color={C.text3} />
            <Text style={[ss.backLinkTxt, { color: C.text3 }]}>Volver</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  // ── Vista login / registro ──────────────────────────────────
  const VistaForm = (
    <View>
      {/* Tabs */}
      <View style={ss.tabRow}>
        {["login", "registro"].map(m => (
          <TouchableOpacity
            key={m}
            onPress={() => switchModo(m)}
            style={[ss.tab, modo === m && ss.tabActive]}
            activeOpacity={0.7}
          >
            <Text style={[ss.tabTxt, modo === m && ss.tabTxtActive]}>
              {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Nombre — solo registro */}
      {modo === "registro" && (
        <>
          <Text style={ss.label}>Nombre completo</Text>
          <Campo
            icon="person-outline"
            placeholder="Nombre completo"
            value={nombre}
            onChangeText={t => { setNombre(t); limpiarError(); }}
            autoCapitalize="words"
          />
        </>
      )}

      <Text style={ss.label}>Correo electrónico</Text>
      <Campo
        icon="mail-outline"
        placeholder="correo@ejemplo.com"
        value={email}
        onChangeText={t => { setEmail(t); limpiarError(); }}
        keyboardType="email-address"
      />

      <Text style={ss.label}>Contraseña</Text>
      <Campo
        icon="lock-closed-outline"
        placeholder="Mínimo 8 caracteres"
        value={pass}
        onChangeText={t => { setPass(t); limpiarError(); }}
        secureTextEntry={!verPass}
        returnKeyType={modo === "registro" ? "next" : "done"}
        onSubmitEditing={modo === "login" ? handleSubmit : undefined}
        right={
          <TouchableOpacity onPress={() => setVerPass(v => !v)} style={ss.eyeBtn}>
            <Ionicons name={verPass ? "eye-off-outline" : "eye-outline"} size={16} color={C.text3} />
          </TouchableOpacity>
        }
      />

      {/* Confirmar contraseña — solo registro */}
      {modo === "registro" && (
        <>
          <Text style={ss.label}>Confirmar contraseña</Text>
          <Campo
            icon="lock-closed-outline"
            placeholder="Repite la contraseña"
            value={passConfirm}
            onChangeText={t => { setPassConfirm(t); limpiarError(); }}
            secureTextEntry={!verPass}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </>
      )}

      {/* Olvidé contraseña — solo login */}
      {modo === "login" && (
        <TouchableOpacity
          onPress={() => switchModo("olvide")}
          style={ss.olvidePressable}
          activeOpacity={0.7}
        >
          <Text style={ss.olvideTxt}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>
      )}

      {error ? <Text style={ss.error}>{error}</Text> : null}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading || !canSubmit}
        style={[ss.btn, { opacity: loading || !canSubmit ? 0.55 : 1 }]}
        activeOpacity={0.8}
      >
        {loading
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={ss.btnTxt}>
              {modo === "login" ? "Entrar" : "Crear mi cuenta"}
            </Text>
        }
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex:1, backgroundColor:C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={ss.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={ss.halo1} />
        <View style={ss.halo2} />

        {/* Logo */}
        <View style={ss.logoArea}>
          <View style={ss.logoBox}>
            <Image
              source={require("../assets/ecoguardian-mark.png")}
              style={{ width:44, height:44, resizeMode:"contain" }}
            />
          </View>
          <Text style={ss.logoText}>
            <Text style={ss.logoBold}>eco</Text>
            <Text style={ss.logoLight}>guardian</Text>
          </Text>
          <Text style={ss.tagline}>NATURALEZA · IOT</Text>
          <Text style={ss.welcome}>Monitorea la calidad del aire en tiempo real</Text>
        </View>

        {/* Card */}
        <View style={ss.card}>
          {modo === "olvide" ? VistaOlvide : VistaForm}
        </View>

        <Text style={ss.hint}>
          {modo === "login"    ? "Accede con tu cuenta registrada."
         : modo === "registro" ? "Al crear una cuenta aceptas usar el servicio de forma responsable."
         : ""}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ss = StyleSheet.create({
  scroll:      { flexGrow:1, justifyContent:"center",
                 paddingHorizontal:28, paddingVertical:48, position:"relative" },

  halo1:       { position:"absolute", top:-60, right:-80,
                 width:240, height:240, borderRadius:120,
                 backgroundColor:"rgba(46,125,50,0.07)" },
  halo2:       { position:"absolute", bottom:-80, left:-60,
                 width:200, height:200, borderRadius:100,
                 backgroundColor:"rgba(124,179,66,0.05)" },

  logoArea:    { alignItems:"center", marginBottom:36, zIndex:1 },
  logoBox:     { width:76, height:76, borderRadius:22,
                 backgroundColor:C.greenD, alignItems:"center",
                 justifyContent:"center", marginBottom:16,
                 shadowColor:C.greenD, shadowOffset:{width:0,height:8},
                 shadowOpacity:0.3, shadowRadius:18, elevation:10 },
  logoText:    { fontSize:34, lineHeight:40 },
  logoBold:    { fontFamily:"Outfit_700Bold",  color:C.greenD },
  logoLight:   { fontFamily:"Outfit_300Light", color:C.greenD },
  tagline:     { fontFamily:"JetBrainsMono_400Regular", fontSize:10,
                 letterSpacing:3, color:C.text3, marginTop:6 },
  welcome:     { fontFamily:"Outfit_400Regular", fontSize:14, color:C.text2,
                 marginTop:10, textAlign:"center", lineHeight:20, maxWidth:220 },

  card:        { backgroundColor:C.card, borderRadius:22, padding:24,
                 shadowColor:"#1C2B1E", shadowOffset:{width:0,height:4},
                 shadowOpacity:0.08, shadowRadius:18, elevation:4, zIndex:1 },

  tabRow:      { flexDirection:"row", backgroundColor:C.bg2,
                 borderRadius:12, padding:4, marginBottom:24 },
  tab:         { flex:1, paddingVertical:9, borderRadius:9, alignItems:"center" },
  tabActive:   { backgroundColor:C.card,
                 shadowColor:"#1C2B1E", shadowOffset:{width:0,height:2},
                 shadowOpacity:0.08, shadowRadius:6, elevation:2 },
  tabTxt:      { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.text3 },
  tabTxtActive:{ color:C.green },

  label:       { fontFamily:"Outfit_600SemiBold", fontSize:11, color:C.text2, marginBottom:6 },

  inputWrap:   { flexDirection:"row", alignItems:"center",
                 backgroundColor:C.bg2, borderRadius:12,
                 marginBottom:14, paddingRight:4 },
  inputIcon:   { marginLeft:12, marginRight:4 },
  inputField:  { flex:1, paddingHorizontal:8, paddingVertical:13,
                 fontFamily:"Outfit_400Regular", fontSize:14, color:C.text },
  eyeBtn:      { padding:10 },

  olvidePressable: { alignSelf:"flex-end", marginBottom:14, marginTop:-6 },
  olvideTxt:       { fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.green },

  error:       { fontFamily:"Outfit_400Regular", fontSize:12, color:C.red, marginBottom:12 },
  btn:         { backgroundColor:C.green, paddingVertical:15, borderRadius:14,
                 alignItems:"center", marginTop:4,
                 shadowColor:C.green, shadowOffset:{width:0,height:6},
                 shadowOpacity:0.28, shadowRadius:12, elevation:4 },
  btnTxt:      { fontFamily:"Outfit_700Bold", fontSize:15, color:"#fff", letterSpacing:0.3 },
  hint:        { textAlign:"center", fontFamily:"Outfit_400Regular", fontSize:11,
                 color:C.text3, marginTop:24, zIndex:1 },

  // Vista recuperar contraseña
  olvideDesc:    { fontFamily:"Outfit_400Regular", fontSize:13, color:C.text2,
                   lineHeight:20, marginBottom:20 },
  resetOkBox:    { alignItems:"center", paddingVertical:16, gap:12 },
  resetOkTitle:  { fontFamily:"Outfit_700Bold", fontSize:18, color:C.green },
  resetOkSub:    { fontFamily:"Outfit_400Regular", fontSize:13, color:C.text2,
                   textAlign:"center", lineHeight:20 },
  backLink:      { flexDirection:"row", alignItems:"center", gap:6,
                   marginTop:16, alignSelf:"center" },
  backLinkTxt:   { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.green },
});
