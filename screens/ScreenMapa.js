// ============================================================
//   ScreenMapa.js — Mapa con ubicación en tiempo real
//   El marcador se mueve cuando el ESP32 manda nuevas coords
// ============================================================
import React, { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform } from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import Card      from "../components/Card";
import SensorRow from "../components/SensorRow";
import LiveDot   from "../components/LiveDot";
import { useStation } from "../hooks/useFirebase";
import { getInfo, timeSince } from "../utils/helpers";
import { C } from "../constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Coordenadas por defecto — centro de Culiacán
const LAT_DEFAULT = 24.7931;
const LNG_DEFAULT = -107.3939;

// Estilo oscuro del mapa
const MAP_STYLE = [
  { elementType:"geometry",            stylers:[{ color:"#0d1a0f" }] },
  { elementType:"labels.text.fill",    stylers:[{ color:"#4a6b4e" }] },
  { elementType:"labels.text.stroke",  stylers:[{ color:"#0d1a0f" }] },
  { featureType:"road", elementType:"geometry",        stylers:[{ color:"#1a2e1e" }] },
  { featureType:"road", elementType:"geometry.stroke", stylers:[{ color:"#0d1a0f" }] },
  { featureType:"road.highway", elementType:"geometry",stylers:[{ color:"#1e3d24" }] },
  { featureType:"water",        elementType:"geometry", stylers:[{ color:"#0d1a0f" }] },
  { featureType:"poi",          elementType:"geometry", stylers:[{ color:"#111a14" }] },
  { featureType:"transit",      elementType:"geometry", stylers:[{ color:"#111a14" }] },
  { featureType:"administrative",elementType:"geometry",stylers:[{ color:"#1a2e1e" }] },
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
            title={data?.nombre || "AeroCentinela"}
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
          <Text style={ss.mapBadgeTxt}>{info.emoji} {info.label}</Text>
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
              ? `✓ GPS real · ${data?.satelites||0} sats`
              : "Ubicación por defecto"
            }
          </Text>
        </View>
      </View>

      {/* ── INFO ESTACIÓN ───────────────────────────── */}
      <Card style={ss.card}>
        <View style={ss.cardHeader}>
          <Text style={ss.cardTitle}>📍 Ubicación de la estación</Text>
          <LiveDot />
        </View>

        {/* Aviso si el GPS no tiene señal */}
        {!data?.gps_valido && (
          <View style={ss.gpsSinSenal}>
            <MaterialCommunityIcons name="satellite-variant" size={14} color={C.orange} />
            <Text style={ss.gpsSinSenalTxt}>
              GPS buscando señal — mostrando ubicación por defecto de Culiacán.
              Pon el dispositivo afuera para obtener coordenadas reales.
            </Text>
          </View>
        )}

        <SensorRow
          icon="crosshairs-gps"
          label="Latitud"
          value={coords.lat.toFixed(6)}
          unit="°N"
          color={data?.gps_valido ? C.green : C.text3}
        />
        <SensorRow
          icon="crosshairs-gps"
          label="Longitud"
          value={Math.abs(coords.lng).toFixed(6)}
          unit="°O"
          color={data?.gps_valido ? C.green : C.text3}
        />
        <SensorRow
          icon="satellite-variant"
          label="Satélites"
          value={data?.satelites || 0}
          unit="conectados"
          color={data?.gps_valido ? C.green : C.text3}
        />
        <SensorRow
          icon="map-marker"
          label="Estación"
          value={data?.nombre || "Estacion 1"}
          unit=""
          color={C.green}
        />
        <SensorRow
          icon="clock-outline"
          label="Última actualización"
          value={timeSince(data?.timestamp, data?.receivedAt)}
          unit=""
          color={C.text2}
        />
      </Card>

      <View style={{ height:24 }} />
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  mapWrap:      { height:300, marginHorizontal:16, marginTop:4, marginBottom:12,
                  borderRadius:16, overflow:"hidden", borderWidth:1, borderColor:C.border },
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
  card:         { marginHorizontal:16, marginBottom:12 },
  cardHeader:   { flexDirection:"row", alignItems:"center", justifyContent:"space-between",
                  marginBottom:12 },
  cardTitle:    { fontSize:13, fontWeight:"700", color:C.text },
  gpsSinSenal:  { flexDirection:"row", alignItems:"flex-start", gap:8,
                  backgroundColor:C.orange+"15", borderRadius:10, padding:10,
                  marginBottom:10, borderWidth:1, borderColor:C.orange+"33" },
  gpsSinSenalTxt:{ flex:1, fontSize:11, color:C.orange, lineHeight:16 },
});