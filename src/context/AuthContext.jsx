import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getEmployeeByEmail } from "@/services/employeesStorage"; 
import { getBranchConfig, DEFAULT_BRANCH_ID } from "@/utils/branchesConfig";
import { getBranchSettings } from "@/services/branchStorage";
import { ROLE_DEFAULTS } from "@/utils/rbacConfig"; // 👈 IMPORTAR

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); 
  const [currentBranch, setCurrentBranch] = useState(getBranchConfig(DEFAULT_BRANCH_ID)); 
  const [loading, setLoading] = useState(true);

  // Recarga manual
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
          const employeeProfile = await getEmployeeByEmail(currentUser.email);
          
          if (employeeProfile && employeeProfile.isActive === false) {
              await signOut(auth);
              alert("⛔ Tu acceso ha sido revocado por el administrador.");
              return;
          }

          let finalUserData = employeeProfile || { role: "GUEST", name: currentUser.email };
          
          // --- LÓGICA DE PERMISOS ---
          // Si tiene permisos explícitos en DB, úsalos. Si no, carga los defaults del rol.
          // El Admin siempre tiene todo, aunque se le borren flags accidentalmente.
          const userRole = finalUserData.role || "GUEST";
          const defaultPerms = ROLE_DEFAULTS[userRole] || [];
          
          // Convertimos array de defaults a objeto para fácil acceso si no hay custom
          // O usamos el objeto 'permissions' que viene de la DB (mapa booleano)
          
          // Estrategia: "permissions" en DB es un objeto { view_finance: true, ... }
          // Si existe, se respeta. Si no existe, se construye del default.
          
          let computedPermissions = {};
          
          if (finalUserData.permissions) {
              computedPermissions = finalUserData.permissions;
          } else {
              // Construir desde defaults
              defaultPerms.forEach(p => { computedPermissions[p] = true; });
          }

          // Force Admin override (seguridad extrema)
          if (userRole === "ADMIN") {
              Object.values(ROLE_DEFAULTS.ADMIN).forEach(p => computedPermissions[p] = true);
          }

          finalUserData.computedPermissions = computedPermissions;
          // ---------------------------

          setUserData(finalUserData);

          const userBranchId = finalUserData.branchId || DEFAULT_BRANCH_ID;
          setUser({ ...currentUser, branchId: userBranchId });
          
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
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  // Helper para verificar permisos en UI y Router
  const can = (permissionKey) => {
      if (!userData) return false;
      if (userData.role === "ADMIN") return true; // Admin maestro
      return userData.computedPermissions?.[permissionKey] === true;
  };

  const value = {
    user,
    userData, 
    role: userData?.role || "GUEST",
    permissions: userData?.computedPermissions || {},
    can, // 👈 Exponemos la función
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