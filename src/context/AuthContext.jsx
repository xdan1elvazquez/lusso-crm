import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
// 👇 IMPORTANTE: Agregamos getEmployeeById
import { getEmployeeByEmail, getEmployeeById } from "@/services/employeesStorage"; 
import { getBranchConfig, DEFAULT_BRANCH_ID } from "@/utils/branchesConfig";
import { getBranchSettings } from "@/services/branchStorage";
import { ROLE_DEFAULTS } from "@/utils/rbacConfig"; 

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); 
  const [currentBranch, setCurrentBranch] = useState(getBranchConfig(DEFAULT_BRANCH_ID)); 
  const [loading, setLoading] = useState(true);

  // Recarga manual de configuración (útil si cambias de sucursal)
  const refreshBranchSettings = async () => {
      const branchIdToLoad = user?.branchId || DEFAULT_BRANCH_ID;
      try {
          const freshSettings = await getBranchSettings(branchIdToLoad);
          setCurrentBranch(freshSettings);
      } catch (error) { 
          console.warn("Error refrescando sucursal, usando cache local", error); 
      }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
            // 1. INTENTO PRIMARIO: Buscar por UID (Compatible con reglas estrictas)
            let employeeProfile = await getEmployeeById(currentUser.uid);
            
            // 2. FALLBACK: Si no existe por UID, buscar por Email (Legacy)
            if (!employeeProfile) {
                try {
                    employeeProfile = await getEmployeeByEmail(currentUser.email);
                    if (employeeProfile) {
                        console.warn("⚠️ Usuario encontrado por Email, no por UID. Se recomienda resguardar para alinear IDs.");
                    }
                } catch (e) {
                    console.warn("No se pudo leer por email (posible restricción de seguridad).", e);
                }
            }
            
            // Verificación de cuenta desactivada
            if (employeeProfile && employeeProfile.isActive === false) {
                await signOut(auth);
                alert("⛔ Tu acceso ha sido revocado por el administrador.");
                return; // Cortamos ejecución aquí
            }

            let finalUserData = employeeProfile || { role: "GUEST", name: currentUser.email };
            
            // --- LÓGICA DE PERMISOS (RBAC) ---
            const userRole = finalUserData.role || "GUEST";
            const defaultPerms = ROLE_DEFAULTS[userRole] || [];
            
            let computedPermissions = {};
            
            if (finalUserData.permissions) {
                // Si tiene permisos personalizados en DB, se respetan
                computedPermissions = finalUserData.permissions;
            } else {
                // Si no, construimos desde los defaults del rol
                defaultPerms.forEach(p => { computedPermissions[p] = true; });
            }

            // Force Admin override (El Admin siempre tiene todo, seguridad extrema)
            if (userRole === "ADMIN") {
                if (ROLE_DEFAULTS.ADMIN) {
                    Object.values(ROLE_DEFAULTS.ADMIN).forEach(p => computedPermissions[p] = true);
                }
            }

            finalUserData.computedPermissions = computedPermissions;
            // ---------------------------------

            setUserData(finalUserData);

            const userBranchId = finalUserData.branchId || DEFAULT_BRANCH_ID;
            setUser({ ...currentUser, branchId: userBranchId });
            
            // Carga de configuración de sucursal protegida
            try {
                const dynamicBranchConfig = await getBranchSettings(userBranchId);
                setCurrentBranch(dynamicBranchConfig);
            } catch (branchError) {
                console.warn("No se pudo cargar config de sucursal remota. Usando default local.", branchError);
                setCurrentBranch(getBranchConfig(userBranchId));
            }

        } else {
            // CASO: NO LOGUEADO (GUEST)
            setUser(null);
            setUserData(null);
            
            try {
                // Intentamos cargar la configuración base (para pintar el login bonito)
                const defaultConfig = await getBranchSettings(DEFAULT_BRANCH_ID);
                setCurrentBranch(defaultConfig);
            } catch (error) {
                // Si falla (ej. reglas de seguridad estrictas), usamos la local
                console.warn("Usando tema default local para Login.");
                setCurrentBranch(getBranchConfig(DEFAULT_BRANCH_ID));
            }
        }
      } catch (globalError) {
        console.error("Error crítico en AuthContext:", globalError);
      } finally {
        // 🟢 ESTO ES VITAL: Pase lo que pase, quitamos el Loading para no trabar la app
        setLoading(false);
      }
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
      if (userData.role === "ADMIN") return true; // Admin maestro pasa siempre
      return userData.computedPermissions?.[permissionKey] === true;
  };

  const value = {
    user,
    userData, 
    role: userData?.role || "GUEST",
    permissions: userData?.computedPermissions || {},
    can, 
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