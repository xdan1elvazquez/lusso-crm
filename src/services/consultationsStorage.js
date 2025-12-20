import { db } from "@/firebase/config";
import { 
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc 
} from "firebase/firestore";
import { logAuditAction } from "./auditStorage";
import { getNextSequence } from "./sequenceStorage"; // 👈 IMPORTANTE: Para Folios Seriados
import { getPhysicalExamDefaults } from "@/utils/physicalExamConfig";
import { getRegionalExamDefaults } from "@/utils/physicalExamRegionsConfig";
import { getNeuroDefaults } from "@/utils/physicalExamNeuroConfig"; 
import { getOphthalmoDefaults } from "@/utils/ophthalmologyConfig";

const COLLECTION_NAME = "consultations";

// Estructuras legacy para compatibilidad
const emptyEyeData = { lids: "", conjunctiva: "", cornea: "", chamber: "", iris: "", lens: "", files: [] };
const emptyFundusData = { vitreous: "", nerve: "", macula: "", vessels: "", retinaPeriphery: "", files: [] };
const emptyPio = { od: "", os: "", time: "", meds: "" };

function normalizeConsultation(docSnapshot) {
  const base = docSnapshot.data();
  const id = docSnapshot.id;
  
  return {
    id,
    // 🟢 FOLIO: Si existe úsalo, si no (viejas) usa ID corto
    folio: base.folio || id.slice(0, 8).toUpperCase(),
    
    patientId: base.patientId,
    visitDate: base.visitDate || base.createdAt,
    type: base.type || "OPHTHALMO",
    status: base.status || "ACTIVE",
    version: Number(base.version) || 1,
    forceUnlock: Boolean(base.forceUnlock),
    addendums: Array.isArray(base.addendums) ? base.addendums : [],
    reason: base.reason || "",
    history: base.history || "",
    systemsReview: base.systemsReview || {},

    // Exploración General
    physicalExam: {
        general: base.physicalExam?.general || getPhysicalExamDefaults(),
        regional: base.physicalExam?.regional || getRegionalExamDefaults(),
        neuro: base.physicalExam?.neuro || getNeuroDefaults()
    },

    // 🟢 Exploración Oftalmológica Robusta
    ophthalmologyExam: base.ophthalmologyExam || getOphthalmoDefaults(),

    // 🟢 Adjuntos
    attachments: Array.isArray(base.attachments) ? base.attachments : [],

    // Legacy (para no romper reportes antiguos)
    vitalSigns: base.vitalSigns || {},
    exam: {
        anterior: { od: {...emptyEyeData, ...(base.exam?.anterior?.od||{})}, os: {...emptyEyeData, ...(base.exam?.anterior?.os||{})}, notes: base.exam?.anterior?.notes||"" },
        tonometry: { ...emptyPio, ...(base.exam?.tonometry||{}) },
        posterior: { od: {...emptyFundusData, ...(base.exam?.posterior?.od||{})}, os: {...emptyFundusData, ...(base.exam?.posterior?.os||{})}, notes: base.exam?.posterior?.notes||"" },
        motility: base.exam?.motility || "",
        gonioscopy: base.exam?.gonioscopy || ""
    },
    
    diagnoses: Array.isArray(base.diagnoses) ? base.diagnoses : [],
    diagnosis: base.diagnosis || "",
    interconsultation: base.interconsultation || {},
    treatment: base.treatment || "",
    prescribedMeds: Array.isArray(base.prescribedMeds) ? base.prescribedMeds : [],
    prognosis: base.prognosis || "",
    notes: base.notes || "",
    
    // 🟢 Objeto SOAP
    soap: base.soap || { s: "", o: "", a: "", p: "" },

    rx: base.rx || {}, 
    createdAt: base.createdAt,
    updatedAt: base.updatedAt
  };
}

export async function getAllConsultations() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("visitDate", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(normalizeConsultation);
}

