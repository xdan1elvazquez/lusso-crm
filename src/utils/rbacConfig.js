// src/utils/rbacConfig.js

// 1. DEFINICIÓN DE PERMISOS (FLAGS)
// Usamos constantes para evitar errores de dedo
export const PERMISSIONS = {
  // CLÍNICA
  VIEW_DASHBOARD: "view_dashboard",
  VIEW_PATIENTS: "view_patients",
  VIEW_STATISTICS: "view_statistics",
  
  // VENTAS
  VIEW_SALES: "view_sales",
  VIEW_WORK_ORDERS: "view_work_orders",
  VIEW_SALES_HISTORY: "view_sales_history",

  // LOGÍSTICA
  VIEW_INVENTORY: "view_inventory",
  VIEW_LABS: "view_labs",
  VIEW_SUPPLIERS: "view_suppliers",

  // FINANZAS (CRÍTICO)
  VIEW_FINANCE: "view_finance",     // Ver panel general
  VIEW_RECEIVABLES: "view_receivables",
  VIEW_PAYABLES: "view_payables",
  VIEW_EXPENSES: "view_expenses",
  VIEW_PAYROLL: "view_payroll",

  // ADMIN
  VIEW_ADMIN_TEAM: "view_admin_team",
  VIEW_SHIFTS: "view_shifts",
  MANAGE_SETTINGS: "manage_settings",
};

// 2. DICCIONARIO PARA UI (Nombre legible en TeamPage)
export const PERMISSION_LABELS = {
  [PERMISSIONS.VIEW_DASHBOARD]: "Ver Dashboard",
  [PERMISSIONS.VIEW_PATIENTS]: "Gestión de Pacientes",
  [PERMISSIONS.VIEW_STATISTICS]: "Ver Estadísticas",
  [PERMISSIONS.VIEW_SALES]: "Punto de Venta",
  [PERMISSIONS.VIEW_WORK_ORDERS]: "Ver Trabajos",
  [PERMISSIONS.VIEW_SALES_HISTORY]: "Historial Ventas",
  [PERMISSIONS.VIEW_INVENTORY]: "Inventario",
  [PERMISSIONS.VIEW_LABS]: "Laboratorios",
  [PERMISSIONS.VIEW_SUPPLIERS]: "Proveedores",
  [PERMISSIONS.VIEW_FINANCE]: "Finanzas (General)",
  [PERMISSIONS.VIEW_RECEIVABLES]: "Cuentas por Cobrar",
  [PERMISSIONS.VIEW_PAYABLES]: "Cuentas por Pagar",
  [PERMISSIONS.VIEW_EXPENSES]: "Gastos",
  [PERMISSIONS.VIEW_PAYROLL]: "Nómina",
  [PERMISSIONS.VIEW_ADMIN_TEAM]: "Gestión de Equipo",
  [PERMISSIONS.VIEW_SHIFTS]: "Cortes de Caja",
  [PERMISSIONS.MANAGE_SETTINGS]: "Configuraciones",
};

// 3. DEFAULTS POR ROL (Retro-compatibilidad)
// Si un usuario no tiene el campo 'permissions' en DB, se usará esto.
export const ROLE_DEFAULTS = {
  ADMIN: Object.values(PERMISSIONS), // Admin tiene TODO
  DOCTOR: [
    PERMISSIONS.VIEW_DASHBOARD, 
    PERMISSIONS.VIEW_PATIENTS, 
    PERMISSIONS.VIEW_WORK_ORDERS,
    PERMISSIONS.VIEW_SALES_HISTORY // A veces consultan ventas pasadas
  ],
  SALES: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.VIEW_WORK_ORDERS,
    PERMISSIONS.VIEW_SALES_HISTORY,
    PERMISSIONS.VIEW_RECEIVABLES,
    PERMISSIONS.VIEW_INVENTORY
  ],
  LAB: [
    PERMISSIONS.VIEW_WORK_ORDERS,
    PERMISSIONS.VIEW_LABS,
    PERMISSIONS.VIEW_INVENTORY
  ],
  COURIER: [
    PERMISSIONS.VIEW_WORK_ORDERS
  ],
  OTHER: []
};