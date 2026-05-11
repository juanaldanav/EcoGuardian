// ============================================================
//   SensorRow.js — Fila de sensor con fuentes brand
// ============================================================
import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "../constants/colors";

export default function SensorRow({ icon, label, value, unit, color }) {
  return (
    <View style={ss.row}>
      <View style={[ss.icon, { backgroundColor: color + "18" }]}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
      </View>
      <Text style={ss.label}>{label}</Text>
      <Text style={[ss.value, { color }]}>{value}</Text>
      {unit ? <Text style={ss.unit}>{unit}</Text> : null}
    </View>
  );
}

const ss = StyleSheet.create({
  row:   { flexDirection:"row", alignItems:"center", paddingVertical:10,
           borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor: C.border },
  icon:  { width:30, height:30, borderRadius:8, alignItems:"center",
           justifyContent:"center", marginRight:12 },
  label: { flex:1, fontFamily:"Outfit_400Regular", fontSize:13, color:C.text2 },
  value: { fontFamily:"JetBrainsMono_400Regular", fontSize:14, fontWeight:"700", marginRight:5 },
  unit:  { fontFamily:"Outfit_400Regular", fontSize:10, color:C.text3 },
});
