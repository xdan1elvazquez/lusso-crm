/**
 * Redondeo estándar a 2 decimales para evitar errores de punto flotante en JS.
 * Úsalo para cualquier cálculo monetario antes de guardar o mostrar.
 */
export const roundMoney = (amount) => {
  return Math.round(Number(amount) * 100) / 100;
};

/**
 * Formatea un número como moneda para input (sin símbolos, 2 decimales si necesario).
 * Útil para onBlur inputs.
 */
export const formatMoneyInput = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return "";
  return num.toFixed(2);
};

/**
 * Formatea un número para mostrar en UI con formato de moneda (MXN).
 * Agrega símbolo $ y comas. Ej: $1,234.56
 */
export const formatMoney = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount || 0);
};