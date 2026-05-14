import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useStations } from "../hooks/useFirebase";
import { useAuth }     from "../hooks/useAuth";

const StationContext = createContext(null);

function isDefaultFirmwareName(nombre) {
  return !nombre || /^EcoG [A-F0-9]{6}$/i.test(nombre.trim());
}

export function StationProvider({ children }) {
  const { perfil, isAdmin }   = useAuth();
  const { stations, loading } = useStations();
  const [selectedId, setSelectedId] = useState(null);

  const listaIds = useMemo(
    () => isAdmin
      ? Object.keys(stations).sort()
      : Object.keys(perfil?.estaciones || {}),
    [isAdmin, stations, perfil?.estaciones]
  );

  // Explorador = onboarding completo pero sin dispositivo adoptado
  const isExplorer = !isAdmin && listaIds.length === 0 && !!perfil?.onboardingCompleto;

  // Muestra "Estación N" para nombres default del firmware, sino el nombre real
  function stationLabel(id) {
    const idx    = listaIds.indexOf(id);
    const nombre = stations[id]?.nombre || "";
    return isDefaultFirmwareName(nombre) ? `Estación ${idx + 1}` : nombre;
  }

  useEffect(() => {
    if (listaIds.length > 0 && (!selectedId || !listaIds.includes(selectedId))) {
      setSelectedId(listaIds[0]);
    }
  }, [listaIds.join(",")]);

  return (
    <StationContext.Provider value={{
      selectedId, setSelectedId,
      listaIds, stations, loading,
      isExplorer, stationLabel,
    }}>
      {children}
    </StationContext.Provider>
  );
}

export function useStationContext() {
  return useContext(StationContext);
}
