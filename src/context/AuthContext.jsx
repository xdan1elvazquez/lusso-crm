import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getEmployeeByEmail } from "@/services/employeesStorage"; 
import { getBranchConfig, DEFAULT_BRANCH_ID } from "@/utils/branchesConfig"; // 👈 NUEVO

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Aquí guardaremos rol y nombre
  const [currentBranch, setCurrentBranch] = useState(getBranchConfig(DEFAULT_BRANCH_ID)); // 👈 ESTADO BRANCH
  const [loading, setLoading] = useState(true);

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
          // Si el empleado tiene 'branchId' asignado, lo usamos. Si no, usamos el default.
          const userBranchId = finalUserData.branchId || DEFAULT_BRANCH_ID;
          
          // Guardamos el usuario con su branchId inyectado para fácil acceso
          setUser({ ...currentUser, branchId: userBranchId });
          
          // Actualizamos la configuración global de la sucursal (colores, logo)
          setCurrentBranch(getBranchConfig(userBranchId));

      } else {
          setUser(null);
          setUserData(null);
          setCurrentBranch(getBranchConfig(DEFAULT_BRANCH_ID));
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
    currentBranch, // 👈 Exponemos la config de la sucursal actual
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