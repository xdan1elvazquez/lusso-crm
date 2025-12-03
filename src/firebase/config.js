import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // 👈 Necesario para la base de datos
import { getAuth } from "firebase/auth";           // 👈 Necesario para el login

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

// 👇 ¡ESTAS SON LAS LÍNEAS MÁGICAS QUE FALTAN! 
// Exportamos las herramientas para usarlas en los otros archivos
export const db = getFirestore(app);
export const auth = getAuth(app);