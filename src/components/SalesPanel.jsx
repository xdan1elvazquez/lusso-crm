import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// Servicios (Async)
import { createSale, getSalesByPatientId, deleteSale } from "@/services/salesStorage"; 
import { getAllProducts } from "@/services/inventoryStorage"; 
import { getExamsByPatient } from "@/services/eyeExamStorage"; 
import { getConsultationsByPatient } from "@/services/consultationsStorage"; 
import { getLabs } from "@/services/labStorage"; 
import { getTerminals } from "@/services/settingsStorage"; 

import SaleDetailModal from "./SaleDetailModal"; 
import { normalizeRxValue } from "@/utils/rxOptions";
import { checkLensCompatibility, getSuggestions } from "@/utils/lensMatcher";
import { parseDiopter } from "@/utils/rxUtils";
import { useNotify, useConfirm } from "@/context/UIContext";
import { preventNegativeKey, sanitizeMoney, formatMoneyBlur } from "@/utils/inputHandlers";

const PAYMENT_METHODS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"];

export default function SalesPanel({ patientId, prefillData, onClearPrefill }) {
  const notify = useNotify();
  const confirm = useConfirm();
  const navigate = useNavigate();
  
  // Datos que vienen de la BD
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [exams, setExams] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [labsCatalog, setLabsCatalog] = useState([]);
  const [terminals, setTerminals] = useState([]);
  
  const [loadingData, setLoadingData] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 

  // Estados del Carrito y Venta
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState({ discount: "", discountType: "AMOUNT", initial: 0, method: "EFECTIVO", terminalId: "", cardType: "TDD", installments: "1", feePercent: 0 });
  const [boxNumber, setBoxNumber] = useState("");
  const [soldBy, setSoldBy] = useState(""); 
  
  // Estados de Óptica
  const [showOpticalSpecs, setShowOpticalSpecs] = useState(false);
  const [itemDetails, setItemDetails] = useState({ 
      material: "", design: "", treatment: "", 
      frameModel: "", frameStatus: "NUEVO", notes: "",
      requiresBisel: true, requiresTallado: false 
  });
  const [currentRx, setCurrentRx] = useState(normalizeRxValue());
  const [filters, setFilters] = useState({ design: "", material: "", treatment: "" });

  const [viewSale, setViewSale] = useState(null); 
  const [prodQuery, setProdQuery] = useState("");
  const [lensQuery, setLensQuery] = useState("");

  // --- CARGA DE DATOS UNIFICADA (Async) ---
  const loadAllData = async () => {
      setLoadingData(true);
      try {
          const [prodsData, salesData, examsData, consData, labsData, termsData] = await Promise.all([
              getAllProducts(),
              getSalesByPatientId(patientId),
              getExamsByPatient(patientId),
              getConsultationsByPatient(patientId),
              getLabs(),
              getTerminals()
          ]);

          setProducts(prodsData);
          setSales(salesData);
          setExams(examsData || []);
          setConsultations(consData || []);
          setTerminals(termsData || []);
          
          const allLenses = [];
          (labsData || []).forEach(lab => {
              (lab.lensCatalog || []).forEach(lens => {
                  allLenses.push({ ...lens, labName: lab.name });
              });
          });
          setLabsCatalog(allLenses);

      } catch (e) {
          console.error(e);
          notify.error("Error cargando datos de venta");
      } finally {
          setLoadingData(false);
      }
  };

  useEffect(() => {
      loadAllData();
  }, [patientId]);

  // --- MEMOS Y FILTROS ---
  const filteredProducts = useMemo(() => {
    if (!prodQuery) return [];
    return products.filter(p => p.brand.toLowerCase().includes(prodQuery.toLowerCase())).slice(0, 5);
  }, [products, prodQuery]);

  const filteredLenses = useMemo(() => {
    if (!lensQuery) return [];
    return labsCatalog.filter(l => l.name.toLowerCase().includes(lensQuery.toLowerCase())).slice(0, 5);
  }, [labsCatalog, lensQuery]);

  const filterOptions = useMemo(() => {
    const designs = new Set(); const materials = new Set(); const treatments = new Set();
    labsCatalog.forEach(l => { if(l.design) designs.add(l.design); if(l.material) materials.add(l.material); if(l.treatment) treatments.add(l.treatment); });
    return { designs: Array.from(designs).sort(), materials: Array.from(materials).sort(), treatments: Array.from(treatments).sort() };
  }, [labsCatalog]);

  const { validLenses, suggestions } = useMemo(() => {
    if (!showOpticalSpecs || (!currentRx.od.sph && currentRx.od.sph !== 0)) return { validLenses: [], suggestions: [] };
    let results = labsCatalog;
    if (filters.design) results = results.filter(l => l.design === filters.design);
    if (filters.material) results = results.filter(l => l.material === filters.material);
    if (filters.treatment) results = results.filter(l => l.treatment === filters.treatment);
    const compatibles = []; const incompatibleReasons = new Set();
    results.forEach(lens => {
        const check = checkLensCompatibility(lens, currentRx);
        if (check.compatible) compatibles.push({ ...lens, calculatedCost: check.cost, calculatedPrice: check.price });
        else incompatibleReasons.add(check.reason);
    });
    let generatedSuggestions = [];
    if (compatibles.length === 0 && (filters.design || filters.material)) {
        generatedSuggestions = getSuggestions(labsCatalog, currentRx, filters);
        if (generatedSuggestions.length === 0 && incompatibleReasons.size > 0) generatedSuggestions.push(`Fuera de rango: ${Array.from(incompatibleReasons)[0]}`);
    }
    return { validLenses: compatibles, suggestions: generatedSuggestions };
  }, [labsCatalog, filters, currentRx, showOpticalSpecs]);

  // --- HANDLERS DE PAGO ---
  const updateFee = (termId, months) => { 
      const term = terminals.find(t => t.id === termId); 
      if (!term) return 0; 
      return months === "1" ? (Number(term.fee)||0) : (Number(term.rates?.[months]) || Number(term.fee) || 0); 
  };
  const handleTerminalChange = (e) => { const tId = e.target.value; const newFee = updateFee(tId, payment.installments); setPayment(p => ({ ...p, terminalId: tId, feePercent: newFee })); };
  const handleInstallmentsChange = (e) => { const months = e.target.value; const newFee = updateFee(payment.terminalId, months); setPayment(p => ({ ...p, installments: months, feePercent: newFee })); };

  // --- CARRITO ---
  const addToCart = (item) => { 
      const specsToSave = showOpticalSpecs || item.specs ? { ...itemDetails, ...(item.specs || {}) } : {};
      setCart(prev => [...prev, { ...item, specs: specsToSave, _tempId: Date.now() + Math.random() }]); 
      setProdQuery(""); setLensQuery("");
  };
  const removeFromCart = (tempId) => setCart(prev => prev.filter(i => i._tempId !== tempId));

  // --- IMPORTADORES ---
  const handleImportExam = (e) => {
    const examId = e.target.value; if(!examId) return;
    const exam = exams.find(x => x.id === examId);
    if (!exam) return;
    const cleanRx = {
        od: { sph: parseDiopter(exam.rx.od?.sph), cyl: parseDiopter(exam.rx.od?.cyl), axis: exam.rx.od?.axis, add: parseDiopter(exam.rx.od?.add) },
        os: { sph: parseDiopter(exam.rx.os?.sph), cyl: parseDiopter(exam.rx.os?.cyl), axis: exam.rx.os?.axis, add: parseDiopter(exam.rx.os?.add) },
        pd: exam.rx.pd, notes: exam.rx.notes
    };
    setCurrentRx(cleanRx);
    setFilters({ design: exam.recommendations?.design || "", material: exam.recommendations?.material || "", treatment: exam.recommendations?.coating || "" });
    setShowOpticalSpecs(true);
    notify.success("Rx cargada.");
  };

  const handleImportConsultation = (e) => {
    const consultId = e.target.value; if(!consultId) return;
    const consultation = consultations.find(c => c.id === consultId);
    if (consultation.prescribedMeds?.length > 0) {
      consultation.prescribedMeds.forEach(med => {
         const invProd = products.find(p => p.id === med.productId);
         addToCart({ kind: "MEDICATION", description: med.productName, qty: med.qty || 1, unitPrice: med.price || 0, cost: invProd?.cost || 0, inventoryProductId: med.productId, requiresLab: false, taxable: invProd ? invProd.taxable : true });
      });
      notify.success(`Se agregaron ${consultation.prescribedMeds.length} medicamentos.`);
    } else notify.info("Sin medicamentos vinculados.");
  };

  const selectSmartLens = (lens) => {
      const finalSpecs = {
          design: lens.design, material: lens.material, treatment: lens.treatment,
          frameModel: itemDetails.frameModel || "", frameStatus: itemDetails.frameStatus || "NUEVO", notes: itemDetails.notes || "",
          requiresBisel: itemDetails.requiresBisel, requiresTallado: itemDetails.requiresTallado
      };
      addToCart({ kind: "LENSES", description: `Lente ${lens.name}`, qty: 1, unitPrice: lens.calculatedPrice || 0, cost: lens.calculatedCost, requiresLab: true, rxSnapshot: currentRx, labName: lens.labName, taxable: true, specs: finalSpecs });
  };

  const selectCatalogLens = (lens) => {
      addToCart({ kind: "LENSES", description: `Lente ${lens.name}`, qty: 1, unitPrice: 0, cost: 0, requiresLab: true, rxSnapshot: currentRx, labName: lens.labName, taxable: true });
  };

  useEffect(() => {
    if (prefillData && prefillData.type === 'EXAM') {
      const exam = prefillData.data;
      const cleanRx = {
        od: { sph: parseDiopter(exam.rx.od?.sph), cyl: parseDiopter(exam.rx.od?.cyl), axis: exam.rx.od?.axis, add: parseDiopter(exam.rx.od?.add) },
        os: { sph: parseDiopter(exam.rx.os?.sph), cyl: parseDiopter(exam.rx.os?.cyl), axis: exam.rx.os?.axis, add: parseDiopter(exam.rx.os?.add) },
        pd: exam.rx.pd, notes: exam.rx.notes
      };
      setCurrentRx(cleanRx);
      const autoSpecs = { design: exam.recommendations?.design || "", material: exam.recommendations?.material || "", treatment: exam.recommendations?.coating || "", frameModel: "", frameStatus: "NUEVO", notes: "", requiresBisel: true, requiresTallado: false };
      setFilters({ design: exam.recommendations?.design || "", material: exam.recommendations?.material || "", treatment: exam.recommendations?.coating || "" });
      setShowOpticalSpecs(true); setItemDetails(autoSpecs);
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefillData]);

  const subtotalGross = cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  let discountAmount = 0; const discountValue = Number(payment.discount) || 0;
  if (payment.discountType === "PERCENT") discountAmount = subtotalGross * (discountValue / 100); else discountAmount = discountValue;
  let finalTotal = subtotalGross - discountAmount; if(finalTotal<0) finalTotal=0;
  const calculatedFee = payment.method === "TARJETA" ? (Number(payment.initial) * Number(payment.feePercent) / 100) : 0;

  // --- COBRO (Async) ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    
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

    try {
        await createSale({
            patientId, 
            boxNumber: boxNumber || "", // Blindaje
            soldBy: soldBy || "",       // Blindaje
            discount: discountAmount, 
            total: finalTotal, 
            payments: paymentObj ? [paymentObj] : [],
            items: cart.map(item => ({
                // Blindaje contra undefined en todos los campos
                kind: item.kind || "OTHER",
                description: item.description || "Item",
                qty: Number(item.qty) || 1,
                unitPrice: Number(item.unitPrice) || 0,
                cost: Number(item.cost) || 0,
                requiresLab: Boolean(item.requiresLab),
                
                // Campos opcionales con fallback a null o string vacío
                eyeExamId: item.eyeExamId || null,
                inventoryProductId: item.inventoryProductId || null,
                rxSnapshot: item.rxSnapshot || null,
                labName: item.labName || "",
                dueDate: item.dueDate || null,
                taxable: item.taxable !== undefined ? item.taxable : true,
                specs: item.specs || null
            }))
        });
        
        setCart([]); setBoxNumber(""); setSoldBy(""); 
        setItemDetails({ material: "", design: "", treatment: "", frameModel: "", frameStatus: "NUEVO", notes: "", requiresBisel: true, requiresTallado: false }); 
        setShowOpticalSpecs(false);
        setPayment({ initial: 0, discount: "", discountType: "AMOUNT", method: "EFECTIVO", terminalId: "", cardType: "TDD", installments: "1", feePercent: 0 });
        
        await loadAllData(); 
        
        if (cart.some(i => i.requiresLab)) {
            navigate("/work-orders");
            notify.success("Venta procesada y enviada a Taller.");
        } else { 
            notify.success("Venta procesada exitosamente");
        }
    } catch(e) {
        console.error("Error en checkout:", e);
        notify.error("Error al procesar venta: " + e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteSale = async (e, saleId) => {
      e.stopPropagation(); 
      if(await confirm({ title: "Eliminar Venta", message: "¿Seguro? Se borrarán abonos y work orders.", confirmText: "Eliminar" })) {
          await deleteSale(saleId);
          await loadAllData();
          notify.success("Venta eliminada");
      }
  };

  return (
    <section style={{ background: "#1a1a1a", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
      <h3 style={{ margin: "0 0 20px 0", color: "#e5e7eb" }}>Caja y Ventas</h3>
      {viewSale && <SaleDetailModal sale={viewSale} onClose={() => setViewSale(null)} onUpdate={loadAllData} />}

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>
          {/* COLUMNA IZQ: PRODUCTOS */}
          <div style={{ background: "#111", padding: 20, borderRadius: 10, border: "1px dashed #444" }}>
            <div style={{display:"flex", gap:10, marginBottom:15}}>
                <div style={{flex:1}}><label style={{fontSize:12, color:"#fbbf24", fontWeight:"bold"}}>No. Caja</label><input value={boxNumber} onChange={e => setBoxNumber(e.target.value)} placeholder="#" style={{width:"100%", padding:8, background:"#333", border:"1px solid #fbbf24", color:"white", borderRadius:6}} /></div>
                <div style={{flex:2}}><label style={{fontSize:12, color:"#aaa"}}>Vendedor</label><input value={soldBy} onChange={e => setSoldBy(e.target.value)} placeholder="Nombre..." style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} /></div>
            </div>

            <div style={{ marginBottom: 15, padding: 10, background: "#1e3a8a", borderRadius: 6, display: "grid", gap: 10 }}>
               <select onChange={handleImportExam} style={{ width: "100%", padding: 8, borderRadius: 4, background: "rgba(0,0,0,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.2)", fontWeight: "bold" }}>
                   <option value="">👓 Importar Graduación (Examen)</option>
                   {exams.map(e => <option key={e.id} value={e.id}>{new Date(e.examDate).toLocaleDateString()}</option>)}
               </select>
               <select onChange={handleImportConsultation} style={{ width: "100%", padding: 8, borderRadius: 4, background: "rgba(0,0,0,0.2)", color: "#bfdbfe", border: "1px solid rgba(255,255,255,0.2)", fontWeight: "bold" }}>
                   <option value="">💊 Importar Receta Médica (Consulta)</option>
                   {consultations.map(c => <option key={c.id} value={c.id}>{new Date(c.visitDate).toLocaleDateString()} - {c.diagnosis}</option>)}
               </select>
               {currentRx.od.sph !== null && <div style={{fontSize:11, color:"#bfdbfe", marginTop:5}}>Rx Cargada: OD {currentRx.od.sph} / OI {currentRx.os.sph}</div>}
            </div>

            {showOpticalSpecs && (
                <div style={{ background: "#1f1f1f", padding: 10, borderRadius: 8, marginBottom: 15, border:"1px solid #60a5fa" }}>
                    <div style={{fontSize:11, color:"#60a5fa", fontWeight:"bold", marginBottom:10}}>SELECTOR DE MICA (Rx Inteligente)</div>
                    <div style={{display:"flex", gap:15, marginBottom:15, fontSize:12, color:"#ddd", background:"#333", padding:8, borderRadius:4}}>
                        <div style={{fontWeight:"bold", color:"#fbbf24"}}>SERVICIOS:</div>
                        <label style={{display:"flex", alignItems:"center", gap:5, cursor:"pointer"}}>
                            <input type="checkbox" checked={itemDetails.requiresBisel} onChange={e => setItemDetails({...itemDetails, requiresBisel: e.target.checked})} />
                            🛠️ Bisel
                        </label>
                        <label style={{display:"flex", alignItems:"center", gap:5, cursor:"pointer"}}>
                            <input type="checkbox" checked={itemDetails.requiresTallado} onChange={e => setItemDetails({...itemDetails, requiresTallado: e.target.checked})} />
                            ⚙️ Tallado
                        </label>
                    </div>

                    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10}}>
                        <select value={filters.design} onChange={e => setFilters({...filters, design: e.target.value})} style={{padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4, fontSize:12}}><option value="">-- Diseño --</option>{filterOptions.designs.map(d => <option key={d} value={d}>{d}</option>)}</select>
                        <select value={filters.material} onChange={e => setFilters({...filters, material: e.target.value})} style={{padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4, fontSize:12}}><option value="">-- Material --</option>{filterOptions.materials.map(m => <option key={m} value={m}>{m}</option>)}</select>
                        <select value={filters.treatment} onChange={e => setFilters({...filters, treatment: e.target.value})} style={{padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4, fontSize:12}}><option value="">-- Tratamiento --</option>{filterOptions.treatments.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    </div>

                    <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #333", borderRadius: 4, background: "#111" }}>
                        {validLenses.map(l => (
                            <div key={l.id} onClick={() => selectSmartLens(l)} style={{ padding: 8, cursor: "pointer", borderBottom: "1px solid #222", display:"flex", justifyContent:"space-between" }}>
                                <div><div style={{fontWeight:"bold", color:"white", fontSize:13}}>{l.name}</div><div style={{fontSize:11, color:"#aaa"}}>{l.labName} · {l.material}</div></div>
                                <div style={{textAlign:"right"}}><div style={{fontSize:12, color:"#4ade80", fontWeight:"bold"}}>${l.calculatedPrice?.toLocaleString()}</div></div>
                            </div>
                        ))}
                    </div>
                    
                    <div style={{marginTop:10, borderTop:"1px dashed #444", paddingTop:8}}>
                        <input value={lensQuery} onChange={e => setLensQuery(e.target.value)} placeholder="O busca manualmente por nombre..." style={{ width: "100%", padding: 6, background: "#222", color: "#aaa", border: "1px solid #333", borderRadius: 4, fontSize:12 }} />
                         {lensQuery && filteredLenses.length > 0 && (
                            <div style={{ position: "absolute", zIndex: 20, background: "#222", border: "1px solid #444", width: "300px" }}>
                                {filteredLenses.map(l => <div key={l.id} onClick={() => selectCatalogLens(l)} style={{padding:10, borderBottom:"1px solid #444", cursor:"pointer"}}>{l.name}</div>)}
                            </div>
                        )}
                    </div>

                    <div style={{display:"flex", gap:5, marginTop:10}}>
                         <input placeholder="Armazón (Marca/Modelo)" value={itemDetails.frameModel} onChange={e => setItemDetails({...itemDetails, frameModel:e.target.value})} style={{flex:1, padding:6, background:"#333", border:"none", color:"white", borderRadius:4, fontSize:12}} />
                         <select value={itemDetails.frameStatus} onChange={e => setItemDetails({...itemDetails, frameStatus:e.target.value})} style={{width:80, padding:6, background:"#333", border:"none", color:"#aaa", borderRadius:4, fontSize:11}}><option value="NUEVO">Nuevo</option><option value="USADO">Usado</option><option value="PROPIO">Propio</option></select>
                    </div>
                </div>
            )}

            <div style={{ position: "relative" }}>
              <label style={{ fontSize: 12, color: "#aaa" }}>Agregar otro producto</label>
              <input value={prodQuery} onChange={e => setProdQuery(e.target.value)} placeholder="Escribe marca..." style={{ width: "100%", padding: 10, background: "#222", color: "white", border: "1px solid #444", borderRadius: 6 }} />
              {filteredProducts.length > 0 && (
                <div style={{ position: "absolute", zIndex: 10, background: "#333", border: "1px solid #555", width: "100%" }}>
                  {filteredProducts.map(p => (
                    <div key={p.id} onClick={() => addToCart({ kind: p.category==="FRAMES"?"LENSES":"MEDICATION", description: `${p.brand} ${p.model}`, qty: 1, unitPrice: p.price, inventoryProductId: p.id, taxable: p.taxable })} style={{ padding: 10, cursor: "pointer", borderBottom: "1px solid #444", display:"flex", justifyContent:"space-between" }}>
                      <span>{p.brand} {p.model}</span><span style={{ color: "#4ade80" }}>${p.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {!showOpticalSpecs && <button onClick={() => setShowOpticalSpecs(true)} style={{ marginTop: 15, background: "transparent", border: "1px dashed #60a5fa", color: "#60a5fa", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: "0.9em", width: "100%" }}>👓 Lentes Graduados</button>}
          </div>

          {/* COLUMNA DER: COBRO */}
          <div style={{ background: "#111", padding: 20, borderRadius: 12, border: "1px solid #333", display: "flex", flexDirection: "column" }}>
             <h3 style={{ marginTop: 0, color: "#4ade80" }}>🛒 Carrito</h3>
             <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 20 }}>
                {cart.map((item, i) => (
                    <div key={i} style={{ background: "#222", padding: 8, borderRadius: 4, marginBottom: 5, borderLeft: item.specs?.design ? "3px solid #60a5fa" : "3px solid transparent" }}>
                        <div style={{display:"flex", justifyContent:"space-between", fontSize:13}}><span>{item.description}</span><button onClick={() => removeFromCart(item._tempId)} style={{color:"red", background:"none", border:"none"}}>✕</button></div>
                        <div style={{textAlign:"right"}}>${item.unitPrice.toLocaleString()}</div>
                    </div>
                ))}
             </div>
             
             <div style={{ borderTop: "1px solid #333", paddingTop: 15 }}>
               <div style={{ background: "#1e293b", padding: 10, borderRadius: 6, marginBottom: 15 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.4em", fontWeight: "bold", color: "white" }}><span>Total:</span><span>${finalTotal.toLocaleString()}</span></div>
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

               <button onClick={handleCheckout} disabled={cart.length === 0 || isProcessing} style={{ width: "100%", padding: 12, background: isProcessing ? "#666" : cart.length > 0 ? "#16a34a" : "#333", color: "white", border: "none", borderRadius: 6, fontWeight: "bold" }}>
                   {isProcessing ? "Procesando..." : "Cobrar Venta"}
               </button>
             </div>

             <div style={{ marginTop: 20, borderTop: "1px solid #333", paddingTop: 10 }}>
               <h4 style={{margin:"0 0 10px 0", color:"#aaa"}}>Historial Reciente</h4>
               {loadingData ? <div style={{fontSize:"0.8em", color:"#666"}}>Cargando...</div> : (
                   <div style={{display:"grid", gap:8}}>
                     {sales.slice(0,5).map(s => (
                        <div key={s.id} onClick={() => setViewSale(s)} style={{ display: "flex", justifyContent: "space-between", padding: 10, background: "#222", borderRadius: 6, cursor: "pointer", border: "1px solid #333" }}>
                            <div><div style={{fontWeight:"bold", color:"white"}}>{s.description}</div><div style={{fontSize:"0.85em", color:"#888"}}>{new Date(s.createdAt).toLocaleDateString()}</div></div>
                            <div style={{textAlign:"right"}}><div style={{fontWeight:"bold"}}>${s.total.toLocaleString()}</div><div style={{fontSize:"0.8em", color: s.balance>0 ? "#f87171" : "#4ade80"}}>{s.balance>0 ? "Pendiente" : "Pagado"}</div></div>
                        </div>
                     ))}
                   </div>
               )}
            </div>
          </div>
      </div>
    </section>
  );
}