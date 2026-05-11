// ============================================================
//   LiveDot.js — Punto verde animado "en vivo"
// ============================================================
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { C } from "../constants/colors";

export default function LiveDot() {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue:0.3, duration:800, useNativeDriver:true }),
        Animated.timing(anim, { toValue:1,   duration:800, useNativeDriver:true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[ss.dot, { opacity: anim }]} />;
}

const ss = StyleSheet.create({
  dot: { width:8, height:8, borderRadius:4, backgroundColor: C.green },
});