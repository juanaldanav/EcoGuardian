import { PRICING } from "./pricing";

// Cuando tengas tienda real: cambia null por la URL
export const STORE_URL = null;
// export const STORE_URL = "https://tienda.ecoguardian.io/eco-station";

export const STORE_PRODUCT = {
  id:       PRICING.station.id,
  name:     PRICING.station.name,
  price:    PRICING.station.price,
  currency: PRICING.station.currency,
  inStock:  PRICING.station.inStock,
  shipping: PRICING.station.shipping,
};
