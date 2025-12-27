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
  writeBatch,
  deleteField,
  limit,      
  startAfter  
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

// 🟢 HELPER: Generador de Código de Referido
function generateReferralCode(firstName, lastName) {
    const f = (firstName || "X").replace(/\s/g, "").toUpperCase().substring(0, 3);
    const l = (lastName || "X").replace(/\s/g, "").toUpperCase().substring(0, 2);
    const rand = Math.floor(100 + Math.random() * 900); // 3 dígitos
    return `${f}${l}${rand}`;
}

// 🟢 HELPER: Capitalizar palabras (Juan carlos -> Juan Carlos)
const capitalizeWords = (str) => {
  if (!str) return "";
  return str.toLowerCase().replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase());
};

// 🟢 HELPER: Normalizar texto para comparaciones internas
export const normalizeString = (str) => {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

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

// --- LECTURA OPTIMIZADA (Paginación y Búsqueda) ---

/**
 * 1. Cargar pacientes paginados (Lotes de X cantidad)
 * @param {Object} lastDoc - Último documento visible (snapshot) de la página anterior
 * @param {number} pageSize - Cantidad de registros a traer (default 20)
 */
export async function getPatientsPage(lastDoc = null, pageSize = 20) {
    let q = query(
        collection(db, COLLECTION_NAME), 
        where("deletedAt", "==", null), 
        orderBy("createdAt", "desc"),
        limit(pageSize)
    );

    if (lastDoc) {
        q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    // Guardamos el documento original en _doc para poder usarlo en la siguiente paginación
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _doc: doc })); 
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    
    return { data, lastVisible, hasMore: snapshot.docs.length === pageSize };
}

/**
 * 2. Buscar pacientes en Servidor (CORREGIDO Y POTENTE)
 * Busca por prefijo ("Starts With") en TODA la base de datos.
 * Funciona escribiendo solo iniciales (ej. "cr" -> Encuentra "Cristian").
 */
export async function searchPatients(term) {
    if (!term) return [];
    const termClean = term.trim();
    
    // Capitalizamos para mejorar la coincidencia (ej: "juan" -> "Juan")
    // Firestore es sensible a mayúsculas, así que intentamos ajustarnos al estándar de guardado.
    const termCap = termClean.charAt(0).toUpperCase() + termClean.slice(1).toLowerCase();

    // Mapa para evitar duplicados (si coincide nombre y apellido)
    const results = new Map(); 

    // A. Búsqueda por Teléfono (Prioridad Alta - Exacta)
    const cleanPh = cleanPhone(termClean);
    if (cleanPh.length > 5) {
        const qPhone = query(
            collection(db, COLLECTION_NAME), 
            where("phone", "==", cleanPh), 
            where("deletedAt", "==", null), 
            limit(5)
        );
        const snapPhone = await getDocs(qPhone);
        snapPhone.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
    }

    // B. Búsqueda por Nombre y Apellido (PREFIJO REAL)
    // Usamos el truco de Unicode '\uf8ff' para simular "Empieza con..."
    if (termClean.length >= 1) {
        
        // 1. Buscar por Nombre (firstName empieza con termCap)
        const qFirst = query(
            collection(db, COLLECTION_NAME), 
            where("firstName", ">=", termCap), 
            where("firstName", "<=", termCap + '\uf8ff'), 
            where("deletedAt", "==", null),
            limit(10)
        );
        const snapFirst = await getDocs(qFirst);
        snapFirst.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));

        // 2. Buscar por Apellido (lastName empieza con termCap)
        const qLast = query(
            collection(db, COLLECTION_NAME), 
            where("lastName", ">=", termCap), 
            where("lastName", "<=", termCap + '\uf8ff'),
            where("deletedAt", "==", null),
            limit(10)
        );
        const snapLast = await getDocs(qLast);
        snapLast.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
    }

    // Retornamos array de valores únicos
    return Array.from(results.values());
}

