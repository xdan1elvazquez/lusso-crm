import { db } from "@/firebase/config";
import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  where,
  increment 
} from "firebase/firestore";

const COLLECTION_NAME = "patients";

// 🟢 HELPER P-2: Normalización de Teléfono para WhatsApp (México)
// Transforma (55) 1234-5678 -> +5215512345678
function cleanPhone(rawPhone) {
  if (!rawPhone) return "";
  // 1. Quitamos todo lo que no sea número
  const digits = String(rawPhone).replace(/\D/g, "");
  
  // 2. Lógica para México (10 dígitos)
  if (digits.length === 10) {
      // Agregamos prefijo internacional +52 y el 1 para celular
      return `+521${digits}`; 
  }
  // 3. Si ya trae el 52 (12 dígitos) ej: 525512345678 -> +5215512345678
  if (digits.length === 12 && digits.startsWith("52")) {
      return `+${digits.slice(0,2)}1${digits.slice(2)}`; // Aseguramos el '1' intermedio
  }
  // 4. Si ya trae el 521 (13 dígitos)
  if (digits.length === 13 && digits.startsWith("521")) {
      return `+${digits}`;
  }
  
  // Si no cumple formato estándar, devolvemos el original limpio de símbolos
  return digits || rawPhone;
}

export async function setPatientPoints(id, newTotal) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { points: Number(newTotal) });
}

// --- LECTURA ---
export async function getPatients() {
  // 🛡️ SOFT DELETE: Filtramos solo los que NO han sido borrados
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("deletedAt", "==", null), // 👈 Filtro clave
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getPatientById(id) {
  if (!id) return null;
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getPatientsRecommendedBy(patientId) {
  if (!patientId) return [];
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("referredBy", "==", patientId),
    where("deletedAt", "==", null) 
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- ESCRITURA ---
export async function createPatient(data) {
  const now = new Date().toISOString();
  
  // 🟢 APLICAMOS LIMPIEZA P-2 AL CREAR
  const finalPhone = cleanPhone(data.phone);

  const newPatient = {
    firstName: data.firstName?.trim() || "", 
    lastName: data.lastName?.trim() || "",
    
    // Contacto Normalizado
    phone: finalPhone, 
    rawPhone: data.phone?.trim() || "", // Guardamos el original por si acaso
    homePhone: data.homePhone?.trim() || "",
    email: data.email?.trim() || "",
    
    // Demográficos
    dob: data.dob || "", 
    assignedSex: data.assignedSex || "NO_ESPECIFICADO",
    genderExpression: data.genderExpression || "",
    maritalStatus: data.maritalStatus || "",
    religion: data.religion || "",
    reliability: data.reliability || "NO_VALORADA",

    occupation: data.occupation?.trim() || "",
    
    // Marketing
    referralSource: data.referralSource || "Otro", 
    referredBy: data.referredBy || null, 
    points: 0,
    
    // Inicializamos deletedAt en null explícitamente para ayudar al índice
    deletedAt: null, 

    taxData: {
        rfc: data.taxData?.rfc || "",
        razonSocial: data.taxData?.razonSocial || "",
        regimen: data.taxData?.regimen || "",
        cp: data.taxData?.cp || "",
        emailFactura: data.taxData?.emailFactura || data.email || ""
    },
    address: {
        street: data.address?.street || "",
        externalNumber: data.address?.externalNumber || "",
        internalNumber: data.address?.internalNumber || "",
        suburb: data.address?.suburb || "",
        city: data.address?.city || "",
        state: data.address?.state || "",
        zip: data.address?.zip || ""
    },
    
    createdAt: now,
    updatedAt: now,
    lastViewed: now
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newPatient);
  return { id: docRef.id, ...newPatient };
}

export async function updatePatient(id, data) {
  const docRef = doc(db, COLLECTION_NAME, id);
  const now = new Date().toISOString();
  
  const updatePayload = { ...data, updatedAt: now };
  
  // 🟢 APLICAMOS LIMPIEZA P-2 AL EDITAR
  if (updatePayload.phone) {
      updatePayload.rawPhone = updatePayload.phone; // Backup del input original
      updatePayload.phone = cleanPhone(updatePayload.phone); // Normalización
  }

  delete updatePayload.id; 

  await updateDoc(docRef, updatePayload);
  return { id, ...updatePayload };
}

export async function adjustPatientPoints(id, amount) {
  if (!id) return;
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    points: increment(Number(amount))
  });
}

export async function touchPatientView(id) {
  if (!id) return;
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { lastViewed: new Date().toISOString() });
}

// 🛡️ SOFT DELETE IMPLEMENTADO
export async function deletePatient(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { 
      deletedAt: new Date().toISOString() 
  });
}

export async function seedPatientsIfEmpty() {
  const patients = await getPatients();
  if (patients.length > 0) return;

  console.log("Sembrando paciente demo...");
  await createPatient({
      firstName: "Cristian", lastName: "Demo (Nube)", 
      phone: "5512345678", email: "demo@lusso.mx",
      dob: "1990-01-01", assignedSex: "HOMBRE", occupation: "Tester"
  });
  window.location.reload();
}