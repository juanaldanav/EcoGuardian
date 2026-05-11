// ============================================================
//   LiveDot.js — Punto con anillo ripple animado
// ============================================================
import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { C } from "../constants/colors";

export default function LiveDot() {
  const pulse  = useRef(new Animated.Value(0)).current;
  const opac   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(opac,  { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });

  return (
    <View style={ss.wrap}>
      {/* Anillo expansivo */}
      <Animated.View style={[ss.ring, { transform: [{ scale: ringScale }], opacity: opac }]} />
      {/* Punto central */}
      <View style={ss.dot} />
    </View>
  );
}

const ss = StyleSheet.create({
  wrap: { width: 14, height: 14, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 10, height: 10, borderRadius: 5,
          borderWidth: 1.5, borderColor: C.green },
  dot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
});
