import { useState } from "react";
import { createSale } from "@/services/salesStorage";
import { useNotify, useConfirm } from "@/context/UIContext";

export function usePOS(patientId, terminals, refreshCallback) {
  const notify = useNotify();
  const confirm = useConfirm();
  
  const [cart, setCart] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payment, setPayment] = useState({ 
      discount: "", discountType: "AMOUNT", 
      initial: 0, method: "EFECTIVO", terminalId: "", 
      cardType: "TDD", installments: "1", feePercent: 0 
  });
  const [logistics, setLogistics] = useState({ boxNumber: "", soldBy: "" });

  // Totales
  const subtotal = cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  const discountVal = Number(payment.discount) || 0;
  const discountAmount = payment.discountType === "PERCENT" ? subtotal * (discountVal / 100) : discountVal;
  const total = Math.max(0, subtotal - discountAmount);

  // Acciones Carrito
  const addToCart = (item) => setCart(prev => [...prev, { ...item, _tempId: Date.now() + Math.random() }]);
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i._tempId !== id));
  const clearCart = () => {
      setCart([]);
      setPayment(p => ({ ...p, initial: 0, discount: "" }));
      setLogistics({ boxNumber: "", soldBy: "" });
  };

  // 🧠 LÓGICA CORE: Checkout con Split
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // Clasificar
    const labItems = cart.filter(i => i.requiresLab);
    const simpleItems = cart.filter(i => !i.requiresLab);
    const needsSplit = labItems.length > 0 && simpleItems.length > 0;

    if (needsSplit) {
        const ok = await confirm({
            title: "Venta Mixta Detectada",
            message: "Se detectaron productos de Taller y de Mostrador.\n\nEl sistema generará 2 tickets separados automáticamente para control de inventario y laboratorio.",
            confirmText: "Proceder", cancelText: "Cancelar"
        });
        if (!ok) return;
    }

    setIsProcessing(true);
    try {
        const paymentAmount = Number(payment.initial) || 0;

        // Función interna para crear una venta parcial
        const createPartialSale = async (items, allocatedPayment, descOverride) => {
            if (items.length === 0) return;
            
            // Recalcular proporciones
            const groupGross = items.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
            const ratio = subtotal > 0 ? groupGross / subtotal : 0;
            const groupDiscount = discountAmount * ratio;
            const groupTotal = Math.max(0, groupGross - groupDiscount);

            // Construir objeto de pago
            let payObj = null;
            if (allocatedPayment > 0) {
                payObj = { amount: allocatedPayment, method: payment.method, paidAt: new Date().toISOString() };
                if (payment.method === "TARJETA") {
                    const term = terminals.find(t => t.id === payment.terminalId);
                    const feeAmount = (allocatedPayment * (Number(payment.feePercent)||0)) / 100;
                    payObj = { ...payObj, terminal: term?.name, cardType: payment.cardType, installments: payment.installments, feeAmount };
                }
            }

            await createSale({
                patientId,
                boxNumber: logistics.boxNumber,
                soldBy: logistics.soldBy,
                discount: groupDiscount,
                total: groupTotal,
                payments: payObj ? [payObj] : [],
                description: descOverride,
                subtotalGross: groupGross,
                items: items
            });
        };

        if (needsSplit) {
            // Prioridad de pago: 1. Mostrador (Simple), 2. Taller (Lab)
            const simpleGross = simpleItems.reduce((s, i) => s + (i.qty * i.unitPrice), 0);
            const simpleRatio = subtotal > 0 ? simpleGross / subtotal : 0;
            const simpleTotal = Math.max(0, simpleGross - (discountAmount * simpleRatio));

            const paySimple = Math.min(paymentAmount, simpleTotal);
            const payLab = Math.max(0, paymentAmount - paySimple);

            await createPartialSale(simpleItems, paySimple, "Venta Mostrador (Auto)");
            await createPartialSale(labItems, payLab, "Venta Óptica (Auto)");
            notify.success("Se generaron 2 tickets correctamente.");
        } else {
            // Venta única
            await createPartialSale(cart, paymentAmount, null);
            notify.success("Venta registrada.");
        }

        clearCart();
        if (refreshCallback) refreshCallback();

    } catch (e) {
        console.error(e);
        notify.error("Error: " + e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  return {
      cart, addToCart, removeFromCart, clearCart,
      payment, setPayment,
      logistics, setLogistics,
      totals: { subtotal, total },
      handleCheckout, isProcessing
  };
}