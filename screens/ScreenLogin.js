// ============================================================
//   ScreenLogin.js — Login + Crear cuenta
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
    case "auth/wrong-password":     return "Correo o contraseña incorrectos";
    case "auth/user-not-found":     return "Usuario no encontrado";
    case "auth/invalid-email":      return "Correo inválido";
    case "auth/email-already-in-use": return "Este correo ya está registrado";
    case "auth/weak-password":      return "La contraseña debe tener al menos 6 caracteres";
    default:                        return "Error al procesar la solicitud";
  }
}

export default function ScreenLogin() {
  const { login, register } = useAuth();
  const [modo,    setModo]    = useState("login"); // "login" | "registro"
  const [nombre,  setNombre]  = useState("");
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [verPass, setVerPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  function resetForm() {
    setNombre(""); setEmail(""); setPass(""); setError(""); setVerPass(false);
  }

  function switchModo(m) { setModo(m); resetForm(); }

  async function handleSubmit() {
    if (!email.trim() || !pass) return;
    if (modo === "registro" && !nombre.trim()) return;
    if (modo === "registro" && pass.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    setError("");
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

  const canSubmit = email.trim() && pass &&
    (modo === "login" || nombre.trim());

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={ss.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={ss.logoArea}>
          <View style={ss.logoBox}>
            <Image
              source={require("../assets/ecoguardian-mark.png")}
              style={{ width: 44, height: 44, resizeMode: "contain" }}
            />
          </View>
          <Text style={ss.logoText}>
            <Text style={ss.logoBold}>eco</Text>
            <Text style={ss.logoLight}>guardian</Text>
          </Text>
          <Text style={ss.tagline}>NATURALEZA · IOT</Text>
        </View>

        {/* Card */}
        <View style={ss.card}>
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

          {/* Nombre — solo en registro */}
          {modo === "registro" && (
            <>
              <Text style={ss.label}>Nombre completo</Text>
              <TextInput
                style={ss.input}
                value={nombre}
                onChangeText={t => { setNombre(t); setError(""); }}
                placeholder="Juan Aldana"
                placeholderTextColor={C.text3}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </>
          )}

          <Text style={ss.label}>Correo electrónico</Text>
          <TextInput
            style={ss.input}
            value={email}
            onChangeText={t => { setEmail(t); setError(""); }}
            placeholder="juan@ejemplo.com"
            placeholderTextColor={C.text3}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={ss.label}>Contraseña</Text>
          <View style={ss.inputRow}>
            <TextInput
              style={[ss.input, { flex: 1, marginBottom: 0 }]}
              value={pass}
              onChangeText={t => { setPass(t); setError(""); }}
              placeholder="••••••••"
              placeholderTextColor={C.text3}
              secureTextEntry={!verPass}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity onPress={() => setVerPass(v => !v)} style={ss.eyeBtn}>
              <Ionicons
                name={verPass ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={C.text3}
              />
            </TouchableOpacity>
          </View>

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

        {modo === "login" && (
          <Text style={ss.hint}>Accede con tu cuenta registrada.</Text>
        )}
        {modo === "registro" && (
          <Text style={ss.hint}>Al crear una cuenta aceptas usar el servicio de forma responsable.</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ss = StyleSheet.create({
  scroll:      { flexGrow: 1, justifyContent: "center",
                 paddingHorizontal: 28, paddingVertical: 48 },
  logoArea:    { alignItems: "center", marginBottom: 40 },
  logoBox:     { width: 76, height: 76, borderRadius: 22,
                 backgroundColor: C.greenD, alignItems: "center",
                 justifyContent: "center", marginBottom: 16,
                 shadowColor: C.greenD, shadowOffset: { width: 0, height: 8 },
                 shadowOpacity: 0.28, shadowRadius: 18, elevation: 10 },
  logoText:    { fontSize: 34, lineHeight: 40 },
  logoBold:    { fontFamily: "Outfit_700Bold",  color: C.greenD },
  logoLight:   { fontFamily: "Outfit_300Light", color: C.greenD },
  tagline:     { fontFamily: "JetBrainsMono_400Regular", fontSize: 10,
                 letterSpacing: 3, color: C.text3, marginTop: 6 },
  card:        { backgroundColor: C.card, borderRadius: 22, padding: 24,
                 shadowColor: "#1C2B1E", shadowOffset: { width: 0, height: 4 },
                 shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 },
  tabRow:      { flexDirection: "row", backgroundColor: C.bg2,
                 borderRadius: 12, padding: 4, marginBottom: 24 },
  tab:         { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  tabActive:   { backgroundColor: C.card,
                 shadowColor: "#1C2B1E", shadowOffset: { width: 0, height: 2 },
                 shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  tabTxt:      { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.text3 },
  tabTxtActive:{ color: C.green },
  label:       { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.text2, marginBottom: 6 },
  input:       { backgroundColor: C.bg2, borderRadius: 12, paddingHorizontal: 14,
                 paddingVertical: 13, fontFamily: "Outfit_400Regular", fontSize: 14,
                 color: C.text, marginBottom: 16 },
  inputRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  eyeBtn:      { padding: 13, backgroundColor: C.bg2, borderRadius: 12 },
  error:       { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.red, marginBottom: 12 },
  btn:         { backgroundColor: C.green, paddingVertical: 15, borderRadius: 14,
                 alignItems: "center", marginTop: 4 },
  btnTxt:      { fontFamily: "Outfit_700Bold", fontSize: 15, color: "#fff", letterSpacing: 0.3 },
  hint:        { textAlign: "center", fontFamily: "Outfit_400Regular", fontSize: 11,
                 color: C.text3, marginTop: 24 },
});
