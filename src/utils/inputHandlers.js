/**
 * src/utils/inputHandlers.js
 * Utilidades para sanitización de inputs (Teléfonos y Moneda).
 */

/**
 * Permite solo dígitos.
 * Si el usuario pega "+52 55...", limpia a "55..."
 * Limita a 10 dígitos (estándar MX).
 */
export const handlePhoneInput = (value) => {
  if (!value) return "";
  
  // 1. Eliminar todo lo que no sea número
  let clean = value.replace(/\D/g, '');

  // 2. Si inicia con 52 y es largo (ej. pegó +52...), quitamos el prefijo país
  if (clean.length > 10 && clean.startsWith('52')) {
      clean = clean.substring(2);
  }

  // 3. Limitar estrictamente a 10 dígitos
  return clean.slice(0, 10);
};

/**
 * Bloquea teclas inválidas en inputs numéricos (negativos, 'e')
 * Uso: <input onKeyDown={preventNegativeKey} ... />
 */
export const preventNegativeKey = (e) => {
  if (["-", "+", "e", "E"].includes(e.key)) {
    e.preventDefault();
  }
};

/**
 * Sanitiza valores de dinero durante el tecleo (onChange).
 * - Convierte a positivo.
 * - Evita nulos o textos raros.
 */
export const sanitizeMoney = (value) => {
    if (value === "" || value === null) return "";
    const num = parseFloat(value);
    // Si no es número, devolvemos vacío para que el input no se rompa
    if (isNaN(num)) return "";
    return Math.abs(num); // Asegura positivo
};

/**
 * Formatea a 2 decimales al perder el foco (onBlur)
 * Ejemplo: 1200.5 -> 1200.50
 */
export const formatMoneyBlur = (value) => {
    if (value === "" || value === null) return "";
    const num = parseFloat(value);
    if (isNaN(num)) return "";
    return num.toFixed(2);
};