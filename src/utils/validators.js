// 1. IMPORTAMOS "EL MENÚ" (Tus opciones definidas)
import { SPH_VALUES, CYL_VALUES, AXIS_VALUES } from './rxOptions';

// Validador de Pacientes
export const validatePatient = (patient) => {
  const errors = {};
  
  if (!patient.firstName?.trim()) {
    errors.firstName = "El nombre es obligatorio";
  }
  if (!patient.lastName?.trim()) {
    errors.lastName = "El apellido es obligatorio";
  }
  
  // --- CAMBIO: Validación estricta 10 dígitos ---
  if (patient.phone) {
    const cleanPhone = patient.phone.replace(/\D/g, ''); 
    if (cleanPhone.length > 0 && cleanPhone.length !== 10) {
      errors.phone = "El teléfono debe tener 10 dígitos exactos";
    }
  }
  // ----------------------------------------------

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Validador de Receta (Rx) - AQUÍ USAMOS TU rxOptions.js
export const validateRx = (rx) => {
  const errors = {};

  // Función auxiliar para checar si un valor está en la lista permitida
  const isValidOption = (list, value) => {
    if (value === null || value === "") return true; // Permitir vacíos
    return list.includes(Number(value));
  };

  // Validar Ojo Derecho (OD)
  if (!isValidOption(SPH_VALUES, rx.od.sph)) {
    errors.od_sph = "Esfera OD fuera de rango permitido";
  }
  if (!isValidOption(CYL_VALUES, rx.od.cyl)) {
    errors.od_cyl = "Cilindro OD inválido";
  }
  
  // REGLA DE ORO: Si hay Cilindro, a fuerza debe haber Eje
  const hasCylOD = rx.od.cyl !== null && rx.od.cyl !== 0;
  const hasAxisOD = rx.od.axis !== null;
  
  if (hasCylOD && !hasAxisOD) {
    errors.od_axis = "El Eje OD es requerido si hay cilindro";
  }

  // Validar Ojo Izquierdo (OS/OI) - Misma lógica
  if (!isValidOption(SPH_VALUES, rx.os.sph)) {
    errors.os_sph = "Esfera OI fuera de rango permitido";
  }
  if (!isValidOption(CYL_VALUES, rx.os.cyl)) {
    errors.os_cyl = "Cilindro OI inválido";
  }

  const hasCylOS = rx.os.cyl !== null && rx.os.cyl !== 0;
  const hasAxisOS = rx.os.axis !== null;

  if (hasCylOS && !hasAxisOS) {
    errors.os_axis = "El Eje OI es requerido si hay cilindro";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};