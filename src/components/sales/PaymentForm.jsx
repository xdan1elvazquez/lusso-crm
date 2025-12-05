import React from "react";
import { preventNegativeKey, sanitizeMoney, formatMoneyBlur } from "@/utils/inputHandlers";

const PAYMENT_METHODS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"];

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
  // Helper para recalcular fees al cambiar terminal/plazo
  const updateFee = (termId, months) => {
      const term = terminals.find(t => t.id === termId);
      if (!term) return 0;
      return months === "1" ? (Number(term.fee)||0) : (Number(term.rates?.[months]) || Number(term.fee) || 0);
  };

  const handleTerminalChange = (e) => { 
      const tId = e.target.value; 
      const newFee = updateFee(tId, payment.installments); 
      setPayment(p => ({ ...p, terminalId: tId, feePercent: newFee })); 
  };

  const handleInstallmentsChange = (e) => { 
      const months = e.target.value; 
      const newFee = updateFee(payment.terminalId, months); 
      setPayment(p => ({ ...p, installments: months, feePercent: newFee })); 
  };

  const calculatedFee = payment.method === "TARJETA" ? (Number(payment.initial) * Number(payment.feePercent) / 100) : 0;

  return (
    <div style={{ borderTop: "1px solid #333", paddingTop: 15 }}>
        <div style={{ background: "#1e293b", padding: 10, borderRadius: 6, marginBottom: 15 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9em", color: "#aaa", marginBottom: 5 }}><span>Subtotal:</span><span>${subtotal.toLocaleString()}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{fontSize:"0.9em", color:"#f87171"}}>Desc:</span>
                <div style={{ display: "flex", gap: 5 }}>
                    <input type="number" value={payment.discount} onChange={e => setPayment({...payment, discount: e.target.value})} placeholder="0" style={{ width: 60, padding: 4, background: "#0f172a", border: "1px solid #f87171", color: "#f87171", textAlign: "right", borderRadius: 4 }} />
                    <select value={payment.discountType} onChange={e => setPayment({...payment, discountType: e.target.value})} style={{ padding: "0 4px", background: "#0f172a", border: "1px solid #f87171", color: "#f87171", fontSize: "0.8em" }}><option value="AMOUNT">$</option><option value="PERCENT">%</option></select>
                </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.4em", fontWeight: "bold", color: "white" }}><span>Total:</span><span>${total.toLocaleString()}</span></div>
        </div>

        <div style={{ display: "grid", gap: 12, marginBottom: 15 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input 
                    type="number" 
                    min="0"
                    onKeyDown={preventNegativeKey}
                    value={payment.initial} 
                    onChange={e => setPayment({...payment, initial: sanitizeMoney(e.target.value)})} 
                    onBlur={e => setPayment(p => ({...p, initial: formatMoneyBlur(p.initial)}))}
                    placeholder="Abono" 
                    style={{ width: "100%", padding: 8, borderRadius: 4, fontWeight: "bold" }} 
                />
                <select value={payment.method} onChange={e => setPayment({...payment, method: e.target.value})} style={{ width: "100%", padding: 8, borderRadius: 4 }}>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select>
            </div>
            {payment.method === "TARJETA" && (
                <div style={{ background: "#0f172a", padding: 10, borderRadius: 6, border: "1px solid #334155", display: "grid", gap: 10 }}>
                    <select value={payment.terminalId} onChange={handleTerminalChange} style={{ width:"100%", padding:6 }}><option value="">Terminal</option>{terminals.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
                        <select value={payment.cardType} onChange={e => setPayment({...payment, cardType: e.target.value})} style={{padding:6}}><option value="TDD">Débito</option><option value="TDC">Crédito</option></select>
                        <select value={payment.installments} onChange={handleInstallmentsChange} style={{padding:6}}><option value="1">1 Mes</option><option value="3">3 Meses</option><option value="6">6 Meses</option><option value="9">9 Meses</option><option value="12">12 Meses</option></select>
                    </div>
                    <div style={{ color: "#f87171", fontSize: "0.8em", alignSelf:"center", textAlign:"right" }}>Retención: ${calculatedFee.toFixed(2)}</div>
                </div>
            )}
        </div>

        <button onClick={onCheckout} disabled={cartLength === 0 || isProcessing} style={{ width: "100%", padding: 12, background: isProcessing ? "#666" : cartLength > 0 ? "#16a34a" : "#333", color: "white", border: "none", borderRadius: 6, fontWeight: "bold", cursor: isProcessing || cartLength === 0 ? "not-allowed" : "pointer" }}>
            {isProcessing ? "Procesando..." : "Cobrar Venta"}
        </button>
    </div>
  );
}