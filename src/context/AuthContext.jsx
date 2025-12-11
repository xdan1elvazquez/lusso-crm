import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getEmployeeByEmail } from "@/services/employeesStorage"; 
import { getBranchConfig, DEFAULT_BRANCH_ID } from "@/utils/branchesConfig";
import { getBranchSettings } from "@/services/branchStorage"; 

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); 
  const [currentBranch, setCurrentBranch] = useState(getBranchConfig(DEFAULT_BRANCH_ID)); 
  const [loading, setLoading] = useState(true);

  // Recarga manual de configuración (útil para Admin)
  const refreshBranchSettings = async () => {
      const branchIdToLoad = user?.branchId || DEFAULT_BRANCH_ID;
      try {
          const freshSettings = await getBranchSettings(branchIdToLoad);
          setCurrentBranch(freshSettings);
      } catch (error) { console.error(error); }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
          // 1. Buscamos perfil en base de datos
          const employeeProfile = await getEmployeeByEmail(currentUser.email);
          
          // 🚨 SEGURIDAD: Si existe perfil y está desactivado, cerrar sesión
          if (employeeProfile && employeeProfile.isActive === false) {
              await signOut(auth);
              alert("⛔ Tu acceso ha sido revocado por el administrador.");
              return;
          }

          let finalUserData = employeeProfile || { role: "GUEST", name: currentUser.email };
          setUserData(finalUserData);

          // 2. Definir Sucursal
          const userBranchId = finalUserData.branchId || DEFAULT_BRANCH_ID;
          setUser({ ...currentUser, branchId: userBranchId });
          
          // 3. Cargar Configuración Visual/Fiscal
          const dynamicBranchConfig = await getBranchSettings(userBranchId);
          setCurrentBranch(dynamicBranchConfig);

      } else {
          setUser(null);
          setUserData(null);
          const defaultConfig = await getBranchSettings(DEFAULT_BRANCH_ID);
          setCurrentBranch(defaultConfig);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    // Verificación previa opcional (Auth de Firebase ya valida pass, 
    // pero el useEffect arriba valida el estado 'isActive')
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
    refreshBranchSettings,
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