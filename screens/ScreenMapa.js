// ============================================================
//   ScreenMapa.js — Mapa con ubicación en tiempo real
//   El marcador se mueve cuando el ESP32 manda nuevas coords
// ============================================================
import React, { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import LiveDot   from "../components/LiveDot";
import { useStations } from "../hooks/useFirebase";
import { getInfo, timeSince } from "../utils/helpers";
import { C } from "../constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Coordenadas por defecto — centro de Culiacán
const LAT_DEFAULT = 24.7931;
const LNG_DEFAULT = -107.3939;

// Estilo claro minimalista del mapa
const MAP_STYLE = [
  { elementType:"geometry",            stylers:[{ color:"#f8faf8" }] },
  { elementType:"labels.text.fill",    stylers:[{ color:"#4a6b52" }] },
  { elementType:"labels.text.stroke",  stylers:[{ color:"#ffffff" }] },
  { featureType:"road", elementType:"geometry",        stylers:[{ color:"#ffffff" }] },
  { featureType:"road", elementType:"geometry.stroke", stylers:[{ color:"#dce8dc" }] },
  { featureType:"road.highway", elementType:"geometry",stylers:[{ color:"#f0f5f0" }] },
  { featureType:"road.highway", elementType:"geometry.stroke", stylers:[{ color:"#dce8dc" }] },
  { featureType:"water",        elementType:"geometry", stylers:[{ color:"#c8dff0" }] },
  { featureType:"poi",          elementType:"geometry", stylers:[{ color:"#eef4ee" }] },
  { featureType:"poi.park",     elementType:"geometry", stylers:[{ color:"#dceede" }] },
  { featureType:"transit",      elementType:"geometry", stylers:[{ color:"#f4f8f4" }] },
  { featureType:"administrative",elementType:"geometry",stylers:[{ color:"#dce8dc" }] },
];

export default function ScreenMapa() {
  const { stations } = useStations();
  const mapRef       = useRef(null);
  const [selected, setSelected] = useState(null);

  const lista = Object.entries(stations);

  // Selecciona la primera estación por defecto cuando cargan los datos
  useEffect(() => {
    if (lista.length > 0 && !selected) {
      setSelected(lista[0][0]);
    }
  }, [lista.length]);

  const data = selected ? stations[selected] : lista[0]?.[1] ?? null;
  const info = getInfo(data?.pm25 || 0);

  return (
    <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>

      {/* ── MAPA ────────────────────────────────────── */}
      <View style={ss.mapWrap}>
        <MapView
          ref={mapRef}
          style={ss.map}
          customMapStyle={MAP_STYLE}
          initialRegion={{
            latitude:      data?.lat || LAT_DEFAULT,
            longitude:     data?.lng || LNG_DEFAULT,
            latitudeDelta: 0.05,
            longitudeDelta:0.05,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {lista.map(([id, st]) => {
            const lat = st?.lat || LAT_DEFAULT;
            const lng = st?.lng || LNG_DEFAULT;
            const stInfo = getInfo(st?.pm25 || 0);
            return (
              <React.Fragment key={id}>
                <Circle
                  center={{ latitude:lat, longitude:lng }}
                  radius={200}
                  fillColor={stInfo.color + "22"}
                  strokeColor={stInfo.color + "88"}
                  strokeWidth={2}
                />
                <Marker
                  coordinate={{ latitude:lat, longitude:lng }}
                  title={st?.nombre || id}
                  description={`PM2.5: ${(st?.pm25||0).toFixed(1)} µg/m³ — ${stInfo.label}`}
                  tracksViewChanges={false}
                  onPress={() => setSelected(id)}
                >
                  <View style={[ss.markerWrap, { shadowColor:stInfo.color }]}>
                    <View style={[ss.markerInner,
                      { backgroundColor: selected === id ? stInfo.color : stInfo.color + "CC" }]}>
                      <MaterialCommunityIcons name="air-filter" size={16} color="#fff" />
                    </View>
                    <View style={[ss.markerTail, { borderTopColor:stInfo.color }]} />
                  </View>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapView>

        {/* Badge nivel de la estación seleccionada */}
        <View style={[ss.mapBadge, { backgroundColor:info.color+"EE" }]}>
          <Text style={ss.mapBadgeTxt}>{info.label}</Text>
          <Text style={ss.mapBadgeSub}>PM2.5: {(data?.pm25||0).toFixed(1)} µg/m³</Text>
        </View>

        {/* Contador de estaciones */}
        <View style={[ss.gpsBadge, { backgroundColor: C.greenD + "EE" }]}>
          <MaterialCommunityIcons name="access-point" size={12} color="#fff" />
          <Text style={[ss.gpsBadgeTxt, { color: "#fff" }]}>
            {lista.length} {lista.length === 1 ? "estación" : "estaciones"}
          </Text>
        </View>
      </View>

      {/* ── BOTTOM SHEET ESTACIÓN SELECCIONADA ──────── */}
      {data && (
        <View style={ss.bottomSheet}>
          <View style={ss.sheetTop}>
            <View style={{ flex:1 }}>
              <Text style={ss.stationName}>{data?.nombre || selected || "Estación"}</Text>
              {data?.lat && data?.lng && data.lat !== 0 && (
                <Text style={ss.stationCoords}>
                  {data.lat.toFixed(5)} °N · {data.lng.toFixed(5)} °O
                </Text>
              )}
            </View>
            <View style={[ss.levelPill, { backgroundColor:info.color+"18" }]}>
              <Text style={[ss.levelPillTxt, { color:info.color }]}>
                {info.label.toUpperCase()}
              </Text>
            </View>
          </View>

          {!data?.gps_valido && (
            <View style={ss.gpsSinSenal}>
              <MaterialCommunityIcons name="satellite-variant" size={13} color={C.orange} />
              <Text style={ss.gpsSinSenalTxt}>
                {data?.lat ? "Última posición conocida" : "GPS buscando señal"}
              </Text>
            </View>
          )}

          <View style={ss.valsGrid}>
            {[
              { lbl:"PM2.5", val:(data?.pm25||0).toFixed(1), color:info.color },
              { lbl:"PM10",  val:(data?.pm10||0).toFixed(1), color:C.yellow   },
              { lbl:"CO₂",  val:Math.round(data?.co2||0),   color:C.text2    },
            ].map((item, i) => (
              <View key={i} style={ss.valBox}>
                <Text style={ss.valLbl}>{item.lbl}</Text>
                <Text style={[ss.valNum, { color:item.color }]}>{item.val}</Text>
              </View>
            ))}
          </View>

          <View style={ss.sheetFooter}>
            <LiveDot />
            <Text style={ss.sheetFooterTxt}>
              Actualizado hace {timeSince(data?.timestamp) ?? "---"}
            </Text>
          </View>
        </View>
      )}

      {/* Lista de estaciones si hay más de una */}
      {lista.length > 1 && (
        <View style={ss.stationList}>
          <Text style={ss.stationListTitle}>Red de estaciones</Text>
          {lista.map(([id, st]) => {
            const stInfo = getInfo(st?.pm25 || 0);
            return (
              <TouchableOpacity
                key={id}
                style={[ss.stationItem, selected === id && ss.stationItemActive]}
                onPress={() => setSelected(id)}
                activeOpacity={0.75}
              >
                <View style={[ss.stationDot, { backgroundColor: stInfo.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={ss.stationItemName}>{st?.nombre || id}</Text>
                  <Text style={ss.stationItemSub}>PM2.5: {(st?.pm25||0).toFixed(1)} µg/m³</Text>
                </View>
                <Text style={[ss.stationItemLevel, { color: stInfo.color }]}>
                  {stInfo.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={{ height:24 }} />
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  mapWrap:      { height:300, marginHorizontal:16, marginTop:4, marginBottom:12,
                  borderRadius:16, overflow:"hidden", position:"relative",
                  shadowColor:"#1C2B1E", shadowOffset:{width:0,height:3},
                  shadowOpacity:.08, shadowRadius:10, elevation:3 },
  map:          { flex:1 },
  markerWrap:   { alignItems:"center", shadowOffset:{width:0,height:4},
                  shadowOpacity:.5, shadowRadius:8, elevation:8 },
  markerInner:  { width:40, height:40, borderRadius:20, alignItems:"center",
                  justifyContent:"center", borderWidth:2, borderColor:"#fff" },
  markerTail:   { width:0, height:0, borderLeftWidth:6, borderRightWidth:6,
                  borderTopWidth:8, borderLeftColor:"transparent",
                  borderRightColor:"transparent", marginTop:-1 },
  mapBadge:     { position:"absolute", top:12, left:12, paddingHorizontal:12,
                  paddingVertical:6, borderRadius:10 },
  mapBadgeTxt:  { fontSize:12, fontWeight:"800", color:"#fff" },
  mapBadgeSub:  { fontSize:10, color:"rgba(255,255,255,.8)", marginTop:1 },
  gpsBadge:     { position:"absolute", top:12, right:12, flexDirection:"row",
                  alignItems:"center", gap:4, paddingHorizontal:10,
                  paddingVertical:6, borderRadius:10 },
  gpsBadgeTxt:  { fontSize:10, fontWeight:"700" },
  bottomSheet:   { marginHorizontal:16, marginBottom:12,
                   backgroundColor:C.card, borderRadius:18, padding:14,
                   shadowColor:"#1C2B1E", shadowOffset:{width:0,height:-2},
                   shadowOpacity:.08, shadowRadius:12, elevation:4 },
  sheetTop:      { flexDirection:"row", alignItems:"flex-start", gap:10, marginBottom:8 },
  stationName:   { fontFamily:"Outfit_600SemiBold", fontSize:14, color:C.text, lineHeight:20 },
  stationCoords: { fontFamily:"JetBrainsMono_400Regular", fontSize:9,
                   color:C.text3, marginTop:2 },
  levelPill:     { paddingHorizontal:10, paddingVertical:4, borderRadius:8 },
  levelPillTxt:  { fontFamily:"JetBrainsMono_400Regular", fontSize:9,
                   fontWeight:"700", letterSpacing:1 },
  gpsSinSenal:   { flexDirection:"row", alignItems:"center", gap:6,
                   marginBottom:8 },
  gpsSinSenalTxt:{ fontFamily:"Outfit_400Regular", fontSize:11, color:C.text3 },
  valsGrid:      { flexDirection:"row", gap:8, marginBottom:10 },
  valBox:        { flex:1, backgroundColor:C.bg2, borderRadius:10, padding:10,
                   alignItems:"center" },
  valLbl:        { fontFamily:"JetBrainsMono_400Regular", fontSize:8,
                   color:C.text3, letterSpacing:0.8, marginBottom:4 },
  valNum:        { fontFamily:"JetBrainsMono_400Regular", fontSize:15, fontWeight:"700" },
  sheetFooter:   { flexDirection:"row", alignItems:"center", gap:6 },
  sheetFooterTxt:{ fontFamily:"Outfit_400Regular", fontSize:11, color:C.text3 },
  stationList:   { marginHorizontal:16, marginBottom:12,
                   backgroundColor:C.card, borderRadius:18, padding:14,
                   shadowColor:"#1C2B1E", shadowOffset:{width:0,height:2},
                   shadowOpacity:.06, shadowRadius:8, elevation:2 },
  stationListTitle:{ fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.text2,
                     letterSpacing:0.5, marginBottom:10 },
  stationItem:   { flexDirection:"row", alignItems:"center", gap:10,
                   paddingVertical:10, paddingHorizontal:4 },
  stationItemActive:{ backgroundColor:C.bg2, borderRadius:10, paddingHorizontal:8 },
  stationDot:    { width:8, height:8, borderRadius:4 },
  stationItemName:{ fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.text },
  stationItemSub: { fontFamily:"JetBrainsMono_400Regular", fontSize:10, color:C.text3, marginTop:1 },
  stationItemLevel:{ fontFamily:"JetBrainsMono_400Regular", fontSize:10, fontWeight:"700" },
});