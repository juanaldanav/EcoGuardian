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
    borderWidth: 1,
    borderColor: C.border,
  },
});