import { useState } from "react";
import { createSale } from "@/services/salesStorage";
import { useNotify } from "@/context/UIContext";
import { calculateCartTotals } from "@/domain/sales/SalesCalculator";
import { roundMoney } from "@/utils/currency";

export function usePOS(patientId, terminals, refreshCallback) {
  const notify = useNotify();
  
  const [cart, setCart] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payment, setPayment] = useState({ 
      discount: "", discountType: "AMOUNT", 
      initial: 0, method: "EFECTIVO", terminalId: "", 
      cardType: "TDD", installments: "1", feePercent: 0 
  });
  const [logistics, setLogistics] = useState({ boxNumber: "", soldBy: "" });

  // 🟢 REFACTOR: Usamos la calculadora de dominio pura
  const { subtotal, total, discountAmount } = calculateCartTotals(
      cart, 
      payment.discount, 
      payment.discountType
  );

  // --- ACCIONES CARRITO ---

  const addToCart = (item) => {
      const uniqueId = crypto.randomUUID();
      setCart(prev => [...prev, { 
          ...item, 
          id: uniqueId, 
          _tempId: uniqueId,
          originalPrice: item.originalPrice !== undefined ? item.originalPrice : item.unitPrice,
          isPriceOverridden: item.isPriceOverridden || false
      }]);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  
  const updateCartItem = (id, updates) => {
      setCart(prev => prev.map(item => {
          if (item.id !== id) return item;
          
          const newItem = { ...item, ...updates };
          
          if (updates.unitPrice !== undefined) {
              const priceChanged = Math.abs(Number(updates.unitPrice) - Number(item.originalPrice)) > 0.01;
              newItem.isPriceOverridden = priceChanged;
              if (!priceChanged) {
                  newItem.overrideReason = null;
              }
          }
          return newItem;
      }));
  };

  const clearCart = () => {
      setCart([]);
      setPayment(p => ({ ...p, initial: 0, discount: "" }));
      setLogistics({ boxNumber: "", soldBy: "" });
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (total < 0) {
        notify.error("El total no puede ser negativo. Revisa los descuentos.");
        return;
    }

    setIsProcessing(true);
    try {
        const globalPaymentAmount = Number(payment.initial) || 0;

        let payObj = null;
        if (globalPaymentAmount > 0) {
             payObj = { 
                 amount: globalPaymentAmount, 
                 method: payment.method, 
                 paidAt: new Date().toISOString() 
             };
             
             if (payment.method === "TARJETA") {
                const term = terminals.find(t => t.id === payment.terminalId);
                // 🟢 REFACTOR: Usamos roundMoney importado para el fee
                const feeAmount = roundMoney((globalPaymentAmount * (Number(payment.feePercent)||0)) / 100);
                
                payObj = { 
                    ...payObj, 
                    terminal: term?.name || "Terminal Desconocida", 
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
            discount: discountAmount,
            total: total,
            payments: payObj ? [payObj] : [],
            description: null,
            subtotalGross: subtotal,
            items: cart
        });

        notify.success("Venta registrada correctamente.");
        
        clearCart();
        if (refreshCallback) refreshCallback();

    } catch (e) {
        console.error("Error en checkout:", e);
        notify.error("Error procesando venta: " + e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  return {
      cart, addToCart, removeFromCart, updateCartItem, clearCart,
      payment, setPayment,
      logistics, setLogistics,
      totals: { subtotal, total }, 
      handleCheckout, isProcessing
  };
}