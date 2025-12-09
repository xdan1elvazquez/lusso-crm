// src/utils/authAdmin.js
import { initializeApp, getApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";

/**
 * Crea un usuario en Firebase Auth usando una instancia secundaria
 * para evitar que se cierre la sesión del administrador actual.
 */
export async function createAuthUser(email, password) {
  let secondaryApp = null;
  try {
    // 1. Obtenemos la configuración de la app actual
    const config = getApp().options;
    
    // 2. Inicializamos una app "fantasma" solo para esta operación
    // Usamos un nombre único (ej. timestamp) para evitar conflictos
    const appName = `SecondaryApp-${Date.now()}`;
    secondaryApp = initializeApp(config, appName);
    const auth = getAuth(secondaryApp);

    // 3. Creamos el usuario en esa instancia secundaria
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // 4. Cerramos sesión INMEDIATAMENTE en la app secundaria para limpiar
    // (Aunque createUser loguea automáticamente, solo lo hace en secondaryApp, no en la principal)
    await signOut(auth);

    return userCredential.user.uid;

  } catch (error) {
    console.error("Error creando auth user:", error);
    // Traducir errores comunes de Firebase
    if (error.code === 'auth/email-already-in-use') throw new Error("Este correo ya está registrado.");
    if (error.code === 'auth/weak-password') throw new Error("La contraseña debe tener al menos 6 caracteres.");
    if (error.code === 'auth/invalid-email') throw new Error("El correo no es válido.");
    throw error;
  } finally {
    // 5. Destruimos la app secundaria para liberar memoria
    if (secondaryApp) {
      await deleteApp(secondaryApp); 
    }
  }
}