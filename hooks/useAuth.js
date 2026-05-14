import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { ref, onValue, set } from "firebase/database";
import { auth, db } from "../constants/firebase";

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [perfil, setPerfil]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDB = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (unsubDB) {
        unsubDB();
        unsubDB = null;
      }

      if (!firebaseUser) {
        setPerfil(null);
        setLoading(false);
        return;
      }

      const perfilRef = ref(db, `usuarios/${firebaseUser.uid}`);

      unsubDB = onValue(perfilRef, (snapshot) => {
        if (snapshot.exists()) {
          setPerfil(snapshot.val());
        } else {
          const nuevoPerfil = {
            nombre:               firebaseUser.displayName ?? firebaseUser.email,
            email:                firebaseUser.email,
            rol:                  "usuario",
            creadoEn:             Math.floor(Date.now() / 1000),
            onboardingCompleto:   false,
          };
          set(perfilRef, nuevoPerfil);
          setPerfil(nuevoPerfil);
        }
        setLoading(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubDB) unsubDB();
    };
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  const register = async (email, password, nombre) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await set(ref(db, `usuarios/${cred.user.uid}`), {
      nombre:             nombre.trim() || email,
      email,
      rol:                "usuario",
      creadoEn:           Math.floor(Date.now() / 1000),
      onboardingCompleto: false,
    });
    return cred;
  };

  const isAdmin = perfil?.rol === "admin";

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  return { user, perfil, isAdmin, loading, login, logout, register, resetPassword };
}
