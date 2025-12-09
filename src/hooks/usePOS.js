import { useState } from "react";
import { createSale } from "@/services/salesStorage";
import { useNotify, useConfirm } from "@/context/UIContext";

// 🟢 HELPER: Redondeo seguro a 2 decimales
const roundMoney = (amount) => Math.round(Number(amount) * 100) / 100;

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

  // Totales Globales
  const subtotal = roundMoney(cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0));
  const discountInput = Number(payment.discount) || 0;
  
  // Cálculo del descuento global
  let discountAmount = 0;
  if (payment.discountType === "PERCENT") {
      discountAmount = roundMoney(subtotal * (discountInput / 100));
  } else {
      discountAmount = roundMoney(discountInput);
  }

  const total = Math.max(0, roundMoney(subtotal - discountAmount));

  // Acciones Carrito
  const addToCart = (item) => {
      const uniqueId = crypto.randomUUID();
      setCart(prev => [...prev, { ...item, id: uniqueId, _tempId: uniqueId }]);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  
  const clearCart = () => {
      setCart([]);
      setPayment(p => ({ ...p, initial: 0, discount: "" }));
      setLogistics({ boxNumber: "", soldBy: "" });
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // Clasificar
    const labItems = cart.filter(i => i.requiresLab);
    const simpleItems = cart.filter(i => !i.requiresLab);
    const needsSplit = labItems.length > 0 && simpleItems.length > 0;

    if (needsSplit) {
        const ok = await confirm({
            title: "Venta Mixta Detectada",
            message: "Se detectaron productos de Taller y de Mostrador.\n\nEl sistema generará 2 tickets separados automáticamente para control interno.",
            confirmText: "Proceder", cancelText: "Cancelar"
        });
        if (!ok) return;
    }

    setIsProcessing(true);
    try {
        const globalPaymentAmount = Number(payment.initial) || 0;

        // Función genérica para procesar cada "sub-venta"
        const processSubSale = async (items, subTotal, subDiscount, subPayment, descOverride) => {
            if (items.length === 0) return;

            const subGross = items.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
            
            // Construir objeto de pago proporcional
            let payObj = null;
            if (subPayment > 0) {
                payObj = { 
                    amount: subPayment, 
                    method: payment.method, 
                    paidAt: new Date().toISOString() 
                };
                if (payment.method === "TARJETA") {
                    const term = terminals.find(t => t.id === payment.terminalId);
                    // El cargo extra también se prorratea si es necesario, 
                    // pero para simplificar, asumimos que se calcula sobre lo cobrado.
                    const feeAmount = roundMoney((subPayment * (Number(payment.feePercent)||0)) / 100);
                    payObj = { 
                        ...payObj, 
                        terminal: term?.name, 
                        cardType: payment.cardType, 
                        installments: payment.installments, 
                        feeAmount 
                    };
                }
            }

            await createSale({
                patientId,
                boxNumber: logistics.boxNumber,
                soldBy: logistics.soldBy,
                discount: subDiscount,
                total: subTotal,
                payments: payObj ? [payObj] : [],
                description: descOverride,
                subtotalGross: subGross,
                items: items 
            });
        };

        if (needsSplit) {
            // 🟢 ESTRATEGIA DE REDONDEO: "SIMPLE" MANDA, "LAB" TOMA EL RESTO
            // 1. Calcular totales para la parte "Simple" (Mostrador)
            const simpleGross = simpleItems.reduce((s, i) => s + (i.qty * i.unitPrice), 0);
            const ratioSimple = subtotal > 0 ? simpleGross / subtotal : 0;
            
            const discountSimple = roundMoney(discountAmount * ratioSimple);
            const totalSimple = Math.max(0, roundMoney(simpleGross - discountSimple));

            // 2. Calcular totales para la parte "Lab" (Óptica) POR DIFERENCIA
            // Esto asegura que totalSimple + totalLab === total (Global) exactamente, sin perder centavos.
            const discountLab = roundMoney(discountAmount - discountSimple);
            const totalLab = roundMoney(total - totalSimple); 

            // 3. Distribuir el pago inicial (Abono)
            // Priorizamos cubrir el ticket de mostrador (que usualmente se lleva al momento)
            const paySimple = Math.min(globalPaymentAmount, totalSimple);
            const payLab = Math.max(0, roundMoney(globalPaymentAmount - paySimple));

            // 4. Ejecutar ventas
            await processSubSale(simpleItems, totalSimple, discountSimple, paySimple, "Venta Mostrador (Auto)");
            await processSubSale(labItems, totalLab, discountLab, payLab, "Venta Óptica (Auto)");
            
            notify.success("Tickets generados y balanceados correctamente.");

        } else {
            // Venta única normal
            let payObj = null;
            if (globalPaymentAmount > 0) {
                 payObj = { amount: globalPaymentAmount, method: payment.method, paidAt: new Date().toISOString() };
                 // ... lógica de tarjeta igual que arriba ...
                 if (payment.method === "TARJETA") {
                    const term = terminals.find(t => t.id === payment.terminalId);
                    const feeAmount = roundMoney((globalPaymentAmount * (Number(payment.feePercent)||0)) / 100);
                    payObj = { ...payObj, terminal: term?.name, cardType: payment.cardType, installments: payment.installments, feeAmount };
                }
            }

            await createSale({
                patientId,
                boxNumber: logistics.boxNumber,
                soldBy: logistics.soldBy,
                discount: discountAmount,
                total: total,
                payments: payObj ? [payObj] : [],
                description: null,
                subtotalGross: subtotal,
                items: cart
            });
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
      totals: { subtotal, total }, // Exportamos totales ya calculados
      handleCheckout, isProcessing
  };
}