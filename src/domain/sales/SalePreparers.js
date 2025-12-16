import { roundMoney } from "@/utils/currency";
import { PAYMENT_METHODS, PRODUCT_KINDS, WO_STATUS, EXPENSE_CATEGORIES } from "@/utils/constants";

/**
 * Valida stock y prepara las actualizaciones de inventario.
 */
export function prepareInventoryUpdates(items, productDataMap) {
    const updates = [];
    const logs = [];

    items.forEach(item => {
        if (item.inventoryProductId) {
            const prodData = productDataMap.get(item.inventoryProductId);
            
            if (!prodData) {
                throw new Error(`Producto no encontrado en inventario: ${item.description}`);
            }

            if (!prodData.isOnDemand) {
                const currentStock = Number(prodData.stock) || 0;
                if (currentStock < item.qty) {
                    throw new Error(`Stock insuficiente: ${prodData.brand} ${prodData.model} (Disp: ${currentStock})`);
                }

                const newStock = currentStock - item.qty;
                
                updates.push({ 
                    productId: item.inventoryProductId, 
                    newStock 
                });

                logs.push({
                    productId: item.inventoryProductId,
                    type: "SALE",
                    quantity: -item.qty,
                    finalStock: newStock
                });
            }
        }
    });

    return { updates, logs };
}

/**
 * Calcula los puntos de lealtad.
 */
export function calculateLoyaltyPoints(payments, patientData, referrerData, loyaltySettings) {
    let pointsToAward = 0;
    let referrerPoints = 0;

    if (loyaltySettings?.enabled) {
        payments.forEach(pay => {
            const amount = Number(pay.amount) || 0;
            if (amount <= 0) return;
            
            // 🟢 REFACTOR: Constante
            const method = pay.method || PAYMENT_METHODS.CASH;
            
            if (method !== PAYMENT_METHODS.POINTS) {
                const ownRate = loyaltySettings.earningRates[method] !== undefined 
                    ? loyaltySettings.earningRates[method] 
                    : loyaltySettings.earningRates["GLOBAL"];
                
                pointsToAward += Math.floor((amount * ownRate) / 100);

                if (referrerData) {
                    const refRate = Number(loyaltySettings.referralBonusPercent) || 0;
                    referrerPoints += Math.floor((amount * refRate) / 100);
                }
            }
        });
    }

    return { pointsToAward, referrerPoints };
}

/**
 * Prepara comisiones bancarias.
 */
export function prepareBankCommissions(payments, terminals, branchId, dateIso) {
    const expenses = [];

    payments.forEach(pay => {
        // 🟢 REFACTOR: Constante
        if (pay.method === PAYMENT_METHODS.CARD && pay.terminal) {
            const termConfig = terminals.find(t => t.name === pay.terminal);
            if (termConfig) {
                let ratePct = Number(termConfig.fee) || 0;
                
                const monthsMatch = (pay.cardType || "").match(/(\d+)/);
                if (monthsMatch) {
                    const months = monthsMatch[1];
                    if (termConfig.rates && termConfig.rates[months]) {
                        ratePct += Number(termConfig.rates[months]);
                    }
                }
                
                const commissionAmount = roundMoney((Number(pay.amount) * ratePct) / 100);
                
                if (commissionAmount > 0) {
                    expenses.push({
                        description: `Comisión Tarjeta (${pay.terminal} - ${pay.cardType || 'C'}): Venta (Nueva)`,
                        amount: commissionAmount,
                        // 🟢 REFACTOR: Constante
                        category: EXPENSE_CATEGORIES.BANK_COMMISSION,
                        method: PAYMENT_METHODS.OTHER,
                        branchId: branchId,
                        date: dateIso,
                        createdAt: dateIso
                    });
                }
            }
        }
    });

    return expenses;
}

/**
 * Genera WorkOrders.
 */
export function prepareWorkOrders(items, saleId, branchId, patientId, dateIso, totalSale, paidAmount) {
    const workOrders = [];
    const hasLabItems = items.some(i => i.requiresLab === true);

    if (!hasLabItems) return [];

    const ratio = totalSale > 0 ? paidAmount / totalSale : 1;
    // 🟢 REFACTOR: Constantes
    const initialStatus = ratio >= 0.5 ? WO_STATUS.TO_PREPARE : WO_STATUS.ON_HOLD;

    const lenses = items.filter(i => i.kind === PRODUCT_KINDS.LENSES);
    const frames = items.filter(i => i.kind === PRODUCT_KINDS.FRAMES);
    const contacts = items.filter(i => i.kind === PRODUCT_KINDS.CONTACT_LENS);
    
    let availableFrames = [...frames];

    for (const lens of lenses) {
        const linkedFrame = availableFrames.shift(); 
        const workOrderId = `wo_${saleId}_${lens.id}`; 
        
        workOrders.push({
            _id: workOrderId,
            id: workOrderId, 
            branchId,
            patientId,
            saleId,
            saleItemId: lens.id,
            type: "LENTES",
            status: initialStatus,
            labName: lens.labName || "",
            labCost: Number(lens.cost) || 0,
            rxNotes: lens.rxSnapshot ? JSON.stringify(lens.rxSnapshot) : "",
            frameCondition: linkedFrame ? `Nuevo: ${linkedFrame.description}` : "Propio/No especificado",
            dueDate: lens.dueDate || null,
            createdAt: dateIso,
            updatedAt: dateIso,
            isWarranty: false,
            warrantyHistory: [],
            history: []
        });
    }

    for (const cl of contacts) {
        const workOrderId = `wo_${saleId}_${cl.id}`; 
        
        workOrders.push({
            _id: workOrderId,
            id: workOrderId, 
            branchId,
            patientId,
            saleId,
            saleItemId: cl.id,
            type: "LC",
            status: initialStatus,
            labName: "Lentes de Contacto",
            labCost: Number(cl.cost) || 0,
            rxNotes: cl.rxSnapshot ? JSON.stringify(cl.rxSnapshot) : "",
            dueDate: cl.dueDate || null,
            createdAt: dateIso,
            updatedAt: dateIso,
            isWarranty: false,
            warrantyHistory: [],
            history: []
        });
    }

    return workOrders;
}