import React from "react";
import { preventNegativeKey, sanitizeMoney } from "@/utils/inputHandlers";
import { formatMoneyInput } from "@/utils/currency";
import { calculateTerminalFeePercent, calculateFeeAmount } from "@/domain/sales/SalesCalculator";
import Button from "@/components/ui/Button";
// 🟢 REFACTOR: Constantes
import { PAYMENT_METHODS, CARD_TYPES } from "@/utils/constants";

export default function PaymentForm({ 
    subtotal, 
    total, 
    payment, 
    setPayment, 
    terminals, 
    onCheckout, 
    isProcessing,
    cartLength 
}) {

  const handleTerminalChange = (e) => { 
      const tId = e.target.value; 
      const newFee = calculateTerminalFeePercent(tId, payment.installments, terminals);
      setPayment(p => ({ ...p, terminalId: tId, feePercent: newFee })); 
  };

  const handleInstallmentsChange = (e) => { 
      const months = e.target.value; 
      const newFee = calculateTerminalFeePercent(payment.terminalId, months, terminals); 
      setPayment(p => ({ ...p, installments: months, feePercent: newFee })); 
  };

  const calculatedFee = calculateFeeAmount(payment.initial, payment.feePercent);
  
  const controlClass = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none";

  return (
    <div className="border-t border-border pt-4 mt-auto">
        {/* Resumen Totales */}
        <div className="bg-surfaceHighlight/50 rounded-xl p-4 mb-4 border border-border">
            <div className="flex justify-between text-sm text-textMuted mb-2">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-border/50">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Descuento</span>
                <div className="flex gap-2">
                    <input 
                        type="number" 
                        value={payment.discount} 
                        onChange={e => setPayment({...payment, discount: e.target.value})} 
                        placeholder="0" 
                        className="w-16 bg-background border border-primary/30 rounded px-2 py-1 text-right text-primary text-sm focus:border-primary outline-none"
                    />
                    <select 
                        value={payment.discountType} 
                        onChange={e => setPayment({...payment, discountType: e.target.value})} 
                        className="bg-background border border-primary/30 rounded px-1 py-1 text-xs text-primary outline-none"
                    >
                        <option value="AMOUNT">$</option>
                        <option value="PERCENT">%</option>
                    </select>
                </div>
            </div>
            
            <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-white">Total a Pagar</span>
                <span className="text-2xl font-bold text-white tracking-tight">${total.toLocaleString()}</span>
            </div>
        </div>

        {/* Controles de Pago */}
        <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                    <span className="absolute left-3 top-2 text-emerald-500 font-bold">$</span>
                    <input 
                        type="number" 
                        min="0"
                        onKeyDown={preventNegativeKey}
                        value={payment.initial} 
                        onChange={e => setPayment({...payment, initial: sanitizeMoney(e.target.value)})} 
                        onBlur={e => setPayment(p => ({...p, initial: formatMoneyInput(p.initial)}))} 
                        placeholder="Monto" 
                        className={`${controlClass} pl-6 font-bold text-emerald-400 border-emerald-500/30 focus:border-emerald-500`}
                    />
                </div>
                <select value={payment.method} onChange={e => setPayment({...payment, method: e.target.value})} className={controlClass}>
                    {/* 🟢 REFACTOR: Mapeo desde constantes */}
                    {Object.values(PAYMENT_METHODS).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
            
            {payment.method === PAYMENT_METHODS.POINTS && (
                <div className="text-[10px] text-yellow-400 bg-yellow-400/10 p-2 rounded border border-yellow-400/20">
                    ⚠️ Se validará que el cliente tenga suficientes puntos al cobrar (1 Punto = $1 Peso).
                </div>
            )}

            {payment.method === PAYMENT_METHODS.CARD && (
                <div className="bg-background p-3 rounded-lg border border-border animate-[fadeIn_0.2s_ease-out]">
                    <select value={payment.terminalId} onChange={handleTerminalChange} className={`${controlClass} mb-2`}>
                        <option value="">Seleccionar Terminal</option>
                        {terminals.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <select value={payment.cardType} onChange={e => setPayment({...payment, cardType: e.target.value})} className={controlClass}>
                            <option value={CARD_TYPES.DEBIT}>Débito</option>
                            <option value={CARD_TYPES.CREDIT}>Crédito</option>
                        </select>
                        <select value={payment.installments} onChange={handleInstallmentsChange} className={controlClass}>
                            <option value="1">1 Pago</option>
                            <option value="3">3 Meses</option>
                            <option value="6">6 Meses</option>
                            <option value="9">9 Meses</option>
                            <option value="12">12 Meses</option>
                        </select>
                    </div>
                    <div className="text-right text-xs text-red-400">
                        Comisión aprox: -${calculatedFee.toFixed(2)}
                    </div>
                </div>
            )}
        </div>

        <Button 
            onClick={onCheckout} 
            disabled={cartLength === 0 || isProcessing} 
            variant="primary"
            className={`w-full py-3 text-base shadow-lg ${isProcessing ? "opacity-70" : "hover:shadow-blue-500/20"}`}
        >
            {isProcessing ? "Procesando..." : `Cobrar $${(Number(payment.initial)||0).toLocaleString()}`}
        </Button>
    </div>
  );
}