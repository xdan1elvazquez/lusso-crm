import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getEmployeeByEmail } from "@/services/employeesStorage"; 
import { getBranchConfig, DEFAULT_BRANCH_ID } from "@/utils/branchesConfig";
import { getBranchSettings } from "@/services/branchStorage"; // 👈 IMPORTACIÓN DEL NUEVO SERVICIO

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); 
  // Estado inicial: Carga la config estática (colores) inmediatamente para que no parpadee
  const [currentBranch, setCurrentBranch] = useState(getBranchConfig(DEFAULT_BRANCH_ID)); 
  const [loading, setLoading] = useState(true);

  // 🔥 NUEVA FUNCIÓN: Permite recargar la configuración manualmente
  // Útil cuando guardas cambios en la pantalla "Datos Fiscales"
  const refreshBranchSettings = async () => {
      const branchIdToLoad = user?.branchId || DEFAULT_BRANCH_ID;
      try {
          const freshSettings = await getBranchSettings(branchIdToLoad);
          setCurrentBranch(freshSettings);
          console.log("🔄 Configuración de sucursal recargada desde DB");
      } catch (error) {
          console.error("Error refrescando settings:", error);
      }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
          // 🔍 Buscamos si este email tiene un rol asignado en la DB
          const employeeProfile = await getEmployeeByEmail(currentUser.email);
          let finalUserData = null;

          if (employeeProfile) {
              finalUserData = employeeProfile;
          } else {
              // Si no existe, es un usuario "visitante" sin rol (o admin inicial)
              finalUserData = { role: "GUEST", name: currentUser.email };
          }
          
          setUserData(finalUserData);

          // 🔍 Determinamos la sucursal del usuario
          const userBranchId = finalUserData.branchId || DEFAULT_BRANCH_ID;
          
          // Guardamos el usuario con su branchId inyectado
          setUser({ ...currentUser, branchId: userBranchId });
          
          // 🔥 CARGA DINÁMICA: Obtenemos datos de Firebase (Fiscales + Estáticos)
          // Esto reemplaza la carga estática anterior
          const dynamicBranchConfig = await getBranchSettings(userBranchId);
          setCurrentBranch(dynamicBranchConfig);

      } else {
          setUser(null);
          setUserData(null);
          
          // Al salir, regresamos a la config default (también intentamos cargar dinámicos por si acaso)
          const defaultConfig = await getBranchSettings(DEFAULT_BRANCH_ID);
          setCurrentBranch(defaultConfig);
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
    userData, 
    role: userData?.role || "GUEST",
    currentBranch, 
    refreshBranchSettings, // 👈 Exportamos esto para usarlo en FiscalSettings.jsx
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