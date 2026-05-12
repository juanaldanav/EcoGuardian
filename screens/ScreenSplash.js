// ============================================================
//   ScreenSplash.js — Animación de entrada
// ============================================================
import React, { useEffect, useRef } from "react";
import { View, Text, Image, Animated, StyleSheet } from "react-native";
import { C } from "../constants/colors";

export default function ScreenSplash({ onDone }) {
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.82)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo aparece
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 600, useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1, friction: 6, tension: 80, useNativeDriver: true,
        }),
      ]),
      // Texto aparece
      Animated.timing(textOpacity, {
        toValue: 1, duration: 400, delay: 100, useNativeDriver: true,
      }),
      // Pausa
      Animated.delay(900),
      // Fade out completo
      Animated.timing(screenOpacity, {
        toValue: 0, duration: 350, useNativeDriver: true,
      }),
    ]).start(() => onDone?.());
  }, []);

  return (
    <Animated.View style={[ss.root, { opacity: screenOpacity }]}>
      <Animated.View style={[ss.logoWrap, {
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }]}>
        <Image
          source={require("../assets/ecoguardian-mark.png")}
          style={ss.logo}
        />
      </Animated.View>

      <Animated.View style={[ss.textWrap, { opacity: textOpacity }]}>
        <Text style={ss.wordmark}>
          <Text style={ss.bold}>eco</Text>
          <Text style={ss.light}>guardian</Text>
        </Text>
        <Text style={ss.tagline}>NATURALEZA · IOT</Text>
      </Animated.View>
    </Animated.View>
  );
}

const ss = StyleSheet.create({
  root:      { flex: 1, backgroundColor: C.greenD,
               alignItems: "center", justifyContent: "center" },
  logoWrap:  { width: 100, height: 100, borderRadius: 28,
               backgroundColor: "rgba(255,255,255,0.12)",
               alignItems: "center", justifyContent: "center",
               marginBottom: 28,
               shadowColor: "#000", shadowOffset: { width: 0, height: 12 },
               shadowOpacity: 0.3, shadowRadius: 24, elevation: 16 },
  logo:      { width: 58, height: 58, resizeMode: "contain" },
  textWrap:  { alignItems: "center" },
  wordmark:  { fontSize: 32, lineHeight: 38 },
  bold:      { fontFamily: "Outfit_700Bold",  color: "#fff" },
  light:     { fontFamily: "Outfit_300Light", color: "rgba(255,255,255,0.85)" },
  tagline:   { fontFamily: "JetBrainsMono_400Regular", fontSize: 10,
               letterSpacing: 3.5, color: "rgba(255,255,255,0.5)", marginTop: 8 },
});
