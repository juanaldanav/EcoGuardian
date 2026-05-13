// ============================================================
//   ScreenTienda.js — Producto EcoG Station
// ============================================================
import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { STORE_PLAN, STORE_URL } from "../constants/store";
import { C } from "../constants/colors";

const SPECS = [
  { label: "Partículas",  value: "PM2.5 / PM10 (SDS011)"   },
  { label: "Aire",        value: "CO₂ / TVOC (CCS811)"     },
  { label: "Ubicación",   value: "GPS integrado (NMEA)"     },
  { label: "Conexión",    value: "WiFi 802.11 b/g/n"        },
  { label: "Alertas",     value: "NOM-172-SEMARNAT-2023"    },
];

export default function ScreenTienda({ onBack }) {
  function handleSolicitar() {
    if (STORE_URL) {
      // Abrir URL de contacto cuando esté disponible
    } else {
      Alert.alert(
        "Solicitar EcoG Station",
        "Escríbenos para agendar tu instalación. Próximamente podrás hacerlo directo desde la app."
      );
    }
  }

  return (
    <View style={ss.root}>
      {/* Hero */}
      <View style={ss.hero}>
        <TouchableOpacity style={ss.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={ss.heroTitle}>EcoGuardian · Plan mensual</Text>

        {/* Representación visual del dispositivo */}
        <View style={ss.deviceBox}>
          <View style={ss.deviceFace}>
            <MaterialCommunityIcons name="air-filter" size={36} color={C.accent} />
            <View style={ss.ledDot} />
          </View>
          <View style={ss.deviceGrill}>
            {[0,1,2,3,4].map(i => (
              <View key={i} style={ss.grillBar} />
            ))}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={ss.body} showsVerticalScrollIndicator={false}>
        {/* Nombre y precio */}
        <Text style={ss.productName}>{STORE_PLAN.name}</Text>
        <View style={ss.priceRow}>
          <Text style={ss.price}>
            ${STORE_PLAN.precio.toLocaleString("es-MX")}
          </Text>
          <View style={ss.currencyChip}>
            <Text style={ss.currencyTxt}>
              {STORE_PLAN.currency} / {STORE_PLAN.periodo}
            </Text>
          </View>
        </View>
        <View style={ss.stockRow}>
          <View style={ss.stockDot} />
          <Text style={ss.stockTxt}>Dispositivo, instalación y soporte incluidos</Text>
        </View>

        {/* Qué incluye */}
        <Text style={ss.descLabel}>¿Qué incluye?</Text>
        <View style={ss.specsCard}>
          {STORE_PLAN.incluye.map((item, i) => (
            <View key={i} style={[ss.specRow, i < STORE_PLAN.incluye.length - 1 && ss.specBorder]}>
              <Ionicons name="checkmark-circle" size={16} color={C.accent} style={{ marginRight: 10 }} />
              <Text style={[ss.specValue, { marginLeft: 0 }]}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Descripción */}
        <Text style={ss.descLabel}>¿Qué mide?</Text>
        <Text style={ss.desc}>
          Monitoreo continuo de partículas PM2.5 y PM10, dióxido de carbono (CO₂),
          compuestos orgánicos volátiles (TVOC) y ubicación GPS en tiempo real.
          Los datos se envían automáticamente a la red pública de EcoGuardian.
        </Text>

        {/* Specs */}
        <Text style={ss.descLabel}>Especificaciones</Text>
        <View style={ss.specsCard}>
          {SPECS.map((s, i) => (
            <View key={i} style={[ss.specRow, i < SPECS.length - 1 && ss.specBorder]}>
              <Text style={ss.specLabel}>{s.label}</Text>
              <Text style={ss.specValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer fijo */}
      <View style={ss.footer}>
        <TouchableOpacity style={ss.btnPrim} onPress={handleSolicitar} activeOpacity={0.85}>
          <Text style={ss.btnPrimTxt}>
            Solicitar · ${STORE_PLAN.precio.toLocaleString("es-MX")}/{STORE_PLAN.periodo}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={ss.btnGhost} onPress={onBack} activeOpacity={0.8}>
          <Text style={ss.btnGhostTxt}>Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },

  // Hero
  hero:        { backgroundColor: C.greenD, paddingTop: 56, paddingBottom: 32,
                 paddingHorizontal: 24, alignItems: "center" },
  backBtn:     { position: "absolute", top: 56, left: 20,
                 width: 36, height: 36, borderRadius: 10,
                 backgroundColor: "rgba(255,255,255,0.12)",
                 alignItems: "center", justifyContent: "center" },
  heroTitle:   { fontFamily: "Outfit_600SemiBold", fontSize: 14,
                 color: "rgba(255,255,255,0.6)", letterSpacing: 0.5,
                 marginBottom: 24 },
  deviceBox:   { width: 120, height: 120, borderRadius: 20,
                 backgroundColor: C.green, alignItems: "center",
                 justifyContent: "center", overflow: "hidden",
                 shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
                 shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  deviceFace:  { flex: 1, alignItems: "center", justifyContent: "center", width: "100%" },
  ledDot:      { position: "absolute", top: 10, right: 10,
                 width: 8, height: 8, borderRadius: 4,
                 backgroundColor: C.accent },
  deviceGrill: { width: "100%", height: 28, backgroundColor: "#0a1a0c",
                 flexDirection: "row", alignItems: "center",
                 justifyContent: "center", gap: 5, paddingHorizontal: 12 },
  grillBar:    { flex: 1, height: 3, borderRadius: 2,
                 backgroundColor: "rgba(255,255,255,0.15)" },

  // Body
  body:        { paddingHorizontal: 24, paddingTop: 24 },
  productName: { fontFamily: "Outfit_700Bold", fontSize: 22, color: C.text, marginBottom: 8 },
  priceRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  price:       { fontFamily: "Outfit_700Bold", fontSize: 28, color: C.greenD },
  currencyChip:{ backgroundColor: C.bg2, paddingHorizontal: 10, paddingVertical: 4,
                 borderRadius: 8 },
  currencyTxt: { fontFamily: "JetBrainsMono_400Regular", fontSize: 10, color: C.text2 },
  stockRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  stockDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },
  stockTxt:    { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.text2 },

  descLabel:   { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.text2,
                 letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },
  desc:        { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.text3,
                 lineHeight: 20, marginBottom: 20 },

  specsCard:   { backgroundColor: C.card, borderRadius: 16, overflow: "hidden",
                 borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  specRow:     { flexDirection: "row", justifyContent: "space-between",
                 alignItems: "center", paddingHorizontal: 16, paddingVertical: 13 },
  specBorder:  { borderBottomWidth: 1, borderBottomColor: C.border },
  specLabel:   { fontFamily: "JetBrainsMono_400Regular", fontSize: 10,
                 color: C.text3, letterSpacing: 0.5 },
  specValue:   { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.text,
                 textAlign: "right", flex: 1, marginLeft: 16 },

  // Footer
  footer:      { position: "absolute", bottom: 0, left: 0, right: 0,
                 backgroundColor: C.bg, paddingHorizontal: 24,
                 paddingTop: 12, paddingBottom: 28,
                 borderTopWidth: 1, borderTopColor: C.border },
  btnPrim:     { backgroundColor: C.greenD, paddingVertical: 16,
                 borderRadius: 14, alignItems: "center", marginBottom: 10,
                 shadowColor: C.greenD, shadowOffset: { width: 0, height: 4 },
                 shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnPrimTxt:  { fontFamily: "Outfit_700Bold", fontSize: 15, color: "#fff" },
  btnGhost:    { borderWidth: 1.5, borderColor: C.greenD, paddingVertical: 14,
                 borderRadius: 14, alignItems: "center" },
  btnGhostTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.greenD },
});
