import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createSale, getSalesByPatientId, deleteSale } from "@/services/salesStorage";
import { getExamsByPatient } from "@/services/eyeExamStorage"; 
import { getAllProducts } from "@/services/inventoryStorage"; 
import { getConsultationsByPatient } from "@/services/consultationsStorage"; 
import { getTerminals } from "@/services/settingsStorage"; 
import { getPatientById } from "@/services/patientsStorage"; 
import SaleDetailModal from "./SaleDetailModal"; 
import RxPicker from "./RxPicker";
import { normalizeRxValue } from "@/utils/rxOptions";

const PAYMENT_METHODS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"];

export default function SalesPanel({ patientId, prefillData, onClearPrefill }) {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [cart, setCart] = useState([]);
  
  // Estado Pago
  const [payment, setPayment] = useState({ discount: "", discountType: "AMOUNT", initial: 0, method: "EFECTIVO", terminalId: "", cardType: "TDD", installments: "1", feePercent: 0 });
  
  // Datos Generales
  const [boxNumber, setBoxNumber] = useState("");
  const [soldBy, setSoldBy] = useState(""); 

  // ESTADO VISUAL: ¿Mostrar campos de óptica?
  const [showOpticalSpecs, setShowOpticalSpecs] = useState(false);

  // Detalles Técnicos (Specs)
  const [itemDetails, setItemDetails] = useState({ material: "", design: "", treatment: "", frameModel: "", frameStatus: "NUEVO", notes: "" });

  const [viewSale, setViewSale] = useState(null); 

  const [terminals, setTerminals] = useState([]);
  const patient = useMemo(() => getPatientById(patientId), [patientId]); 
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
    if (months === "1") return Number(term.fee) || 0;
    return Number(term.rates?.[months]) || Number(term.fee) || 0;
  };

  const handleTerminalChange = (e) => { const tId = e.target.value; const newFee = updateFee(tId, payment.installments); setPayment(p => ({ ...p, terminalId: tId, feePercent: newFee })); };
  const handleInstallmentsChange = (e) => { const months = e.target.value; const newFee = updateFee(payment.terminalId, months); setPayment(p => ({ ...p, installments: months, feePercent: newFee })); };

  const addToCart = (item) => { 
      // Solo guardamos specs si el panel de óptica estaba abierto O si el item las requiere
      const specsToSave = showOpticalSpecs || item.specs ? { ...itemDetails, ...(item.specs || {}) } : {};
      
      setCart(prev => [...prev, { 
          ...item, 
          specs: specsToSave,
          _tempId: Date.now() + Math.random() 
      }]); 
      
      setProdQuery("");
      // No reseteamos los detalles de inmediato por si quiere agregar otro lente igual, 
      // pero si quieres resetear descomenta:
      // setItemDetails({ material: "", design: "", treatment: "", frameModel: "", frameStatus: "NUEVO", notes: "" });
  };

  const removeFromCart = (tempId) => setCart(prev => prev.filter(i => i._tempId !== tempId));
  
  const handleImportExam = (e) => {
    const examId = e.target.value; if(!examId) return;
    const exam = exams.find(x => x.id === examId);
    let desc = "Lentes Completos"; 
    const autoSpecs = {
        design: exam.recommendations?.design || "",
        material: exam.recommendations?.material || "",
        treatment: exam.recommendations?.coating || "",
        frameModel: "", frameStatus: "NUEVO", notes: ""
    };
    // Al importar examen, mostramos los campos automáticamente
    setShowOpticalSpecs(true);
    setItemDetails(autoSpecs); // Pre-llenar inputs visuales
    
    addToCart({ kind: "LENSES", description: desc, qty: 1, unitPrice: 0, requiresLab: true, eyeExamId: exam.id, rxSnapshot: normalizeRxValue(exam.rx), labName: "", dueDate: "", taxable: true, specs: autoSpecs });
  };

  const handleImportConsultation = (e) => {
    const consultId = e.target.value; if(!consultId) return;
    const consultation = consultations.find(c => c.id === consultId);
    if (consultation.prescribedMeds?.length > 0) {
      consultation.prescribedMeds.forEach(med => {
         const invProd = products.find(p => p.id === med.productId);
         addToCart({ kind: "MEDICATION", description: med.productName, qty: med.qty || 1, unitPrice: med.price || 0, inventoryProductId: med.productId, requiresLab: false, taxable: invProd ? invProd.taxable : true });
      });
      alert(`Se agregaron ${consultation.prescribedMeds.length} medicamentos.`);
    } else alert("Sin medicamentos vinculados.");
  };

  useEffect(() => {
    if (prefillData && prefillData.type === 'EXAM') {
      const exam = prefillData.data;
      const autoSpecs = { design: exam.recommendations?.design || "", material: exam.recommendations?.material || "", treatment: exam.recommendations?.coating || "", frameModel: "", frameStatus: "NUEVO", notes: "" };
      setShowOpticalSpecs(true);
      setItemDetails(autoSpecs);
      addToCart({ kind: "LENSES", description: "Lentes Completos", qty: 1, unitPrice: 0, requiresLab: true, eyeExamId: exam.id, rxSnapshot: normalizeRxValue(exam.rx), labName: "", dueDate: "", taxable: true, specs: autoSpecs });
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefillData]);

  const subtotalGross = cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  let discountAmount = 0; const discountValue = Number(payment.discount) || 0;
  if (payment.discountType === "PERCENT") discountAmount = subtotalGross * (discountValue / 100); else discountAmount = discountValue;
  let finalTotal = subtotalGross - discountAmount; if(finalTotal<0) finalTotal=0;
  const calculatedFee = payment.method === "TARJETA" ? (Number(payment.initial) * Number(payment.feePercent) / 100) : 0;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const amount = Number(payment.initial);
    let paymentObj = null;
    if (amount > 0) {
        paymentObj = { amount, method: payment.method, paidAt: new Date().toISOString() };
        if (payment.method === "TARJETA") {
            const term = terminals.find(t => t.id === payment.terminalId);
            const feeAmount = (amount * (Number(payment.feePercent)||0)) / 100;
            paymentObj = { ...paymentObj, terminal: term ? term.name : "Desconocida", cardType: payment.cardType, installments: payment.installments, feeAmount };
        }
    }

    createSale({
      patientId, boxNumber, soldBy,
      discount: discountAmount, total: finalTotal, payments: paymentObj ? [paymentObj] : [],
      items: cart.map(item => ({
        kind: item.kind, description: item.description, qty: item.qty, unitPrice: item.unitPrice,
        requiresLab: item.requiresLab, eyeExamId: item.eyeExamId || null, inventoryProductId: item.inventoryProductId || null,
        rxSnapshot: item.rxSnapshot || null, labName: item.labName || "", dueDate: item.dueDate || null, taxable: item.taxable,
        specs: item.specs 
      }))
    });

    setCart([]); setBoxNumber(""); setSoldBy(""); setItemDetails({ material: "", design: "", treatment: "", frameModel: "", frameStatus: "NUEVO", notes: "" }); setShowOpticalSpecs(false);
    setPayment({ initial: 0, discount: "", discountType: "AMOUNT", method: "EFECTIVO", terminalId: "", cardType: "TDD", installments: "1", feePercent: 0 });
    if (cart.some(i => i.requiresLab)) navigate("/work-orders"); else { setTick(t => t + 1); alert("Venta procesada"); }
  };

  const handleDelete = (id) => { if(confirm("¿Eliminar venta?")) { deleteSale(id); setTick(t => t + 1); } };

  return (
    <section style={{ background: "#1a1a1a", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
      <h3 style={{ margin: "0 0 20px 0", color: "#e5e7eb" }}>Caja y Ventas</h3>
      {viewSale && <SaleDetailModal sale={viewSale} patient={patient} onClose={() => setViewSale(null)} onUpdate={() => setTick(t=>t+1)} />}

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>
          
          {/* IZQUIERDA: CONSTRUCTOR DE VENTA */}
          <div style={{ background: "#111", padding: 20, borderRadius: 10, border: "1px dashed #444" }}>
            
            {/* CAJA Y VENDEDOR (GENERAL) */}
            <div style={{display:"flex", gap:10, marginBottom:15}}>
                <div style={{flex:1}}>
                    <label style={{fontSize:12, color:"#fbbf24", fontWeight:"bold"}}>No. Caja</label>
                    <input value={boxNumber} onChange={e => setBoxNumber(e.target.value)} placeholder="#" style={{width:"100%", padding:8, background:"#333", border:"1px solid #fbbf24", color:"white", borderRadius:6}} />
                </div>
                <div style={{flex:2}}>
                    <label style={{fontSize:12, color:"#aaa"}}>Vendedor</label>
                    <input value={soldBy} onChange={e => setSoldBy(e.target.value)} placeholder="Nombre..." style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} />
                </div>
            </div>

            {/* BUSCADOR GENERAL */}
            <div style={{ marginBottom: 15, position: "relative" }}>
              <label style={{ fontSize: 12, color: "#aaa" }}>Buscar Producto / Servicio</label>
              <input value={prodQuery} onChange={e => setProdQuery(e.target.value)} placeholder="Escribe marca, modelo, servicio..." style={{ width: "100%", padding: 10, background: "#222", color: "white", border: "1px solid #444", borderRadius: 6 }} />
              {filteredProducts.length > 0 && (
                <div style={{ position: "absolute", zIndex: 10, background: "#333", border: "1px solid #555", width: "100%", maxHeight: 200, overflowY:"auto" }}>
                  {filteredProducts.map(p => (
                    <div key={p.id} onClick={() => addToCart({ kind: p.category==="FRAMES"?"LENSES":"MEDICATION", description: `${p.brand} ${p.model}`, qty: 1, unitPrice: p.price, inventoryProductId: p.id, taxable: p.taxable })} style={{ padding: 10, cursor: "pointer", borderBottom: "1px solid #444", display:"flex", justifyContent:"space-between" }}>
                      <span>{p.brand} {p.model}</span><span style={{ color: "#4ade80" }}>${p.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÓN TOGGLE PARA ÓPTICA */}
            <div style={{marginBottom:15}}>
                <button 
                    onClick={() => setShowOpticalSpecs(!showOpticalSpecs)}
                    style={{ background: "transparent", border: "1px dashed #60a5fa", color: "#60a5fa", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: "0.9em", width: "100%" }}
                >
                    {showOpticalSpecs ? "✕ Ocultar Detalles de Lente/Armazón" : "👓 Agregar Detalles de Lente/Armazón (Óptica)"}
                </button>
            </div>

            {/* DETALLES TÉCNICOS (SOLO SI ESTÁ ACTIVADO) */}
            {showOpticalSpecs && (
                <div style={{ background: "#1f1f1f", padding: 10, borderRadius: 8, marginBottom: 15, border:"1px solid #60a5fa", animation: "fadeIn 0.3s" }}>
                    <div style={{fontSize:11, color:"#60a5fa", fontWeight:"bold", marginBottom:5}}>ESPECIFICACIONES (Se agregarán al siguiente producto)</div>
                    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                        <input placeholder="Diseño (Bifocal, Prog...)" value={itemDetails.design} onChange={e => setItemDetails({...itemDetails, design:e.target.value})} style={{padding:6, background:"#333", border:"none", color:"white", borderRadius:4, fontSize:12}} />
                        <input placeholder="Material (Poly, Hi-Index)" value={itemDetails.material} onChange={e => setItemDetails({...itemDetails, material:e.target.value})} style={{padding:6, background:"#333", border:"none", color:"white", borderRadius:4, fontSize:12}} />
                        <input placeholder="Tratamiento (AR, Blue...)" value={itemDetails.treatment} onChange={e => setItemDetails({...itemDetails, treatment:e.target.value})} style={{padding:6, background:"#333", border:"none", color:"white", borderRadius:4, fontSize:12}} />
                        <div style={{display:"flex", gap:5}}>
                            <input placeholder="Armazón (Modelo)" value={itemDetails.frameModel} onChange={e => setItemDetails({...itemDetails, frameModel:e.target.value})} style={{flex:1, padding:6, background:"#333", border:"none", color:"white", borderRadius:4, fontSize:12}} />
                            <select value={itemDetails.frameStatus} onChange={e => setItemDetails({...itemDetails, frameStatus:e.target.value})} style={{width:80, padding:6, background:"#333", border:"none", color:"#aaa", borderRadius:4, fontSize:11}}>
                                <option value="NUEVO">Nuevo</option><option value="USADO">Usado</option><option value="PROPIO">Propio</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display:"flex", gap:10 }}>
               <select onChange={handleImportExam} style={{ flex:1, padding: 8, borderRadius: 6, background:"#1e3a8a", color:"white", border:"none" }}><option value="">Importar Rx (Lentes)</option>{exams.map(e => <option key={e.id} value={e.id}>{new Date(e.examDate).toLocaleDateString()} - {e.recommendations?.design}</option>)}</select>
               <select onChange={handleImportConsultation} style={{ flex:1, padding: 8, borderRadius: 6, background:"#064e3b", color:"white", border:"none" }}><option value="">Importar Receta Med</option>{consultations.map(c => <option key={c.id} value={c.id}>{new Date(c.visitDate).toLocaleDateString()} - {c.diagnosis}</option>)}</select>
            </div>
          </div>

          {/* DERECHA: CARRITO Y COBRO */}
          <div style={{ background: "#111", padding: 20, borderRadius: 12, border: "1px solid #333", display: "flex", flexDirection: "column" }}>
            <h3 style={{ marginTop: 0, color: "#4ade80" }}>🛒 Carrito</h3>
            <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 20 }}>
              {cart.map((item, i) => (
                <div key={i} style={{ background: "#222", padding: 8, borderRadius: 4, marginBottom: 5, borderLeft: item.specs?.design ? "3px solid #60a5fa" : "3px solid transparent" }}>
                   <div style={{display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:"bold"}}>
                      <span>{item.description}</span>
                      <button onClick={() => removeFromCart(item._tempId)} style={{color:"red", background:"none", border:"none"}}>✕</button>
                   </div>
                   {item.specs?.design && <div style={{fontSize:11, color:"#aaa"}}>{item.specs.design} / {item.specs.material}</div>}
                   <div style={{display:"flex", justifyContent:"flex-end", gap:10, marginTop:4}}>
                      <span style={{fontSize:12, color:"#aaa"}}>${item.unitPrice} x {item.qty}</span>
                   </div>
                </div>
              ))}
            </div>

            {/* ... (RESTO DEL COMPONENTE DE COBRO Y TARJETAS IGUAL) ... */}
            <div style={{ borderTop: "1px solid #333", paddingTop: 15 }}>
              <div style={{ background: "#1e293b", padding: 10, borderRadius: 6, marginBottom: 15 }}>
                 <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9em", color: "#aaa", marginBottom: 5 }}><span>Subtotal:</span><span>${subtotalGross.toLocaleString()}</span></div>
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{fontSize:"0.9em", color:"#f87171"}}>Desc:</span>
                    <div style={{ display: "flex", gap: 5 }}>
                        <input type="number" value={payment.discount} onChange={e => setPayment({...payment, discount: e.target.value})} placeholder="0" style={{ width: 60, padding: 4, background: "#0f172a", border: "1px solid #f87171", color: "#f87171", textAlign: "right" }} />
                        <select value={payment.discountType} onChange={e => setPayment({...payment, discountType: e.target.value})} style={{ padding: "0 4px", background: "#0f172a", border: "1px solid #f87171", color: "#f87171", fontSize: "0.8em" }}><option value="AMOUNT">$</option><option value="PERCENT">%</option></select>
                    </div>
                 </div>
                 <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.4em", fontWeight: "bold", color: "white" }}><span>Total:</span><span>${finalTotal.toLocaleString()}</span></div>
              </div>

              <div style={{ display: "grid", gap: 12, marginBottom: 15 }}>
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input type="number" value={payment.initial} onChange={e => setPayment({...payment, initial: e.target.value})} placeholder="Abono" style={{ width: "100%", padding: 8, borderRadius: 4, fontWeight: "bold" }} />
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

               <button onClick={handleCheckout} disabled={cart.length === 0} style={{ width: "100%", padding: 12, background: cart.length > 0 ? "#16a34a" : "#333", color: "white", border: "none", borderRadius: 6, fontWeight: "bold" }}>Cobrar Venta</button>
            </div>

            {/* HISTORIAL */}
            <div style={{ marginTop: 20, borderTop: "1px solid #333", paddingTop: 10 }}>
               <h4 style={{margin:"0 0 10px 0", color:"#aaa"}}>Historial (Clic para detalles)</h4>
               <div style={{display:"grid", gap:8}}>
                 {sales.map(s => (
                    <div key={s.id} onClick={() => setViewSale(s)} style={{ display: "flex", justifyContent: "space-between", padding: 10, background: "#222", borderRadius: 6, cursor: "pointer", border: "1px solid #333" }}>
                        <div><div style={{fontWeight:"bold", color:"white"}}>{s.description}</div><div style={{fontSize:"0.85em", color:"#888"}}>{new Date(s.createdAt).toLocaleDateString()}</div></div>
                        <div style={{textAlign:"right"}}><div style={{fontWeight:"bold"}}>${s.total.toLocaleString()}</div><div style={{fontSize:"0.8em", color: s.balance>0 ? "#f87171" : "#4ade80"}}>{s.balance>0 ? "Pendiente" : "Pagado"}</div></div>
                    </div>
                 ))}
               </div>
            </div>
          </div>

      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </section>
  );
}