// ============================================================
//   firebase.js — Configuración y conexión a Firebase
// ============================================================
import { initializeApp } from "firebase/app";
import { getDatabase }   from "firebase/database";

const firebaseConfig = {
  apiKey:      process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId:   process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);