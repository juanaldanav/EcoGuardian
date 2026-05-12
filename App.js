// ============================================================
//   App.js — Fuentes brand Outfit + JetBrains Mono
//   Cross-fade animado entre tabs
// ============================================================
import React, { useState, useRef, useEffect } from "react";
import {
  View, TouchableOpacity, Text, StyleSheet,
  StatusBar, Image, Animated,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFonts,
  Outfit_300Light, Outfit_400Regular,
  Outfit_600SemiBold, Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";

import ScreenDashboard  from "./screens/ScreenDashboard";
import ScreenMapa       from "./screens/ScreenMapa";
import ScreenAlertas    from "./screens/ScreenAlertas";
import ScreenHistorial  from "./screens/ScreenHistorial";
import ScreenAjustes    from "./screens/ScreenAjustes";
import ScreenComunidad  from "./screens/ScreenComunidad";
import ScreenLogin      from "./screens/ScreenLogin";
import ScreenOnboarding from "./screens/ScreenOnboarding";
import ScreenSplash     from "./screens/ScreenSplash";
import { useAuth }      from "./hooks/useAuth";
import { C } from "./constants/colors";
import { F } from "./constants/fonts";

const TABS = [
  { key:"home",      icon:"home",          iconO:"home-outline",        label:"Inicio"    },
  { key:"map",       icon:"map",           iconO:"map-outline",         label:"Mapa"      },
  { key:"community", icon:"people",        iconO:"people-outline",      label:"Comunidad" },
  { key:"alerts",    icon:"warning",       iconO:"warning-outline",     label:"Alertas"   },
  { key:"history",   icon:"stats-chart",   iconO:"stats-chart-outline", label:"Historial" },
  { key:"settings",  icon:"settings-sharp",iconO:"settings-outline",    label:"Ajustes"   },
];

// ── Header ────────────────────────────────────────────────────
function Header() {
  return (
    <View style={ss.header}>
      <View style={ss.headerLeft}>
        <View style={ss.logoBox}>
          <Image
            source={require("./assets/ecoguardian-mark.png")}
            style={{ width: 22, height: 22, resizeMode: "contain" }}
          />
        </View>
        <View>
          <Text style={ss.logoText}>
            <Text style={ss.logoBold}>eco</Text>
            <Text style={ss.logoLight}>guardian</Text>
          </Text>
          <Text style={ss.logoTagline}>NATURALEZA · IOT</Text>
        </View>
      </View>
    </View>
  );
}

// ── Layout ────────────────────────────────────────────────────
function AppLayout() {
  const [tab, setTab]   = useState("home");
  const insets          = useSafeAreaInsets();
  const fadeAnim        = useRef(new Animated.Value(1)).current;
  const prevTabRef      = useRef("home");

  function handleTabPress(key) {
    if (key === prevTabRef.current) return;
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    prevTabRef.current = key;
    setTab(key);
  }

  const renderScreen = () => {
    switch (tab) {
      case "home":      return <ScreenDashboard />;
      case "map":       return <ScreenMapa />;
      case "community": return <ScreenComunidad />;
      case "alerts":    return <ScreenAlertas />;
      case "history":   return <ScreenHistorial />;
      case "settings":  return <ScreenAjustes />;
      default:          return <ScreenDashboard />;
    }
  };

  return (
    <View style={[ss.root, { backgroundColor: C.bg }]}>
      <View style={{ height: insets.top, backgroundColor: C.bg }} />
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} translucent={false} />

      <Header />

      <Animated.View style={{ flex: 1, opacity: fadeAnim, backgroundColor: C.bg }}>
        {renderScreen()}
      </Animated.View>

      <View style={[ss.bottomNav, { backgroundColor: C.bg2, paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={ss.navBtn}
              onPress={() => handleTabPress(t.key)}
              activeOpacity={0.7}
            >
              <View style={[ss.navIconWrap, active && ss.navIconActive]}>
                <Ionicons
                  name={active ? t.icon : t.iconO}
                  size={22}
                  color={active ? C.green : C.text3}
                />
              </View>
              <Text style={[ss.navLabel, active && { color: C.green, fontFamily: F.semi }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    JetBrainsMono_400Regular,
  });

  const { user, perfil, loading: authLoading } = useAuth();

  const [timedOut,    setTimedOut]    = useState(false);
  const [splashDone,  setSplashDone]  = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const fontsReady = fontsLoaded || fontError || timedOut;

  // Splash siempre al abrir — espera a que terminen fuentes y auth
  if (!splashDone) {
    return (
      <SafeAreaProvider>
        <ScreenSplash onDone={() => setSplashDone(true)} />
      </SafeAreaProvider>
    );
  }

  if (!fontsReady || authLoading) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <ScreenLogin />
      </SafeAreaProvider>
    );
  }

  if (!perfil?.onboardingCompleto) {
    return (
      <SafeAreaProvider>
        <ScreenOnboarding uid={user.uid} nombre={perfil?.nombre || ""} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppLayout />
    </SafeAreaProvider>
  );
}

const ss = StyleSheet.create({
  root:         { flex: 1 },
  header:       { flexDirection: "row", alignItems: "center",
                  paddingHorizontal: 20, paddingVertical: 12,
                  backgroundColor: C.bg,
                  shadowColor: "#1C2B1E", shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  headerLeft:   { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBox:      { width: 38, height: 38, borderRadius: 11, backgroundColor: C.greenD,
                  alignItems: "center", justifyContent: "center" },
  logoText:     { fontSize: 20, lineHeight: 24, letterSpacing: 0.3 },
  logoBold:     { fontFamily: "Outfit_700Bold",  color: C.greenD },
  logoLight:    { fontFamily: "Outfit_300Light", color: C.greenD },
  logoTagline:  { fontFamily: "JetBrainsMono_400Regular", fontSize: 9,
                  letterSpacing: 3, color: C.text3, marginTop: 1 },
  bottomNav:    { flexDirection: "row", paddingTop: 6,
                  shadowColor: "#1C2B1E", shadowOffset: { width: 0, height: -1 },
                  shadowOpacity: 0.05, shadowRadius: 4, elevation: 4 },
  navBtn:       { flex: 1, alignItems: "center", gap: 3 },
  navIconWrap:  { padding: 5, borderRadius: 10 },
  navIconActive:{ backgroundColor: C.green + "18" },
  navLabel:     { fontSize: 10, color: C.text3, fontFamily: "Outfit_400Regular" },
});
