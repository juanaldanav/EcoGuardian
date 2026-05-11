// ============================================================
//   firebase.js — Configuración y conexión a Firebase
// ============================================================
import { initializeApp } from "firebase/app";
import { getDatabase }   from "firebase/database";

const firebaseConfig = {
  apiKey:      "AIzaSyDWmuLX72KRMMx3BuOzbP7346nrljRLBP0",
  databaseURL: "https://ecoguardian-68553-default-rtdb.firebaseio.com",
  projectId:   "ecoguardian-68553",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);