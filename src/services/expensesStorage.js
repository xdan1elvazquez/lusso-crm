import { db } from "@/firebase/config";
import { 
  collection, addDoc, deleteDoc, getDocs, doc, query, orderBy, where 
} from "firebase/firestore";
import { getCurrentShift } from "./shiftsStorage"; 

const COLLECTION_NAME = "expenses";

// 🟢 TODAS LAS CATEGORÍAS (Lab, Taller y Comisiones)
const CATEGORIES = [
  "INVENTARIO", 
  "OPERATIVO", 
  "NOMINA", 
  "MARKETING", 
  "MANTENIMIENTO", 
  "COSTO_VENTA", 
  "COSTO_LAB",        // Para pagar a Davila/Externos
  "COSTO_TALLER",     // Para pagar bisel/montaje
  "COMISION_BANCARIA",// Para el gasto automático de la terminal
  "OTROS"
];

// --- LECTURA ---
export async function getAllExpenses(branchId = "lusso_main") {
  const q = query(
      collection(db, COLLECTION_NAME), 
      where("branchId", "==", branchId), 
      orderBy("date", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getExpensesReport(startDate, endDate, branchId = "lusso_main") {
  const expenses = await getAllExpenses(branchId);
  
  let totalExpense = 0;
  let cashOut = 0; 
  let byCategory = {};

  CATEGORIES.forEach(c => byCategory[c] = 0);

  expenses.forEach(e => {
    const eDate = e.date.slice(0, 10);
    
    if (startDate && eDate < startDate) return;
    if (endDate && eDate > endDate) return;

    totalExpense += e.amount;
    
    if (e.method === "EFECTIVO") {
        cashOut += e.amount;
    }
    
    const cat = e.category || "OTROS";
    if (byCategory[cat] !== undefined) {
        byCategory[cat] += e.amount;
    } else {
        byCategory["OTROS"] += e.amount;
    }
  });

  return { totalExpense, cashOut, byCategory };
}

export async function getExpensesByShift(shiftId) {
    if (!shiftId) return { totalExpense: 0, byMethod: {} };
    const q = query(collection(db, COLLECTION_NAME), where("shiftId", "==", shiftId));
    const snapshot = await getDocs(q);
    
    let totalExpense = 0;
    const byMethod = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, CHEQUE: 0, OTRO: 0 };

    snapshot.forEach(doc => {
        const e = doc.data();
        totalExpense += e.amount;
        const m = (e.method || "OTRO").toUpperCase();
        if (byMethod[m] !== undefined) {
            byMethod[m] += e.amount;
        } else {
            byMethod.OTRO += e.amount;
        }
    });

    return { totalExpense, byMethod };
}

// --- ESCRITURA ---
export async function createExpense(data, branchId = "lusso_main") {
  const currentShift = await getCurrentShift(branchId);
  
  const newExpense = {
    branchId: branchId,
    description: data.description,
    amount: Number(data.amount),
    category: data.category || "OTROS",
    method: data.method || "EFECTIVO", 
    date: data.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    shiftId: currentShift?.id || null 
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newExpense);
  return { id: docRef.id, ...newExpense };
}

export async function deleteExpense(id) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}