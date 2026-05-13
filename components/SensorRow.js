// ============================================================
//   SensorRow.js — Fila de sensor con fuentes brand
// ============================================================
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { C } from "../constants/colors";

export default function SensorRow({ icon, label, value, unit, color, onPress }) {
  const content = (
    <View style={ss.row}>
      <View style={[ss.icon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={16} color="#fff" />
      </View>
      <Text style={ss.label}>{label}</Text>
      <Text style={[ss.value, { color }]}>{value}</Text>
      {unit ? <Text style={ss.unit}>{unit}</Text> : null}
      {onPress && (
        <Ionicons name="information-circle-outline" size={16} color={C.text3} style={ss.infoIcon} />
      )}
    </View>
  );

  return onPress
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>
    : content;
}

const ss = StyleSheet.create({
  row:      { flexDirection:"row", alignItems:"center", paddingVertical:10,
              borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor: C.border },
  icon:     { width:30, height:30, borderRadius:8, alignItems:"center",
              justifyContent:"center", marginRight:12 },
  label:    { flex:1, fontFamily:"Outfit_400Regular", fontSize:13, color:C.text2 },
  value:    { fontFamily:"JetBrainsMono_400Regular", fontSize:14, fontWeight:"700", marginRight:5 },
  unit:     { fontFamily:"Outfit_400Regular", fontSize:10, color:C.text3 },
  infoIcon: { marginLeft:6 },
});
