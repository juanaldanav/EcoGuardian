// ============================================================
//   SensorRow.js — Fila de sensor reutilizable
// ============================================================
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "../constants/colors";

export default function SensorRow({ icon, label, value, unit, color }) {
  return (
    <View style={ss.row}>
      <View style={[ss.icon, { backgroundColor: color + "22" }]}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
      </View>
      <Text style={ss.label}>{label}</Text>
      <Text style={[ss.value, { color }]}>{value}</Text>
      <Text style={ss.unit}>{unit}</Text>
    </View>
  );
}

const ss = StyleSheet.create({
  row:   { flexDirection:"row", alignItems:"center", paddingVertical:9,
           borderBottomWidth:1, borderBottomColor: C.border + "66" },
  icon:  { width:30, height:30, borderRadius:8, alignItems:"center",
           justifyContent:"center", marginRight:12 },
  label: { flex:1, fontSize:13, color:C.text2, fontWeight:"500" },
  value: { fontSize:15, fontWeight:"700", marginRight:4 },
  unit:  { fontSize:10, color:C.text3 },
});