// --- MÉTODOS DE PAGO ---
export const PAYMENT_METHODS = {
    CASH: "EFECTIVO",
    CARD: "TARJETA",
    TRANSFER: "TRANSFERENCIA",
    CHECK: "CHEQUE",
    POINTS: "PUNTOS",
    OTHER: "OTRO"
};

// --- TIPOS DE PRODUCTO (Inventario/Servicios) ---
export const PRODUCT_KINDS = {
    FRAMES: "FRAMES",
    LENSES: "LENSES",
    CONTACT_LENS: "CONTACT_LENS",
    MEDICATION: "MEDICATION",
    ACCESSORY: "ACCESSORY",
    CONSULTATION: "CONSULTATION",
    SERVICE: "SERVICE",
    OTHER: "OTHER"
};

// --- ESTATUS DE WORK ORDER (Laboratorio) ---
// Fusionamos los estados que usaba tu código (ON_HOLD) con los estándares
export const WO_STATUS = {
    ON_HOLD: "ON_HOLD",       // Retenido (falta pago)
    TO_PREPARE: "TO_PREPARE", // Listo para procesar
    SENT_TO_LAB: "SENT_TO_LAB", // Enviado
    IN_PROCESS: "IN_PROCESS", // En proceso
    READY: "READY",           // Listo para entrega
    DELIVERED: "DELIVERED",   // Entregado al paciente
    CANCELLED: "CANCELLED",
    COMPLETED: "COMPLETED"    // Legacy/Compatible
};

// --- TIPOS DE TARJETA ---
export const CARD_TYPES = {
    DEBIT: "TDD",
    CREDIT: "TDC"
};

// --- CATEGORÍAS DE GASTO ---
export const EXPENSE_CATEGORIES = {
    BANK_COMMISSION: "COMISION_BANCARIA", // Requerido por SalePreparers.js
    SUPPLIER: "PROVEEDOR",
    SERVICE: "SERVICIO",
    REFUND: "DEVOLUCION",
    OTHER: "OTRO"
};

// =========================================================
// NUEVAS CONSTANTES FINANCIERAS (AUDITORÍA & LEDGER)
// =========================================================

export const LEDGER_TYPES = {
    SALE: "SALE",             // Venta inicial
    PAYMENT: "PAYMENT",       // Abono / Pago
    REFUND: "REFUND",         // Devolución de dinero
    ADJUSTMENT: "ADJUSTMENT", // Ajuste de centavos o corrección
    VOID: "VOID"              // Anulación
};

export const AUDIT_ACTIONS = {
    CREATE_SALE: "CREATE_SALE",
    UPDATE_SALE: "UPDATE_SALE",
    ADD_PAYMENT: "ADD_PAYMENT",
    DELETE_PAYMENT: "DELETE_PAYMENT", 
    VOID_SALE: "VOID_SALE",
    RETURN_ITEM: "RETURN_ITEM",
    CLOSE_SHIFT: "CLOSE_SHIFT",
    OPEN_SHIFT: "OPEN_SHIFT",
    UPDATE_STOCK: "UPDATE_STOCK"
};