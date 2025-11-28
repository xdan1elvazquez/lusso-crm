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
  
  const [payment, setPayment] = useState({ 
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

  // --- LÓGICA INTELIGENTE DE COMISIONES ---
  const updateFee = (termId, months) => {
    const term = terminals.find(t => t.id === termId);
    if (!term) return 0;

    // Si es contado (1 mes), usa la base. Si no, busca en la tabla de rates.
    if (months === "1") return term.fee;
    return term.rates?.[months] || term.fee; // Fallback a base si no hay config
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

  // ... (Resto de funciones addToCart, etc. IGUAL) ...
  const addToCart = (item) => { setCart(prev => [...prev, { ...item, _tempId: Date.now() + Math.random() }]); setProdQuery(""); };
  const removeFromCart = (tempId) => setCart(prev => prev.filter(i => i._tempId !== tempId));
  const handleImportExam = (e) => {
    const examId = e.target.value; if(!examId) return;
    const exam = exams.find(x => x.id === examId);
    let desc = "Lentes Completos"; if(exam.recommendations?.design) desc += ` - ${exam.recommendations.design}`;
    addToCart({ kind: "LENSES", description: desc, qty: 1, unitPrice: 0, requiresLab: true, eyeExamId: exam.id, rxSnapshot: normalizeRxValue(exam.rx), labName: "", dueDate: "" });
  };
  const handleImportConsultation = (e) => {
    const consultId = e.target.value; if(!consultId) return;
    const consultation = consultations.find(c => c.id === consultId);
    if (consultation.prescribedMeds?.length > 0) {
      consultation.prescribedMeds.forEach(med => addToCart({ kind: "MEDICATION", description: med.productName, qty: med.qty || 1, unitPrice: med.price || 0, inventoryProductId: med.productId, requiresLab: false }));
      alert(`Se agregaron ${consultation.prescribedMeds.length} medicamentos.`);
    } else alert("Sin medicamentos vinculados.");
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const amount = Number(payment.initial);

    let paymentObj = null;
    if (amount > 0) {
        paymentObj = { amount, method: payment.method, paidAt: new Date().toISOString() };
        if (payment.method === "TARJETA") {
            if (!payment.terminalId && terminals.length > 0) { alert("Selecciona terminal"); return; }
            const term = terminals.find(t => t.id === payment.terminalId);
            const finalFeePercent = Number(payment.feePercent) || 0;
            const feeAmount = (amount * finalFeePercent) / 100;

            paymentObj = {
                ...paymentObj,
                terminal: term ? term.name : "Desconocida",
                cardType: payment.cardType,
                installments: payment.installments,
                feeAmount: feeAmount 
            };
        }
    }

    createSale({
      patientId,
      total,
      payments: paymentObj ? [paymentObj] : [],
      items: cart.map(item => ({
        kind: item.kind, description: item.description, qty: item.qty, unitPrice: item.unitPrice,
        requiresLab: item.requiresLab, eyeExamId: item.eyeExamId || null, inventoryProductId: item.inventoryProductId || null,
        rxSnapshot: item.rxSnapshot || null, labName: item.labName || "", dueDate: item.dueDate || null,
      }))
    });

    setCart([]);
    setPayment({ initial: 0, method: "EFECTIVO", terminalId: "", cardType: "TDD", installments: "1", feePercent: 0 });
    if (cart.some(i => i.requiresLab)) navigate("/work-orders");
    else { setTick(t => t + 1); alert("Venta procesada"); }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitPrice)), 0);
  const calculatedFee = payment.method === "TARJETA" ? (Number(payment.initial) * Number(payment.feePercent) / 100) : 0;

  return (
    <section style={{ background: "#1a1a1a", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
      <h3 style={{ margin: "0 0 20px 0", color: "#e5e7eb" }}>Caja y Ventas</h3>

      <div style={{ background: "#111", padding: 20, borderRadius: 10, marginBottom: 20, border: "1px dashed #444" }}>
        <div style={{ marginBottom: 20, position: "relative" }}>
          <label style={{ fontSize: 12, color: "#aaa" }}>Buscar Producto</label>
          <input value={prodQuery} onChange={e => setProdQuery(e.target.value)} placeholder="Escribe marca..." style={{ width: "100%", padding: 10, background: "#222", border: "1px solid #444", color: "white", borderRadius: 6 }} />
          {filteredProducts.length > 0 && (
            <div style={{ position: "absolute", top: "100%", width: "100%", background: "#333", border: "1px solid #555", zIndex: 10 }}>
              {filteredProducts.map(p => (
                <div key={p.id} onClick={() => addToCart({
                  kind: p.category === "FRAMES" ? "LENSES" : "MEDICATION",
                  description: `${p.brand} ${p.model}`, qty: 1, unitPrice: p.price, inventoryProductId: p.id, requiresLab: p.category === "FRAMES"
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
                  <strong style={{fontSize:13}}>{item.description}</strong>
                  <button onClick={() => removeFromCart(item._tempId)} style={{color:"#f87171", background:"none", border:"none"}}>✕</button>
               </div>
               <div style={{display:"flex", gap:10}}>
                  <label style={{fontSize:11, color:"#aaa"}}>Cant: <input type="number" value={item.qty} onChange={e => {const n=[...cart]; n[idx].qty=e.target.value; setCart(n)}} style={{width:30, background:"#333", border:"none", color:"white"}} /></label>
                  <label style={{fontSize:11, color:"#aaa"}}>Precio: $<input type="number" value={item.unitPrice} onChange={e => {const n=[...cart]; n[idx].unitPrice=e.target.value; setCart(n)}} style={{width:60, background:"#333", border:"none", color:"white"}} /></label>
               </div>
               {item.requiresLab && <input placeholder="Laboratorio destino" value={item.labName} onChange={e => {const n=[...cart]; n[idx].labName=e.target.value; setCart(n)}} style={{fontSize:11, background:"#333", border:"none", color:"#ddd", width:"100%"}} />}
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #333", paddingTop: 15 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.3em", fontWeight: "bold", marginBottom: 15 }}>
            <span>Total:</span>
            <span>${cartTotal.toLocaleString()}</span>
          </div>

          <div style={{ display: "grid", gap: 12, marginBottom: 15 }}>
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 12 }}>Anticipo
                   <input type="number" value={payment.initial} onChange={e => setPayment({...payment, initial: e.target.value})} style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 4, fontWeight:"bold" }} />
                </label>
                <label style={{ fontSize: 12 }}>Método
                   <select value={payment.method} onChange={e => setPayment({...payment, method: e.target.value})} style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 4 }}>
                     {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                   </select>
                </label>
             </div>

             {/* --- TARJETA: DETALLES DE COMISIÓN --- */}
             {payment.method === "TARJETA" && (
               <div style={{ background: "#1e293b", padding: 10, borderRadius: 6, border: "1px solid #334155", display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                      <label style={{ fontSize: 12, color: "#94a3b8" }}>Terminal
                         <select value={payment.terminalId} onChange={handleTerminalChange} style={{ width: "100%", padding: 6, borderRadius: 4, background: "#0f172a", color: "white", border: "1px solid #334155" }}>
                            <option value="">-- Seleccionar --</option>
                            {terminals.map(t => <option key={t.id} value={t.id}>{t.name} ({t.fee}%)</option>)}
                         </select>
                      </label>
                      <label style={{ fontSize: 12, color: "#f87171" }}>Comisión %
                         <input type="number" value={payment.feePercent} onChange={e => setPayment({...payment, feePercent: e.target.value})} style={{ width: "100%", padding: 6, borderRadius: 4, background: "#0f172a", color: "#f87171", border: "1px solid #f87171", fontWeight:"bold" }} />
                      </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <label style={{ fontSize: 12, color: "#94a3b8" }}>Plazo
                         <select value={payment.installments} onChange={handleInstallmentsChange} style={{ width: "100%", padding: 6, borderRadius: 4, background: "#0f172a", color: "white", border: "1px solid #334155" }}>
                            <option value="1">Contado</option>
                            <option value="3">3 Meses</option>
                            <option value="6">6 Meses</option>
                            <option value="9">9 Meses</option>
                            <option value="12">12 Meses</option>
                         </select>
                      </label>
                      <div style={{ fontSize: 11, color: "#64748b", alignSelf:"center", textAlign:"right" }}>
                          Retención:<br/>
                          <strong style={{color: "#f87171", fontSize:14}}>${calculatedFee.toLocaleString("es-MX", {minimumFractionDigits:2})}</strong>
                      </div>
                  </div>
               </div>
             )}
          </div>

          <button onClick={handleCheckout} disabled={cart.length === 0} style={{ width: "100%", padding: 12, background: cart.length > 0 ? "#16a34a" : "#333", color: "white", border: "none", borderRadius: 6, cursor: cart.length > 0 ? "pointer" : "not-allowed", fontWeight: "bold", fontSize: "1.1em" }}>Cobrar Venta</button>
        </div>
      </div>
    </section>
  );
}