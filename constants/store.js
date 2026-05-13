import { PRICING } from "./pricing";

// Cuando tengas contacto/tienda real: cambia null por la URL
export const STORE_URL = null;

export const STORE_PLAN = {
  id:       PRICING.suscripcion.id,
  name:     PRICING.suscripcion.name,
  precio:   PRICING.suscripcion.precio,
  currency: PRICING.suscripcion.currency,
  periodo:  PRICING.suscripcion.periodo,
  incluye:  PRICING.suscripcion.incluye,
};
