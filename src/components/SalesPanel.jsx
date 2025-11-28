import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createSale, getSalesByPatientId, deleteSale } from "@/services/salesStorage";
import { getExamsByPatient } from "@/services/eyeExamStorage"; 
import { getAllProducts } from "@/services/inventoryStorage"; 
import { getConsultationsByPatient } from "@/services/consultationsStorage"; 
import { getTerminals } from "@/services/settingsStorage"; 
import RxPicker from "./RxPicker";
import { normalizeRxValue } from "@/utils/rxOptions";

const PAYMENT_METHODS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"];

export default function SalesPanel({ patientId, prefillData, onClearPrefill }) {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [cart, setCart] = useState([]);
  
  // Estado Pago + Descuento Inteligente
  const [payment, setPayment] = useState({ 
    discount: "",       // Lo que escribe el usuario (ej. "10" o "500")
    discountType: "AMOUNT", // "AMOUNT" ($) o "PERCENT" (%)
    initial: 0, 
    method: "EFECTIVO",
    terminalId: "", 
    cardType: "TDD", 
    installments: "1", 
    feePercent: 0 
  });

  const [terminals, setTerminals] = useState([]);

  const sales = useMemo(() => getSalesByPatientId(patientId), [patientId, tick]);
  const exams = useMemo(() => getExamsByPatient(patientId), [patientId, tick]);
  const products = useMemo(() => getAllProducts(), []);
  const consultations = useMemo(() => getConsultationsByPatient(patientId), [patientId, tick]);

  const [prodQuery, setProdQuery] = useState("");
  const filteredProducts = useMemo(() => {
    if (!prodQuery) return [];
    return products.filter(p => p.brand.toLowerCase().includes(prodQuery.toLowerCase())).slice(0, 5);
  }, [products, prodQuery]);

  useEffect(() => {
    const terms = getTerminals();
    setTerminals(terms);
    if (terms.length > 0 && payment.method === "TARJETA" && !payment.terminalId) {
        setPayment(p => ({ ...p, terminalId: terms[0].id, feePercent: terms[0].fee }));
    }
  }, [payment.method]);

  const updateFee = (termId, months) => {
    const term = terminals.find(t => t.id === termId);
    if (!term) return 0;
    if (months === "1") return term.fee;
    return term.rates?.[months] || term.fee;
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

  const addToCart = (item) => { setCart(prev => [...prev, { ...item, _tempId: Date.now() + Math.random() }]); setProdQuery(""); };
  const removeFromCart = (tempId) => setCart(prev => prev.filter(i => i._tempId !== tempId));

  const handleImportExam = (e) => {
    const examId = e.target.value; if(!examId) return;
    const exam = exams.find(x => x.id === examId);
    let desc = "Lentes Completos"; if(exam.recommendations?.design) desc += ` - ${exam.recommendations.design}`;
    addToCart({ kind: "LENSES", description: desc, qty: 1, unitPrice: 0, requiresLab: true, eyeExamId: exam.id, rxSnapshot: normalizeRxValue(exam.rx), labName: "", dueDate: "", taxable: true });
  };
  const handleImportConsultation = (e) => {
    const consultId = e.target.value; if(!consultId) return;
    const consultation = consultations.find(c => c.id === consultId);
    if (consultation.prescribedMeds?.length > 0) {
      consultation.prescribedMeds.forEach(med => {
         const invProd = products.find(p => p.id === med.productId);
         addToCart({ 
             kind: "MEDICATION", description: med.productName, qty: med.qty || 1, unitPrice: med.price || 0, 
             inventoryProductId: med.productId, requiresLab: false,
             taxable: invProd ? invProd.taxable : true 
         });
      });
      alert(`Se agregaron ${consultation.prescribedMeds.length} medicamentos.`);
    } else alert("Sin medicamentos.");
  };

  // --- CÁLCULOS FINANCIEROS AVANZADOS ---
  const subtotalGross = cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  
  // Calculamos el descuento real en dinero
  let discountAmount = 0;
  const discountValue = Number(payment.discount) || 0;
  
  if (payment.discountType === "PERCENT") {
      discountAmount = subtotalGross * (discountValue / 100);
  } else {
      discountAmount = discountValue;
  }

  // Evitamos descuentos negativos o mayores al total
  if (discountAmount < 0) discountAmount = 0;
  if (discountAmount > subtotalGross) discountAmount = subtotalGross;

  let finalTotal = subtotalGross - discountAmount;
  
  // Cálculo de IVA (Base gravable)
  const taxableGross = cart.filter(i => i.taxable).reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  const taxableRatio = subtotalGross > 0 ? (taxableGross / subtotalGross) : 0;
  const taxableFinal = finalTotal * taxableRatio; // Aplicamos descuento proporcional
  
  const ivaRate = 0.16;
  const baseAmount = taxableFinal / (1 + ivaRate);
  const ivaAmount = taxableFinal - baseAmount;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const amount = Number(payment.initial);

    let paymentObj = null;
    if (amount > 0) {
        paymentObj = { amount, method: payment.method, paidAt: new Date().toISOString() };
        if (payment.method === "TARJETA") {
            if (!payment.terminalId && terminals.length > 0) { alert("Selecciona terminal"); return; }
            const term = terminals.find(t => t.id === payment.terminalId);
            const feeAmount = (amount * (Number(payment.feePercent)||0)) / 100;
            paymentObj = {
                ...paymentObj,
                terminal: term ? term.name : "Desconocida",
                cardType: payment.cardType,
                installments: payment.installments,
                feeAmount
            };
        }
    }

    createSale({
      patientId,
      discount: discountAmount, // Guardamos siempre el monto final en dinero
      total: finalTotal,
      payments: paymentObj ? [paymentObj] : [],
      items: cart.map(item => ({
        kind: item.kind, description: item.description, qty: item.qty, unitPrice: item.unitPrice,
        requiresLab: item.requiresLab, eyeExamId: item.eyeExamId || null, inventoryProductId: item.inventoryProductId || null,
        rxSnapshot: item.rxSnapshot || null, labName: item.labName || "", dueDate: item.dueDate || null,
        taxable: item.taxable 
      }))
    });

    setCart([]);
    setPayment({ initial: 0, discount: "", discountType: "AMOUNT", method: "EFECTIVO", terminalId: "", cardType: "TDD", installments: "1", feePercent: 0 });
    if (cart.some(i => i.requiresLab)) navigate("/work-orders");
    else { setTick(t => t + 1); alert("Venta procesada"); }
  };

  return (
    <section style={{ background: "#1a1a1a", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
      <h3 style={{ margin: "0 0 20px 0", color: "#e5e7eb" }}>Caja y Ventas</h3>

      <div style={{ background: "#111", padding: 20, borderRadius: 10, marginBottom: 20, border: "1px dashed #444" }}>
        {/* ... (BUSCADOR Y SELECTORES DE IMPORTACIÓN - SIN CAMBIOS) ... */}
        <div style={{ marginBottom: 20, position: "relative" }}>
          <label style={{ fontSize: 12, color: "#aaa" }}>Buscar Producto</label>
          <input value={prodQuery} onChange={e => setProdQuery(e.target.value)} placeholder="Escribe marca..." style={{ width: "100%", padding: 10, background: "#222", border: "1px solid #444", color: "white", borderRadius: 6 }} />
          {filteredProducts.length > 0 && (
            <div style={{ position: "absolute", top: "100%", width: "100%", background: "#333", border: "1px solid #555", zIndex: 10 }}>
              {filteredProducts.map(p => (
                <div key={p.id} onClick={() => addToCart({
                  kind: p.category === "FRAMES" ? "LENSES" : "MEDICATION",
                  description: `${p.brand} ${p.model}`, qty: 1, unitPrice: p.price, inventoryProductId: p.id, requiresLab: p.category === "FRAMES",
                  taxable: p.taxable !== false 
                })} style={{ padding: 10, borderBottom: "1px solid #444", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                  <span>{p.brand} {p.model}</span>
                  <span style={{ color: "#4ade80" }}>${p.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:10 }}>
           <div style={{ flex:1, padding: 10, background: "#1e3a8a", borderRadius: 6 }}>
              <select onChange={handleImportExam} style={{ width: "100%", padding: 6, borderRadius: 4 }}><option value="">Importar Rx (Lentes)</option>{exams.map(e => <option key={e.id} value={e.id}>{new Date(e.examDate).toLocaleDateString()} - {e.recommendations?.design}</option>)}</select>
           </div>
           <div style={{ flex:1, padding: 10, background: "#064e3b", borderRadius: 6 }}>
              <select onChange={handleImportConsultation} style={{ width: "100%", padding: 6, borderRadius: 4 }}><option value="">Importar Receta Med</option>{consultations.map(c => <option key={c.id} value={c.id}>{new Date(c.visitDate).toLocaleDateString()} - {c.diagnosis}</option>)}</select>
           </div>
        </div>
      </div>

      <div style={{ background: "#111", padding: 20, borderRadius: 12, border: "1px solid #333", display: "flex", flexDirection: "column" }}>
        <h3 style={{ marginTop: 0, color: "#4ade80" }}>🛒 Carrito</h3>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 150, marginBottom: 20 }}>
          {cart.map((item, idx) => (
            <div key={item._tempId || idx} style={{ background: "#222", padding: 8, borderRadius: 4, marginBottom: 5, display: "grid", gap:5 }}>
               <div style={{display:"flex", justifyContent:"space-between"}}>
                  <strong style={{fontSize:13}}>{item.description} {item.taxable===false && <span style={{fontSize:10, color:"#aaa"}}>(Sin IVA)</span>}</strong>
                  <button onClick={() => removeFromCart(item._tempId)} style={{color:"#f87171", background:"none", border:"none"}}>✕</button>
               </div>
               <div style={{display:"flex", gap:10}}>
                  <label style={{fontSize:11, color:"#aaa"}}>Cant: <input type="number" value={item.qty} onChange={e => {const n=[...cart]; n[idx].qty=e.target.value; setCart(n)}} style={{width:30, background:"#333", border:"none", color:"white"}} /></label>
                  <label style={{fontSize:11, color:"#aaa"}}>Precio: $<input type="number" value={item.unitPrice} onChange={e => {const n=[...cart]; n[idx].unitPrice=e.target.value; setCart(n)}} style={{width:60, background:"#333", border:"none", color:"white"}} /></label>
               </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #333", paddingTop: 15 }}>
          {/* DESGLOSE FINANCIERO CON DESCUENTO INTELIGENTE */}
          <div style={{ background: "#1e293b", padding: 10, borderRadius: 6, marginBottom: 15 }}>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9em", color: "#aaa", marginBottom: 5 }}>
                <span>Subtotal Lista:</span>
                <span>${subtotalGross.toLocaleString()}</span>
             </div>
             
             {/* LINEA DE DESCUENTO SELECTOR */}
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{fontSize:"0.9em", color:"#f87171"}}>Descuento:</span>
                <div style={{ display: "flex", gap: 5 }}>
                    <input 
                      type="number" 
                      value={payment.discount} 
                      onChange={e => setPayment({...payment, discount: e.target.value})} 
                      placeholder="0"
                      style={{ width: 60, padding: 4, background: "#0f172a", border: "1px solid #f87171", color: "#f87171", textAlign: "right", borderRadius: 4 }} 
                    />
                    <select 
                       value={payment.discountType} 
                       onChange={e => setPayment({...payment, discountType: e.target.value})}
                       style={{ padding: "0 4px", background: "#0f172a", border: "1px solid #f87171", color: "#f87171", borderRadius: 4, fontSize: "0.8em" }}
                    >
                       <option value="AMOUNT">$</option>
                       <option value="PERCENT">%</option>
                    </select>
                </div>
             </div>
             
             {/* Si es porcentaje, mostramos cuánto es en dinero para confirmar */}
             {payment.discountType === "PERCENT" && discountAmount > 0 && (
                 <div style={{ textAlign: "right", fontSize: "0.8em", color: "#f87171", marginBottom: 5, fontStyle: "italic" }}>
                    - ${discountAmount.toLocaleString(undefined, {minimumFractionDigits:2})}
                 </div>
             )}

             <div style={{ borderTop: "1px dashed #444", margin: "8px 0" }}></div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.4em", fontWeight: "bold", color: "white" }}>
                <span>Total a Pagar:</span>
                <span>${finalTotal.toLocaleString()}</span>
             </div>
             <div style={{ display: "flex", justifyContent: "flex-end", gap: 15, fontSize: "0.8em", color: "#64748b", marginTop: 4 }}>
                <span>Base: ${baseAmount.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
                <span>IVA (16%): ${ivaAmount.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
             </div>
          </div>

          {/* FORMA DE PAGO */}
          <div style={{ display: "grid", gap: 12, marginBottom: 15 }}>
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 12 }}>Abono Inicial
                   <input type="number" value={payment.initial} onChange={e => setPayment({...payment, initial: e.target.value})} style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 4, fontWeight:"bold", border: "1px solid #4ade80", color: "#4ade80", background:"#064e3b" }} />
                </label>
                <label style={{ fontSize: 12 }}>Método
                   <select value={payment.method} onChange={e => setPayment({...payment, method: e.target.value})} style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 4 }}>
                     {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                   </select>
                </label>
             </div>

             {payment.method === "TARJETA" && (
               <div style={{ background: "#0f172a", padding: 10, borderRadius: 6, border: "1px solid #334155", display: "grid", gap: 10 }}>
                   <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                      <label style={{ fontSize: 12, color: "#94a3b8" }}>Terminal
                         <select value={payment.terminalId} onChange={handleTerminalChange} style={{ width: "100%", padding: 6, borderRadius: 4, background: "#1e293b", color: "white", border: "1px solid #334155" }}>
                            <option value="">-- Seleccionar --</option>
                            {terminals.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                         </select>
                      </label>
                      <label style={{ fontSize: 12, color: "#f87171" }}>Comisión %
                         <input type="number" value={payment.feePercent} onChange={e => setPayment({...payment, feePercent: e.target.value})} style={{ width: "100%", padding: 6, borderRadius: 4, background: "#1e293b", color: "#f87171", border: "1px solid #f87171", fontWeight:"bold" }} />
                      </label>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <label style={{ fontSize: 12, color: "#94a3b8" }}>Plazo
                         <select value={payment.installments} onChange={handleInstallmentsChange} style={{ width: "100%", padding: 6, borderRadius: 4, background: "#1e293b", color: "white", border: "1px solid #334155" }}>
                            <option value="1">Contado</option>
                            <option value="3">3 Meses</option>
                            <option value="6">6 Meses</option>
                            <option value="9">9 Meses</option>
                            <option value="12">12 Meses</option>
                         </select>
                      </label>
                  </div>
               </div>
             )}
          </div>

          <button onClick={handleCheckout} disabled={cart.length === 0} style={{ width: "100%", padding: 12, background: cart.length > 0 ? "#16a34a" : "#333", color: "white", border: "none", borderRadius: 6, cursor: cart.length > 0 ? "pointer" : "not-allowed", fontWeight: "bold", fontSize: "1.1em" }}>
            Cobrar Venta
          </button>
        </div>
      </div>
    </section>
  );
}