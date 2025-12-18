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
  increment,
  writeBatch
} from "firebase/firestore";

const COLLECTION_NAME = "patients";

// 🟢 HELPER: Normalización de Teléfono (Preservado)
function cleanPhone(rawPhone) {
  if (!rawPhone) return "";
  const digits = String(rawPhone).replace(/\D/g, "");
  
  if (digits.length === 10) return `+521${digits}`; 
  if (digits.length === 12 && digits.startsWith("52")) return `+${digits.slice(0,2)}1${digits.slice(2)}`;
  if (digits.length === 13 && digits.startsWith("521")) return `+${digits}`;
  
  return digits || rawPhone;
}

// 🟢 NUEVO HELPER: Generador de Código de Referido
// Ej: Juan Perez -> JUAPE482 (3 letras nombre + 2 apellido + 3 random)
function generateReferralCode(firstName, lastName) {
    const f = (firstName || "X").replace(/\s/g, "").toUpperCase().substring(0, 3);
    const l = (lastName || "X").replace(/\s/g, "").toUpperCase().substring(0, 2);
    const rand = Math.floor(100 + Math.random() * 900); // 3 dígitos
    return `${f}${l}${rand}`;
}

// --- PUNTOS ---
export async function setPatientPoints(id, newTotal) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { points: Number(newTotal) });
}

export async function adjustPatientPoints(id, amount) {
  if (!id) return;
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    points: increment(Number(amount))
  });
}

// --- LECTURA ---
export async function getPatients() {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("deletedAt", "==", null), 
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
    where("referredBy", "==", patientId), // Buscará por ID del padre
    where("deletedAt", "==", null) 
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- ESCRITURA ---
export async function createPatient(data) {
  const now = new Date().toISOString();
  const finalPhone = cleanPhone(data.phone);

  // Generamos código único si no viene uno (para imports masivos)
  const myReferralCode = data.referralCode || generateReferralCode(data.firstName, data.lastName);

  const newPatient = {
    firstName: data.firstName?.trim() || "", 
    lastName: data.lastName?.trim() || "",
    
    // Contacto
    phone: finalPhone, 
    rawPhone: data.phone?.trim() || "", 
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
    
    // 🚀 CAMPOS PREMIUM (NUEVOS)
    referralCode: myReferralCode, // Su código para compartir
    marketingConsent: data.marketingConsent !== false, // Default true
    nextRecallDate: null, // Se calculará con la primera venta
    lastNpsScore: null,   // Se llenará con encuesta
    
    // Referidos (Quién lo trajo)
    referralSource: data.referralSource || "Otro", 
    referredBy: data.referredBy || null, // ID del paciente que lo recomendó
    points: 0,
    
    // Sistema
    deletedAt: null, 
    createdAt: now,
    updatedAt: now,
    lastViewed: now,

    // Fiscal y Dirección (Sin cambios)
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
    }
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newPatient);
  return { id: docRef.id, ...newPatient };
}

export async function updatePatient(id, data) {
  const docRef = doc(db, COLLECTION_NAME, id);
  const now = new Date().toISOString();
  
  const updatePayload = { ...data, updatedAt: now };
  
  if (updatePayload.phone) {
      updatePayload.rawPhone = updatePayload.phone; 
      updatePayload.phone = cleanPhone(updatePayload.phone); 
  }

  delete updatePayload.id; 

  await updateDoc(docRef, updatePayload);
  return { id, ...updatePayload };
}

export async function touchPatientView(id) {
  if (!id) return;
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { lastViewed: new Date().toISOString() });
}

export async function deletePatient(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { deletedAt: new Date().toISOString() });
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