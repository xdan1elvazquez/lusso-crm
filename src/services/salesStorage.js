const KEY = "lusso_sales_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function normalizeSale(raw) {
  const sale = raw && typeof raw === "object" ? raw : {};
  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  const cleanPayments = payments.map((p) => ({
    id: p?.id ?? globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    amount: Number(p?.amount) || 0,
    method: p?.method || "",
    paidAt: p?.paidAt || sale.createdAt || new Date().toISOString(),
  }));
  return {
    id: sale.id,
    patientId: sale.patientId ?? null,
    consultationId: sale.consultationId ?? null,
    category: sale.category || "OTRO",
    description: sale.description || "",
    total: Number(sale.total) || 0,
    payments: cleanPayments,
    createdAt: sale.createdAt || new Date().toISOString(),
  };
}

function withDerived(sale) {
  const paidAmount = sale.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const balance = Math.max(sale.total - paidAmount, 0);
  const status = balance > 0 ? "PENDING" : "PAID";
  return { ...sale, paidAmount, balance, status };
}

export function getAllSales() {
  return read().map((s) => withDerived(normalizeSale(s)));
}

export function getSaleById(id) {
  if (!id) return null;
  const found = read().find((s) => s.id === id);
  return found ? withDerived(normalizeSale(found)) : null;
}

export function getSalesByPatientId(patientId) {
  if (!patientId) return [];
  return read()
    .filter((s) => s.patientId === patientId)
    .map((s) => withDerived(normalizeSale(s)));
}

export function createSale(payload) {
  if (!payload?.patientId) throw new Error("patientId es requerido");
  const list = read();
  const now = new Date().toISOString();
  const payments = Array.isArray(payload.payments) ? payload.payments : [];
  const sale = normalizeSale({
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    patientId: payload.patientId,
    consultationId: payload.consultationId ?? null,
    category: payload.category || "OTRO",
    description: payload.description?.trim?.() || "",
    total: Number(payload.total) || 0,
    payments,
    createdAt: now,
  });
  const next = [sale, ...list];
  write(next);
  return withDerived(sale);
}

export function addPaymentToSale(saleId, payment) {
  if (!saleId) return null;
  const list = read();
  let updated = null;
  const next = list.map((s) => {
    if (s.id !== saleId) return s;
    const normalized = normalizeSale(s);
    const derived = withDerived(normalized);
    const remaining = derived.balance;
    const amount = Math.min(Number(payment?.amount) || 0, Math.max(remaining, 0));
    if (amount <= 0) {
      updated = withDerived(normalized);
      return normalized;
    }
    const pay = {
      id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
      amount,
      method: payment?.method || "",
      paidAt: payment?.paidAt || new Date().toISOString(),
    };
    const nextSale = {
      ...normalized,
      payments: [...normalized.payments, pay],
    };
    updated = withDerived(nextSale);
    return nextSale;
  });
  if (!updated) return null;
  write(next);
  return updated;
}

export function deleteSale(id) {
  const list = read();
  const next = list.filter((s) => s.id !== id);
  write(next);
}
