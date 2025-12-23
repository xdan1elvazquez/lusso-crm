/**
 * src/utils/inputHandlers.js
 * Utilidades para sanitización de inputs (Teléfonos y Moneda).
 */

/**
 * Permite solo dígitos y formatea visualmente.
 * 1. Limpia basura y prefijos (+52) usando TU lógica original.
 * 2. Aplica formato de espacios según lada (2 o 3 dígitos).
 */
export const handlePhoneInput = (value) => {
  if (!value) return "";
  
  // --- TU LÓGICA DE LIMPIEZA ORIGINAL ---
  // 1. Eliminar todo lo que no sea número
  let clean = value.replace(/\D/g, '');

  // 2. Si inicia con 52 y es largo (ej. pegó +52...), quitamos el prefijo país
  if (clean.length > 10 && clean.startsWith('52')) {
      clean = clean.substring(2);
  }

  // 3. Limitar estrictamente a 10 dígitos (Base de datos)
  const raw = clean.slice(0, 10);
  
  // --- CAPA DE FORMATO VISUAL (NUEVO) ---
  if (raw.length === 0) return "";

  // Detectar Ladas de 2 dígitos: CDMX (55, 56), GDL (33), MTY (81)
  const twoDigitAreas = ['55', '56', '33', '81'];
  const prefix2 = raw.substring(0, 2);

  if (twoDigitAreas.includes(prefix2)) {
      // Formato: 55 1234 5678
      if (raw.length < 3) return raw;
      if (raw.length < 7) return `${prefix2} ${raw.substring(2)}`;
      return `${prefix2} ${raw.substring(2, 6)} ${raw.substring(6)}`;
  } else {
      // Formato Resto del País: 442 123 4567
      if (raw.length < 4) return raw;
      if (raw.length < 7) return `${raw.substring(0, 3)} ${raw.substring(3)}`;
      return `${raw.substring(0, 3)} ${raw.substring(3, 6)} ${raw.substring(6)}`;
  }
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