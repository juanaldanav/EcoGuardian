import { initializeApp }  from "firebase/app";
import { getDatabase }    from "firebase/database";
import { getAuth }        from "firebase/auth";
import { getStorage }     from "firebase/storage";

const firebaseConfig = {
  apiKey:        process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  databaseURL:   process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId:     process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);
export const db      = getDatabase(app);
export const auth    = getAuth(app);
export const storage = getStorage(app);
