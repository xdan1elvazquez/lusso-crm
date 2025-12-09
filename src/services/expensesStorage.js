import { db } from "@/firebase/config";
import { 
  collection, addDoc, deleteDoc, getDocs, doc, query, orderBy, where 
} from "firebase/firestore";
import { getCurrentShift } from "./shiftsStorage"; 

const COLLECTION_NAME = "expenses";

const CATEGORIES = [
  "INVENTARIO", "OPERATIVO", "NOMINA", "MARKETING", "MANTENIMIENTO", "COSTO_VENTA", "OTROS"
];

// --- LECTURA ---
export async function getAllExpenses(branchId = "lusso_main") {
  const q = query(
      collection(db, COLLECTION_NAME), 
      where("branchId", "==", branchId), // 👈 Filtro
      orderBy("date", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getExpensesReport(startDate, endDate, branchId = "lusso_main") {
  // Obtenemos gastos filtrados por sucursal
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
    byCategory[cat] = (byCategory[cat] || 0) + e.amount;
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
  // Buscamos turno abierto en ESTA sucursal
  const currentShift = await getCurrentShift(branchId);
  
  const newExpense = {
    branchId: branchId, // 👈 Nuevo campo
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