// --- LECTURA GENERAL (Mantener para Estadísticas) ---
export async function getPatients() {
  // Solo traemos los que NO están borrados (deletedAt == null)
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
    where("referredBy", "==", patientId), 
    where("deletedAt", "==", null) 
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- ESCRITURA (CON AUTO-CAPITALIZACIÓN) ---
export async function createPatient(data) {
  const now = new Date().toISOString();
  const finalPhone = cleanPhone(data.phone);
  
  // 🟢 FORZAMOS CAPITALIZACIÓN AQUÍ
  const finalFirstName = capitalizeWords(data.firstName?.trim());
  const finalLastName = capitalizeWords(data.lastName?.trim());

  const myReferralCode = data.referralCode || generateReferralCode(finalFirstName, finalLastName);

  const newPatient = {
    firstName: finalFirstName, 
    lastName: finalLastName,
    
    curp: data.curp?.trim().toUpperCase() || "", 
    phone: finalPhone, 
    rawPhone: data.phone?.trim() || "", 
    homePhone: data.homePhone?.trim() || "",
    email: data.email?.trim() || "",
    
    dob: data.dob || "", 
    assignedSex: data.assignedSex || "NO_ESPECIFICADO",
    genderExpression: data.genderExpression || "",
    maritalStatus: data.maritalStatus || "",
    religion: data.religion || "",
    reliability: data.reliability || "NO_VALORADA",
    occupation: data.occupation?.trim() || "",
    
    referralCode: myReferralCode, 
    marketingConsent: data.marketingConsent !== false, 
    nextRecallDate: null, 
    lastNpsScore: null,   
    
    referralSource: data.referralSource || "Otro", 
    referredBy: data.referredBy || null, 
    points: 0,
    
    deletedAt: null, 
    deletionStatus: "NONE", // Nuevo: Estatus inicial de eliminación
    createdAt: now,
    updatedAt: now,
    lastViewed: now,

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
  
  // 🟢 FORZAMOS CAPITALIZACIÓN AL EDITAR TAMBIÉN
  if (updatePayload.firstName) updatePayload.firstName = capitalizeWords(updatePayload.firstName.trim());
  if (updatePayload.lastName) updatePayload.lastName = capitalizeWords(updatePayload.lastName.trim());

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

// ⚠️ DEPRECATED: Usar requestDeletePatient o confirmDeletePatient
export async function deletePatient(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { deletedAt: new Date().toISOString() });
}

// --- 🛡️ SISTEMA AVANZADO DE ELIMINACIÓN (NUEVO) ---

/**
 * 1. SOLICITAR ELIMINACIÓN (Para usuarios normales)
 * No borra, solo marca la intención y el motivo.
 */
export const requestDeletePatient = async (id, reason, requestedBy) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            deletionStatus: "REQUESTED", // Bandera visual
            deletionReason: reason,
            deletionRequestedBy: requestedBy, 
            deletionRequestedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("Error solicitando eliminación:", error);
        throw error;
    }
};

/**
 * 2. RECHAZAR ELIMINACIÓN (Para Admin)
 * Limpia las banderas de solicitud y vuelve a la normalidad.
 */
export const rejectDeleteRequest = async (id) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            deletionStatus: "NONE",
            deletionReason: deleteField(), // Borra el campo de la BD
            deletionRequestedBy: deleteField(),
            deletionRequestedAt: deleteField()
        });
        return true;
    } catch (error) {
        console.error("Error rechazando eliminación:", error);
        throw error;
    }
};

/**
 * 3. ELIMINACIÓN REAL (Soft Delete - Solo Admin)
 * Desaparece al paciente de las vistas activas.
 */
export const confirmDeletePatient = async (id) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            deletedAt: new Date().toISOString(), // Soft Delete
            deletionStatus: "DELETED",
            active: false // Flag extra por seguridad
        });
        return true;
    } catch (error) {
        console.error("Error confirmando eliminación:", error);
        throw error;
    }
};

// --- UTILIDADES ---
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

/**
 * 🔍 DETECCIÓN DE DUPLICADOS MEJORADA
 * Busca coincidencias exactas O capitalizadas para evitar duplicados por mayúsculas/minúsculas.
 */
export async function findPotentialDuplicates(newPatientData) {
  const duplicates = [];
  const patientsRef = collection(db, COLLECTION_NAME);

  // 1. BÚSQUEDA POR TELÉFONO
  const phoneToSearch = cleanPhone(newPatientData.phone);
  if (phoneToSearch && phoneToSearch.length > 8) {
    const qPhone = query(patientsRef, where("phone", "==", phoneToSearch), where("deletedAt", "==", null));
    const snapPhone = await getDocs(qPhone);
    snapPhone.forEach(doc => {
      duplicates.push({ id: doc.id, ...doc.data(), matchType: "Teléfono idéntico" });
    });
  }

  // 2. BÚSQUEDA POR EMAIL
  if (newPatientData.email) {
    const qEmail = query(patientsRef, where("email", "==", newPatientData.email), where("deletedAt", "==", null));
    const snapEmail = await getDocs(qEmail);
    snapEmail.forEach(doc => {
      if (!duplicates.find(d => d.id === doc.id)) {
        duplicates.push({ id: doc.id, ...doc.data(), matchType: "Email idéntico" });
      }
    });
  }

  // 3. BÚSQUEDA POR NOMBRE (FLEXIBLE)
  if (newPatientData.firstName && newPatientData.lastName) {
    const rawFirst = newPatientData.firstName.trim();
    const capFirst = capitalizeWords(rawFirst); // "Juan"
    
    // Lista de versiones a buscar (ej: si escribiste "juan", buscamos ["juan", "Juan"])
    const namesToCheck = [rawFirst];
    if (rawFirst !== capFirst) namesToCheck.push(capFirst);

    // Usamos 'in' para buscar cualquiera de las dos versiones en la BD
    const qName = query(patientsRef, where("firstName", "in", namesToCheck), where("deletedAt", "==", null)); 
    const snapName = await getDocs(qName);
    
    const inputLastNorm = normalizeString(newPatientData.lastName);

    snapName.forEach(doc => {
        const p = doc.data();
        // Comparamos el apellido normalizado (sin acentos, minúsculas) para confirmar coincidencia
        if (normalizeString(p.lastName) === inputLastNorm && !duplicates.find(d => d.id === doc.id)) {
             duplicates.push({ id: doc.id, ...p, matchType: "Nombre muy similar" });
        }
    });
  }

  return duplicates;
}