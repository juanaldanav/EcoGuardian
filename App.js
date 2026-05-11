// ============================================================
//   App.js — Corregido para Android Samsung
//   - Safe area para status bar y navigation bar
//   - Sin botón de flecha en el header
// ============================================================
import React, { useState } from "react";
import {
  View, TouchableOpacity, Text, StyleSheet,
  StatusBar, Platform, Image,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import ScreenDashboard from "./screens/ScreenDashboard";
import ScreenMapa      from "./screens/ScreenMapa";
import ScreenAlertas   from "./screens/ScreenAlertas";
import ScreenHistorial from "./screens/ScreenHistorial";
import ScreenAjustes   from "./screens/ScreenAjustes";
import { C } from "./constants/colors";

const TABS = [
  { key:"home",    icon:"home",          iconO:"home-outline",        label:"Inicio"    },
  { key:"map",     icon:"map",           iconO:"map-outline",         label:"Mapa"      },
  { key:"alerts",  icon:"warning",       iconO:"warning-outline",     label:"Alertas"   },
  { key:"history", icon:"stats-chart",   iconO:"stats-chart-outline", label:"Historial" },
  { key:"settings",icon:"settings-sharp",iconO:"settings-outline",    label:"Ajustes"   },
];

// ── Header sin botón de flecha ────────────────────────────────
function Header({ title }) {
  return (
    <View style={ss.header}>
      <View style={ss.headerLeft}>
        <View style={ss.logoBox}>
          <Image
            source={require('./assets/ecoguardian-mark.png')}
            style={{ width: 24, height: 24, resizeMode: 'contain' }}
          />
        </View>
        <Text style={ss.logoText}>{title}</Text>
      </View>
    </View>
  );
}

// ── Layout principal con insets ───────────────────────────────
function AppLayout() {
  const [tab, setTab]           = useState("home");
  const [darkMode, setDarkMode] = useState(true);
  const insets                  = useSafeAreaInsets();

  const bgColor = darkMode ? C.bg : "#F0F4F0";

  const renderScreen = () => {
    switch(tab) {
      case "home":     return <ScreenDashboard />;
      case "map":      return <ScreenMapa />;
      case "alerts":   return <ScreenAlertas />;
      case "history":  return <ScreenHistorial />;
      case "settings": return <ScreenAjustes darkMode={darkMode} setDarkMode={setDarkMode} />;
      default:         return <ScreenDashboard />;
    }
  };

  return (
    <View style={[ss.root, { backgroundColor:bgColor }]}>
      {/* Rellena el espacio del status bar de arriba */}
      <View style={{ height:insets.top, backgroundColor:bgColor }} />

      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={bgColor}
        translucent={false}
      />

      <Header title="EcoGuardian" />

      {/* Contenido de la pantalla */}
      <View style={{ flex:1, backgroundColor:bgColor }}>
        {renderScreen()}
      </View>

      {/* Barra de navegación inferior */}
      <View style={[
        ss.bottomNav,
        {
          backgroundColor: darkMode ? C.bg2 : "#E8F0E8",
          // Rellena el espacio de los botones del teléfono
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
        }
      ]}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={ss.navBtn}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <View style={[ss.navIconWrap, active && ss.navIconActive]}>
                <Ionicons
                  name={active ? t.icon : t.iconO}
                  size={22}
                  color={active ? C.green : C.text3}
                />
              </View>
              <Text style={[ss.navLabel, active && { color:C.green }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rellena el espacio extra si hay barra de gestos */}
      <View style={{ height: insets.bottom > 0 ? 0 : 0, backgroundColor:bgColor }} />
    </View>
  );
}

// ── App envuelta en SafeAreaProvider ─────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <AppLayout />
    </SafeAreaProvider>
  );
}

const ss = StyleSheet.create({
  root:         { flex:1 },
  header:       { flexDirection:"row", alignItems:"center",
                  paddingHorizontal:20, paddingVertical:14,
                  borderBottomWidth:1, borderBottomColor:C.border },
  headerLeft:   { flexDirection:"row", alignItems:"center", gap:10 },
  logoBox:      { width:36, height:36, borderRadius:10, backgroundColor:C.greenD,
                  alignItems:"center", justifyContent:"center" },
  logoText:     { fontSize:18, fontWeight:"800", color:C.text },
  bottomNav:    { flexDirection:"row", borderTopWidth:1, borderTopColor:C.border, paddingTop:6 },
  navBtn:       { flex:1, alignItems:"center", gap:3 },
  navIconWrap:  { padding:4, borderRadius:10 },
  navIconActive:{ backgroundColor:C.green+"22" },
  navLabel:     { fontSize:10, color:C.text3, fontWeight:"600" },
});