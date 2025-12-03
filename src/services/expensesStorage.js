import { db } from "@/firebase/config";
import { 
  collection, addDoc, deleteDoc, getDocs, doc, query, orderBy, where 
} from "firebase/firestore";
import { getCurrentShift } from "./shiftsStorage"; // 👈 Usamos el gestor de turnos nuevo

const COLLECTION_NAME = "expenses";

const CATEGORIES = [
  "INVENTARIO", "OPERATIVO", "NOMINA", "MARKETING", "MANTENIMIENTO", "COSTO_VENTA", "OTROS"
];

// --- LECTURA ---
export async function getAllExpenses() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 👈 Reporte para la página de Finanzas
export async function getExpensesReport(startDate, endDate) {
  // Nota: En una app real, haríamos el filtro en la query de Firestore.
  // Para la demo, bajamos los gastos y filtramos en memoria (igual que antes) para simplificar índices.
  const expenses = await getAllExpenses();
  
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

// 👈 Reporte para el Corte de Caja (ShiftPage)
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
export async function createExpense(data) {
  // 1. Obtener turno activo (desde Firebase)
  const currentShift = await getCurrentShift();
  
  // Opcional: Validar si hay turno abierto
  // if (!currentShift) throw new Error("No hay turno abierto para registrar gastos.");

  const newExpense = {
    description: data.description,
    amount: Number(data.amount),
    category: data.category || "OTROS",
    method: data.method || "EFECTIVO", 
    date: data.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    shiftId: currentShift?.id || null // 👈 Vinculación segura
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newExpense);
  return { id: docRef.id, ...newExpense };
}

export async function deleteExpense(id) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}