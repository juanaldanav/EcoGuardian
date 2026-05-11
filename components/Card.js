// ============================================================
//   Card.js — Tarjeta reutilizable
// ============================================================
import React from "react";
import { View, StyleSheet } from "react-native";
import { C } from "../constants/colors";

export default function Card({ children, style }) {
  return <View style={[ss.card, style]}>{children}</View>;
}

const ss = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#1C2B1E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
});