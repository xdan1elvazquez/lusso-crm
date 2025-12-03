import { db } from "@/firebase/config";
import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  increment 
} from "firebase/firestore";

const COLLECTION_NAME = "patients";

// --- LECTURA ---
export async function getPatients() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
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
  const q = query(collection(db, COLLECTION_NAME), where("referredBy", "==", patientId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- ESCRITURA ---
export async function createPatient(data) {
  const now = new Date().toISOString();
  
  const newPatient = {
    firstName: data.firstName?.trim() || "", 
    lastName: data.lastName?.trim() || "",
    phone: data.phone?.trim() || "", 
    email: data.email?.trim() || "",
    dob: data.dob || "", 
    sex: data.sex || "NO_ESPECIFICADO", 
    occupation: data.occupation?.trim() || "",
    referralSource: data.referralSource || "Otro", 
    referredBy: data.referredBy || null, 
    points: 0,
    
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
  delete updatePayload.id; // Evitar duplicar ID

  await updateDoc(docRef, updatePayload);
  return { id, ...updatePayload };
}

// 👇 ESTA ES LA FUNCIÓN QUE FALTABA Y CAUSABA EL ERROR
export async function adjustPatientPoints(id, amount) {
  if (!id) return;
  const docRef = doc(db, COLLECTION_NAME, id);
  // Usamos 'increment' de Firebase para sumar/restar atómicamente
  await updateDoc(docRef, {
    points: increment(Number(amount))
  });
}

// 👇 ESTA TAMBIÉN FALTABA
export async function touchPatientView(id) {
  if (!id) return;
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { lastViewed: new Date().toISOString() });
}

export async function deletePatient(id) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}

// --- UTILIDADES ---
export async function seedPatientsIfEmpty() {
  const patients = await getPatients();
  if (patients.length > 0) return;

  console.log("Sembrando paciente demo...");
  await createPatient({
      firstName: "Cristian", lastName: "Demo (Nube)", 
      phone: "5512345678", email: "demo@lusso.mx",
      dob: "1990-01-01", sex: "HOMBRE", occupation: "Tester"
  });
  window.location.reload();
}