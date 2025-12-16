// Métodos de Pago
export const PAYMENT_METHODS = {
    CASH: "EFECTIVO",
    CARD: "TARJETA",
    TRANSFER: "TRANSFERENCIA",
    CHECK: "CHEQUE",
    POINTS: "PUNTOS",
    OTHER: "OTRO"
};

// Tipos de Producto (Inventory/Services)
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

// Estatus de Work Order (Laboratorio)
export const WO_STATUS = {
    ON_HOLD: "ON_HOLD",       // Retenido (falta pago)
    TO_PREPARE: "TO_PREPARE", // Listo para procesar
    IN_PROCESS: "IN_PROCESS",
    COMPLETED: "COMPLETED",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED"
};

// Tipos de Tarjeta
export const CARD_TYPES = {
    DEBIT: "TDD",
    CREDIT: "TDC"
};

// Categorías de Gasto Automático
export const EXPENSE_CATEGORIES = {
    BANK_COMMISSION: "COMISION_BANCARIA"
};