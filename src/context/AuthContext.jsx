import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getEmployeeByEmail } from "@/services/employeesStorage"; // 👈 IMPORTANTE

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Aquí guardaremos rol y nombre
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
          // 🔍 Buscamos si este email tiene un rol asignado en la DB
          const employeeProfile = await getEmployeeByEmail(currentUser.email);
          
          if (employeeProfile) {
              setUserData(employeeProfile);
          } else {
              // Si no existe, es un usuario "visitante" sin rol (o admin inicial)
              setUserData({ role: "GUEST", name: currentUser.email });
          }
          setUser(currentUser);
      } else {
          setUser(null);
          setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    user,
    userData, // 👈 Exponemos los datos del empleado (rol, nombre)
    role: userData?.role || "GUEST", // Helper rápido
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}