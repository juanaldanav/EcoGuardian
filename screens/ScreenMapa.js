// ============================================================
//   ScreenMapa.js — Mapa con ubicación en tiempo real
//   El marcador se mueve cuando el ESP32 manda nuevas coords
// ============================================================
import React, { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform } from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import LiveDot   from "../components/LiveDot";
import { useStation } from "../hooks/useFirebase";
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
  const { data }  = useStation();
  const mapRef    = useRef(null);

  // Coordenadas reactivas — se actualizan cuando Firebase cambia
  const [coords, setCoords] = useState({
    lat: LAT_DEFAULT,
    lng: LNG_DEFAULT,
  });

  const info = getInfo(data?.pm25 || 0);

  // ── Actualiza coords cuando llegan de Firebase ────────────
  useEffect(() => {
    if (data?.lat && data?.lng && data.lat !== 0 && data.lng !== 0) {
      const nuevaLat = data.lat;
      const nuevaLng = data.lng;

      // Actualiza el estado de coordenadas
      setCoords({ lat: nuevaLat, lng: nuevaLng });

      // Mueve el mapa suavemente a la nueva posición
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude:      nuevaLat,
            longitude:     nuevaLng,
            latitudeDelta: 0.008,
            longitudeDelta:0.008,
          },
          1200 // Animación de 1.2 segundos
        );
      }
    }
  }, [data?.lat, data?.lng, data?.gps_valido]);

  return (
    <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>

      {/* ── MAPA ────────────────────────────────────── */}
      <View style={ss.mapWrap}>
        <MapView
          ref={mapRef}
          style={ss.map}
          customMapStyle={MAP_STYLE}
          initialRegion={{
            latitude:      coords.lat,
            longitude:     coords.lng,
            latitudeDelta: 0.015,
            longitudeDelta:0.015,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {/* Círculo de área */}
          <Circle
            center={{ latitude:coords.lat, longitude:coords.lng }}
            radius={200}
            fillColor={info.color + "22"}
            strokeColor={info.color + "88"}
            strokeWidth={2}
          />

          {/* Marcador — usa coords del estado para moverse */}
          <Marker
            coordinate={{ latitude:coords.lat, longitude:coords.lng }}
            title={data?.nombre || "EcoGuardian"}
            description={`PM2.5: ${(data?.pm25||0).toFixed(1)} µg/m³ — ${info.label}`}
            tracksViewChanges={true}
          >
            <View style={[ss.markerWrap, { shadowColor:info.color }]}>
              <View style={[ss.markerInner, { backgroundColor:info.color }]}>
                <MaterialCommunityIcons name="air-filter" size={16} color="#fff" />
              </View>
              <View style={[ss.markerTail, { borderTopColor:info.color }]} />
            </View>
          </Marker>
        </MapView>

        {/* Badge nivel */}
        <View style={[ss.mapBadge, { backgroundColor:info.color+"EE" }]}>
          <Text style={ss.mapBadgeTxt}>{info.label}</Text>
          <Text style={ss.mapBadgeSub}>PM2.5: {(data?.pm25||0).toFixed(1)} µg/m³</Text>
        </View>

        {/* Badge GPS — muestra si es real o por defecto */}
        <View style={[
          ss.gpsBadge,
          { backgroundColor: data?.gps_valido ? C.green+"EE" : "#333333EE" }
        ]}>
          <MaterialCommunityIcons
            name="satellite-variant"
            size={12}
            color={data?.gps_valido ? "#fff" : C.text3}
          />
          <Text style={[ss.gpsBadgeTxt, { color: data?.gps_valido ? "#fff" : C.text3 }]}>
            {data?.gps_valido
              ? `GPS · ${data?.satelites||0} sats`
              : data?.lat ? "Última posición"
              : "Sin GPS"
            }
          </Text>
        </View>
      </View>

      {/* ── BOTTOM SHEET ESTACIÓN ───────────────────── */}
      <View style={ss.bottomSheet}>
        {/* Cabecera: nombre + nivel pill */}
        <View style={ss.sheetTop}>
          <View style={{ flex:1 }}>
            <Text style={ss.stationName}>{data?.nombre || "Estación 1"}</Text>
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

        {/* Aviso GPS sin señal */}
        {!data?.gps_valido && (
          <View style={ss.gpsSinSenal}>
            <MaterialCommunityIcons name="satellite-variant" size={13} color={C.orange} />
            <Text style={ss.gpsSinSenalTxt}>
              {data?.lat ? "Última posición conocida" : "GPS buscando señal"}
            </Text>
          </View>
        )}

        {/* Grid de valores */}
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

        {/* Última actualización */}
        <View style={ss.sheetFooter}>
          <LiveDot />
          <Text style={ss.sheetFooterTxt}>
            Actualizado hace {timeSince(data?.receivedAt) ?? "---"}
          </Text>
        </View>
      </View>

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
});