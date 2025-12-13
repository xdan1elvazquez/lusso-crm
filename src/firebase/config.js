import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; // 👈 1. Importamos Storage

const firebaseConfig = {
  apiKey: "AIzaSyBMf9pWpfCvJ-E7Oalz3uIGW3lKlF1GhDA",
  authDomain: "lusso-crm-demo.firebaseapp.com",
  projectId: "lusso-crm-demo",
  storageBucket: "lusso-crm-demo.firebasestorage.app",
  messagingSenderId: "591975331408",
  appId: "1:591975331408:web:464093a97bf8e16242c355",
  measurementId: "G-MDFX6TK7RH"
};

// Inicializamos la app
const app = initializeApp(firebaseConfig);

// Exportamos las herramientas
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app); // 👈 2. Exportamos storage para usarlo en tickets