import { initializeApp } from "firebase/app";
// 👇 ÚNICO CAMBIO: Agregamos imports para la caché
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// 🟢 TUS LLAVES SIGUEN IGUAL (NO TOCAR)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

// 👇 ÚNICO CAMBIO: Inicializamos DB con caché en disco (ahorro de lecturas)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// 🟢 TODO ESTO SIGUE IGUAL
export const auth = getAuth(app);
export const storage = getStorage(app);
export const analytics = firebaseConfig.measurementId ? getAnalytics(app) : null;