export async function getConsultationsByPatient(patientId) {
  if (!patientId) return [];
  const q = query(collection(db, COLLECTION_NAME), where("patientId", "==", patientId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(normalizeConsultation).sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
}

export async function getConsultationById(id) {
  if (!id) return null;
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? normalizeConsultation(snapshot) : null;
}

export async function createConsultation(payload) {
  // 🟢 1. OBTENER SIGUIENTE FOLIO SERIADO
  const folioNumber = await getNextSequence("consultations");
  const formattedFolio = `EXP-${String(folioNumber).padStart(6, '0')}`; // Ej: EXP-000001

  const consultationData = {
    // Campos de Identidad
    folio: formattedFolio,
    folioNumber: folioNumber,
    
    patientId: payload.patientId,
    visitDate: payload.visitDate || new Date().toISOString(),
    type: payload.type || "OPHTHALMO",
    status: "ACTIVE",
    version: 1,
    forceUnlock: false,
    addendums: [],
    
    reason: payload.reason || "",
    history: payload.history || "",
    systemsReview: payload.systemsReview || {},
    
    physicalExam: {
        general: getPhysicalExamDefaults(),
        regional: getRegionalExamDefaults(),
        neuro: getNeuroDefaults()
    },
    
    ophthalmologyExam: getOphthalmoDefaults(),
    attachments: [],

    // Legacy
    vitalSigns: payload.vitalSigns || {},
    exam: payload.exam || {},
    
    diagnoses: payload.diagnoses || [],
    diagnosis: payload.diagnosis || "",
    interconsultation: payload.interconsultation || {},
    treatment: payload.treatment || "",
    prescribedMeds: payload.prescribedMeds || [],
    prognosis: payload.prognosis || "",
    notes: payload.notes || "",
    
    soap: payload.soap || { s: "", o: "", a: "", p: "" },

    rx: payload.rx || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), consultationData);
  
  await logAuditAction({ 
      entityType: "CONSULTATION", 
      entityId: docRef.id, 
      action: "CREATE", 
      version: 1, 
      previousState: null, 
      reason: `Nueva Consulta ${formattedFolio}`, 
      user: "Sistema" 
  });
  
  return { id: docRef.id, ...consultationData };
}

export async function updateConsultation(id, payload, reason = "", user = "Usuario") {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error("Consulta no encontrada");
  const current = docSnap.data();
  
  // Regla de 24 horas (Si no está desbloqueada por Admin)
  if (!current.forceUnlock) {
      const createdTime = new Date(current.createdAt).getTime();
      const now = Date.now();
      if ((now - createdTime) / (1000 * 60 * 60) > 24) throw new Error("⛔ CONSULTA CERRADA: Han pasado más de 24 horas.");
  }
  
  // Regla de Estatus (NOM-024)
  if (current.status === 'finished' && !current.forceUnlock) {
      throw new Error("⛔ EXPEDIENTE FIRMADO: No se permiten ediciones.");
  }

  await logAuditAction({ 
      entityType: "CONSULTATION", 
      entityId: id, 
      action: "UPDATE", 
      version: current.version || 1, 
      previousState: current, 
      reason: reason, 
      user: user 
  });
  
  const nextVersion = (current.version || 1) + 1;
  await updateDoc(docRef, { ...payload, version: nextVersion, updatedAt: new Date().toISOString() });
}

export async function addConsultationAddendum(id, text, user = "Usuario") {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error("Consulta no encontrada");
    
    const currentAddendums = docSnap.data().addendums || [];
    
    await updateDoc(docRef, { 
        addendums: [...currentAddendums, { 
            id: crypto.randomUUID(), 
            text, 
            createdAt: new Date().toISOString(), 
            createdBy: user 
        }] 
    });
}

export async function unlockConsultation(id, reason, user = "Gerente") {
    const docRef = doc(db, COLLECTION_NAME, id);
    await logAuditAction({ 
        entityType: "CONSULTATION", 
        entityId: id, 
        action: "UNLOCK", 
        version: 0, 
        previousState: { locked: true }, 
        reason: reason, 
        user: user 
    });
    await updateDoc(docRef, { forceUnlock: true });
}

export async function deleteConsultation(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { status: "VOIDED" });
}

// 👇 (Opcional) Si decides implementar el botón de finalizar después, esta es la función:
export async function finishConsultation(id, user = "Médico") {
  const docRef = doc(db, COLLECTION_NAME, id);
  await logAuditAction({ entityType: "CONSULTATION", entityId: id, action: "FINISH", version: 0, previousState: { status: "ACTIVE" }, reason: "Firma Digital", user: user });
  await updateDoc(docRef, { status: "finished", finishedAt: new Date().toISOString(), finishedBy: user });
}