const KEY = "lusso_expenses_v1";

const CATEGORIES = [
  "INVENTARIO",   // Compras de mercancía
  "OPERATIVO",    // Luz, Agua, Internet, Renta
  "NOMINA",       // Sueldos
  "MARKETING",    // Publicidad
  "MANTENIMIENTO", // Reparaciones
  "OTROS"
];

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getAllExpenses() {
  return read().sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function createExpense(data) {
  const list = read();
  const newExpense = {
    id: crypto.randomUUID(),
    description: data.description,
    amount: Number(data.amount),
    category: data.category || "OTROS",
    method: data.method || "EFECTIVO", // Importante para corte de caja
    date: data.date || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  write([newExpense, ...list]);
  return newExpense;
}

export function deleteExpense(id) {
  write(read().filter(e => e.id !== id));
}

// Reporte rápido de gastos del mes/día
export function getExpensesReport() {
  const expenses = getAllExpenses();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);

  let todayTotal = 0;
  let monthTotal = 0;
  let cashOutToday = 0; // Dinero que salió físicamente de la caja hoy

  expenses.forEach(e => {
    const eDate = e.date.slice(0, 10);
    const eMonth = e.date.slice(0, 7);

    if (eDate === todayStr) {
        todayTotal += e.amount;
        if (e.method === "EFECTIVO") cashOutToday += e.amount;
    }
    if (eMonth === monthStr) monthTotal += e.amount;
  });

  return { todayTotal, monthTotal, cashOutToday };
}