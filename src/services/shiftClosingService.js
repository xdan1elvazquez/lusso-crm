import { getSalesMetricsByShift } from "./salesStorage";
import { getExpensesByShift } from "./expensesStorage"; // Importante: Gastos
import { closeShift, getShiftById } from "./shiftsStorage";
import { logAuditAction } from "./auditStorage";
import { AUDIT_ACTIONS } from "@/utils/constants";
import { roundMoney } from "@/utils/currency";

export async function performShiftClosing(shiftId, declaredAmounts, notes = "") {
    if (!shiftId) throw new Error("ID de turno requerido");

    // 1. Obtener datos del turno
    const shift = await getShiftById(shiftId);
    if (!shift) throw new Error("Turno no encontrado");
    if (shift.status === "CLOSED") throw new Error("El turno ya está cerrado");

    // 2. Calcular métricas (VENTAS + GASTOS)
    const sales = await getSalesMetricsByShift(shiftId);
    const expenses = await getExpensesByShift(shiftId);
    
    // Cálculo de Esperados (La Verdad del Sistema)
    const expected = {
        cash: roundMoney((Number(shift.initialCash)||0) + (sales.incomeByMethod.EFECTIVO||0) - (expenses.byMethod.EFECTIVO||0)),
        card: roundMoney(sales.incomeByMethod.TARJETA||0),
        transfer: roundMoney((sales.incomeByMethod.TRANSFERENCIA||0) - (expenses.byMethod.TRANSFERENCIA||0)),
        other: roundMoney((sales.incomeByMethod.OTRO||0) + (sales.incomeByMethod.PUNTOS||0))
    };

    const totalExpected = expected.cash + expected.card + expected.transfer + expected.other;

    // 3. Totales Declarados (Input Humano)
    const declared = {
        cash: Number(declaredAmounts.cash) || 0,
        card: Number(declaredAmounts.card) || 0,
        transfer: Number(declaredAmounts.transfer) || 0,
        other: Number(declaredAmounts.other) || 0
    };
    const totalDeclared = declared.cash + declared.card + declared.transfer + declared.other;

    // 4. Diferencias
    const diff = {
        cash: roundMoney(declared.cash - expected.cash),
        card: roundMoney(declared.card - expected.card),
        transfer: roundMoney(declared.transfer - expected.transfer),
        other: roundMoney(declared.other - expected.other)
    };
    const totalDiff = diff.cash + diff.card + diff.transfer + diff.other;

    // 5. Construir Snapshot Inmutable
    const snapshot = {
        generatedAt: new Date().toISOString(),
        initialCash: shift.initialCash,
        sales: sales.incomeByMethod,
        expenses: expenses.byMethod,
        finalExpected: expected,
        finalDeclared: declared,
        finalDiff: diff
    };

    // 6. Ejecutar Cierre en BD
    await closeShift(shiftId, {
        expected: expected,
        difference: diff,
        snapshot: snapshot,
        notes: notes
    });

    // 7. Auditoría
    let auditReason = "Cierre de turno exitoso.";
    if (Math.abs(totalDiff) > 10) auditReason = `Cierre con DIFERENCIA de $${totalDiff}.`;

    logAuditAction({
        entityType: "SHIFT",
        entityId: shiftId,
        action: AUDIT_ACTIONS.CLOSE_SHIFT,
        user: shift.user || "Cajero",
        reason: auditReason,
        previousState: { status: "PRE_CLOSE" }
    });

    return snapshot;
}