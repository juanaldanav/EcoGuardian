import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Card from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import { useComunidad, TIPOS_REPORTE } from "../hooks/useComunidad";
import { C } from "../constants/colors";

function tiempoRelativo(ts) {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return "ahora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

const ESTADO_COLORES = {
  activo: C.green,
  verificado: C.yellow,
  resuelto: C.text3,
};

const ESTADO_LABELS = {
  activo: "Activo",
  verificado: "Verificado",
  resuelto: "Resuelto",
};

export default function ScreenComunidad() {
  const { user, perfil, isAdmin } = useAuth();
  const { reportes, loading, publicar, actualizarEstado } = useComunidad();

  const [modalVisible, setModalVisible] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [descripcion, setDescripcion] = useState("");
  const [publicando, setPublicando] = useState(false);

  function handlePresionarCard(reporte) {
    if (!isAdmin) return;
    Alert.alert("Actualizar estado", `Reporte: ${reporte.descripcion}`, [
      {
        text: "Marcar verificado",
        onPress: () => actualizarEstado(reporte.id, "verificado"),
      },
      {
        text: "Marcar resuelto",
        onPress: () => actualizarEstado(reporte.id, "resuelto"),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  async function handlePublicar() {
    if (!tipoSeleccionado) {
      Alert.alert("Selecciona un tipo de reporte");
      return;
    }
    if (!descripcion.trim()) {
      Alert.alert("Escribe una descripcion");
      return;
    }
    setPublicando(true);
    try {
      await publicar({
        tipo: tipoSeleccionado,
        descripcion: descripcion.trim(),
        autorId: user.uid,
        autorNombre: perfil?.nombre || user.email || "Usuario",
      });
      setModalVisible(false);
      setTipoSeleccionado(null);
      setDescripcion("");
    } catch (e) {
      Alert.alert("Error al publicar", e.message || "Intenta de nuevo");
    } finally {
      setPublicando(false);
    }
  }

  function handleCancelar() {
    setModalVisible(false);
    setTipoSeleccionado(null);
    setDescripcion("");
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.sinSesionWrap}>
          <Card style={styles.sinSesionCard}>
            <Ionicons name="people-outline" size={40} color={C.text3} />
            <Text style={styles.sinSesionTexto}>
              Inicia sesion para ver y publicar reportes de la comunidad
            </Text>
            <TouchableOpacity
              style={styles.btnVerde}
              onPress={() =>
                Alert.alert(
                  "Iniciar sesion",
                  "Ve a Ajustes para iniciar sesion."
                )
              }
            >
              <Text style={styles.btnVerdeTexto}>Iniciar sesion</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.titulo}>Comunidad</Text>
            <Text style={styles.subtitulo}>Reportes de la zona</Text>
          </View>
          <TouchableOpacity
            style={styles.btnVerde}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.btnVerdeTexto}>+ Reportar</Text>
          </TouchableOpacity>
        </View>

        {/* Feed */}
        {loading ? (
          <ActivityIndicator
            color={C.green}
            size="large"
            style={styles.spinner}
          />
        ) : reportes.length === 0 ? (
          <View style={styles.vacioCont}>
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={36}
              color={C.text3}
            />
            <Text style={styles.vacioTexto}>Sin reportes aun</Text>
          </View>
        ) : (
          reportes.map((reporte) => {
            const tipo = TIPOS_REPORTE.find((t) => t.key === reporte.tipo);
            const iconoNombre = tipo?.icon || "alert-circle-outline";
            const iconoColor = tipo?.color || C.text3;
            const estadoColor =
              ESTADO_COLORES[reporte.estado] || C.text3;
            const estadoLabel =
              ESTADO_LABELS[reporte.estado] || reporte.estado;

            return (
              <TouchableOpacity
                key={reporte.id}
                activeOpacity={isAdmin ? 0.6 : 1}
                onPress={() => handlePresionarCard(reporte)}
              >
                <Card style={styles.reporteCard}>
                  {/* Icono tipo */}
                  <View
                    style={[
                      styles.iconoCirculo,
                      { backgroundColor: iconoColor + "22" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={iconoNombre}
                      size={20}
                      color={iconoColor}
                    />
                  </View>

                  {/* Contenido */}
                  <View style={styles.reporteContenido}>
                    <Text style={styles.reporteTipo}>
                      {tipo?.label || reporte.tipo}
                    </Text>
                    <Text style={styles.reporteDesc} numberOfLines={2}>
                      {reporte.descripcion}
                    </Text>
                    <Text style={styles.reporteMeta}>
                      Por {reporte.autorNombre} · hace{" "}
                      {tiempoRelativo(reporte.timestamp)}
                    </Text>
                  </View>

                  {/* Badge estado */}
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: estadoColor + "22" },
                    ]}
                  >
                    <Text style={[styles.badgeTexto, { color: estadoColor }]}>
                      {estadoLabel}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal nuevo reporte */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCancelar}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCont}>
            <Text style={styles.modalTitulo}>Nuevo reporte</Text>

            {/* Selector de tipo */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {TIPOS_REPORTE.map((tipo) => {
                const seleccionado = tipoSeleccionado === tipo.key;
                return (
                  <TouchableOpacity
                    key={tipo.key}
                    style={[
                      styles.chip,
                      seleccionado && {
                        backgroundColor: tipo.color + "22",
                        borderColor: tipo.color + "66",
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => setTipoSeleccionado(tipo.key)}
                  >
                    <MaterialCommunityIcons
                      name={tipo.icon}
                      size={16}
                      color={tipo.color}
                    />
                    <Text
                      style={[styles.chipTexto, { color: tipo.color }]}
                    >
                      {tipo.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Descripcion */}
            <TextInput
              style={styles.input}
              placeholder="Describe que esta pasando..."
              placeholderTextColor={C.text3}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={descripcion}
              onChangeText={setDescripcion}
            />

            {/* Acciones */}
            <TouchableOpacity
              style={[styles.btnVerde, styles.btnPublicar]}
              onPress={handlePublicar}
              disabled={publicando}
            >
              {publicando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnVerdeTexto}>Publicar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnCancelar}
              onPress={handleCancelar}
              disabled={publicando}
            >
              <Text style={styles.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },

  /* Sin sesion */
  sinSesionWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  sinSesionCard: {
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  sinSesionTexto: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: C.text2,
    textAlign: "center",
    lineHeight: 22,
  },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  titulo: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: C.text,
  },
  subtitulo: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: C.text3,
    marginTop: 2,
  },

  /* Botones */
  btnVerde: {
    backgroundColor: C.green,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  btnVerdeTexto: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },

  /* Feed */
  spinner: {
    marginTop: 40,
  },
  vacioCont: {
    alignItems: "center",
    marginTop: 48,
    gap: 10,
  },
  vacioTexto: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: C.text3,
  },

  /* Reporte card */
  reporteCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  iconoCirculo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reporteContenido: {
    flex: 1,
    gap: 2,
  },
  reporteTipo: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: C.text,
  },
  reporteDesc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: C.text2,
    lineHeight: 18,
  },
  reporteMeta: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: C.text3,
    marginTop: 2,
  },
  badge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  badgeTexto: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCont: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitulo: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: C.text,
  },

  /* Chips */
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: C.bg2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipTexto: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
  },

  /* Input */
  input: {
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 12,
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: C.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: C.border,
  },

  /* Botones modal */
  btnPublicar: {
    paddingVertical: 14,
  },
  btnCancelar: {
    alignItems: "center",
    paddingVertical: 10,
  },
  btnCancelarTexto: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: C.text3,
  },
});
