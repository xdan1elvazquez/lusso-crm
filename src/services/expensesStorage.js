import { getCurrentShift } from "./shiftsStorage"; // 👈 IMPORTAR GESTOR

const KEY = "lusso_expenses_v1";

const CATEGORIES = [
  "INVENTARIO", "OPERATIVO", "NOMINA", "MARKETING", "MANTENIMIENTO", "COSTO_VENTA", "OTROS"
];

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function write(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

export function getAllExpenses() {
  return read().sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function createExpense(data) {
  const list = read();
  const currentShift = getCurrentShift(); // 👈 OBTENER TURNO

  const newExpense = {
    id: crypto.randomUUID(),
    description: data.description,
    amount: Number(data.amount),
    category: data.category || "OTROS",
    method: data.method || "EFECTIVO", 
    date: data.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    shiftId: currentShift?.id || null // 👈 VINCULAR AL TURNO
  };
  write([newExpense, ...list]);
  return newExpense;
}

export function deleteExpense(id) {
  write(read().filter(e => e.id !== id));
}

export function getExpensesReport(startDate, endDate) {
  const expenses = getAllExpenses();
  
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

// 👈 NUEVO: Obtener gastos de un turno
export function getExpensesByShift(shiftId) {
    if (!shiftId) return { totalExpense: 0, byMethod: {} };
    
    const expenses = getAllExpenses().filter(e => e.shiftId === shiftId);
    let totalExpense = 0;
    const byMethod = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, CHEQUE: 0, OTRO: 0 };

    expenses.forEach(e => {
        totalExpense += e.amount;
        const m = (e.method || "OTRO").toUpperCase();
        byMethod[m] = (byMethod[m] || 0) + e.amount;
    });

    return { totalExpense, byMethod };
}