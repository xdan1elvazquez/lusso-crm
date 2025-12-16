import { roundMoney } from "@/utils/currency";

/**
 * Calcula los totales del carrito aplicando descuentos.
 * @param {Array} cart - Lista de items {qty, unitPrice}
 * @param {string|number} discountInput - Valor del descuento
 * @param {string} discountType - "AMOUNT" | "PERCENT"
 */
export function calculateCartTotals(cart, discountInput, discountType = "AMOUNT") {
  // 1. Calcular Subtotal Bruto
  const subtotal = roundMoney(
    cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0)
  );

  // 2. Calcular Monto de Descuento
  let discountAmount = 0;
  const discVal = Number(discountInput) || 0;

  if (discountType === "PERCENT") {
    discountAmount = roundMoney(subtotal * (discVal / 100));
  } else {
    discountAmount = roundMoney(discVal);
  }

  // 3. Calcular Total Neto
  // Evitamos negativos por seguridad
  const total = Math.max(0, roundMoney(subtotal - discountAmount));

  return {
    subtotal,
    discountAmount,
    total
  };
}

/**
 * Calcula el porcentaje de comisión bancaria basado en la terminal y plazos.
 * @param {string} terminalId - ID de la terminal seleccionada
 * @param {string} installments - "1", "3", "6", etc.
 * @param {Array} terminalsList - Lista completa de terminales
 * @returns {number} Porcentaje de comisión (ej: 3.5)
 */
export function calculateTerminalFeePercent(terminalId, installments, terminalsList) {
  const term = terminalsList.find((t) => t.id === terminalId);
  if (!term) return 0;

  // Si es 1 pago, usa fee base. Si son meses, busca en rates.
  if (installments === "1") {
    return Number(term.fee) || 0;
  } else {
    return Number(term.rates?.[installments]) || Number(term.fee) || 0;
  }
}

/**
 * Calcula el monto monetario de la comisión.
 * @param {number} amount - Monto a cobrar
 * @param {number} feePercent - Porcentaje de comisión
 */
export function calculateFeeAmount(amount, feePercent) {
  return roundMoney((Number(amount) * Number(feePercent)) / 100);
}