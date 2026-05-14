import React, { createContext, useContext, useState, useEffect } from "react";
import { useStations } from "../hooks/useFirebase";
import { useAuth }     from "../hooks/useAuth";

const StationContext = createContext(null);

export function StationProvider({ children }) {
  const { perfil, isAdmin }    = useAuth();
  const { stations, loading }  = useStations();
  const [selectedId, setSelectedId] = useState(null);

  // Admin ve todas; usuario ve solo las suyas
  const listaIds = isAdmin
    ? Object.keys(stations)
    : Object.keys(perfil?.estaciones || {});

  // Auto-seleccionar la primera disponible
  useEffect(() => {
    if (listaIds.length > 0 && (!selectedId || !listaIds.includes(selectedId))) {
      setSelectedId(listaIds[0]);
    }
  }, [listaIds.join(",")]);

  return (
    <StationContext.Provider value={{ selectedId, setSelectedId, listaIds, stations, loading }}>
      {children}
    </StationContext.Provider>
  );
}

export function useStationContext() {
  return useContext(StationContext);
}
