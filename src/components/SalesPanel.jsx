import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createSale, getSalesByPatientId, deleteSale } from "@/services/salesStorage";
import { getExamsByPatient } from "@/services/eyeExamStorage"; 
import { getAllProducts } from "@/services/inventoryStorage"; 
import { getConsultationsByPatient } from "@/services/consultationsStorage"; 
import { getTerminals } from "@/services/settingsStorage"; 
import { getPatientById } from "@/services/patientsStorage"; 
import { getLabs } from "@/services/labStorage"; 
import SaleDetailModal from "./SaleDetailModal"; 
import RxPicker from "./RxPicker";
import { normalizeRxValue } from "@/utils/rxOptions";
import { checkLensCompatibility, getSuggestions } from "@/utils/lensMatcher";
// NUEVO: Utilería para normalizar números
import { parseDiopter } from "@/utils/rxUtils";

const PAYMENT_METHODS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"];

export default function SalesPanel({ patientId, prefillData, onClearPrefill }) {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [cart, setCart] = useState([]);
  
  // Estado Pago
  const [payment, setPayment] = useState({ discount: "", discountType: "AMOUNT", initial: 0, method: "EFECTIVO", terminalId: "", cardType: "TDD", installments: "1", feePercent: 0 });
  
  const [boxNumber, setBoxNumber] = useState("");
  const [soldBy, setSoldBy] = useState(""); 
  const [showOpticalSpecs, setShowOpticalSpecs] = useState(false);
  const [itemDetails, setItemDetails] = useState({ material: "", design: "", treatment: "", frameModel: "", frameStatus: "NUEVO", notes: "" });
  const [currentRx, setCurrentRx] = useState(normalizeRxValue());
  const [viewSale, setViewSale] = useState(null); 

  const [terminals, setTerminals] = useState([]);
  const [labsCatalog, setLabsCatalog] = useState([]);

  // Estado para los filtros inteligentes
  const [filters, setFilters] = useState({ design: "", material: "", treatment: "" });

  const patient = useMemo(() => getPatientById(patientId), [patientId]); 
  const sales = useMemo(() => getSalesByPatientId(patientId), [patientId, tick]);
  const exams = useMemo(() => getExamsByPatient(patientId), [patientId, tick]);
  const products = useMemo(() => getAllProducts(), []);
  const consultations = useMemo(() => getConsultationsByPatient(patientId), [patientId, tick]);
  
  const [prodQuery, setProdQuery] = useState("");
  const [lensQuery, setLensQuery] = useState("");

  const filteredProducts = useMemo(() => {
    if (!prodQuery) return [];
    return products.filter(p => p.brand.toLowerCase().includes(prodQuery.toLowerCase())).slice(0, 5);
  }, [products, prodQuery]);

  // Fallback para búsqueda manual
  const filteredLenses = useMemo(() => {
    if (!lensQuery) return [];
    return labsCatalog.filter(l => l.name.toLowerCase().includes(lensQuery.toLowerCase())).slice(0, 5);
  }, [labsCatalog, lensQuery]);

  useEffect(() => {
    const loadedTerms = getTerminals();
    setTerminals(loadedTerms);

    // Cargar catálogo de micas aplanado
    const labs = getLabs();
    const allLenses = [];
    labs.forEach(lab => {
        (lab.lensCatalog || []).forEach(lens => {
            allLenses.push({ ...lens, labName: lab.name });
        });
    });
    setLabsCatalog(allLenses);

    if (loadedTerms.length > 0 && payment.method === "TARJETA" && !payment.terminalId) {
        setPayment(p => ({ ...p, terminalId: loadedTerms[0].id, feePercent: loadedTerms[0].fee }));
    }
  }, [payment.method]);

  // --- LÓGICA INTELIGENTE RX-AWARE ---

  // 1. Opciones únicas para los filtros
  const filterOptions = useMemo(() => {
    const designs = new Set();
    const materials = new Set();
    const treatments = new Set();
    
    labsCatalog.forEach(l => {
        if(l.design) designs.add(l.design);
        if(l.material) materials.add(l.material);
        if(l.treatment) treatments.add(l.treatment);
    });

    return {
        designs: Array.from(designs).sort(),
        materials: Array.from(materials).sort(),
        treatments: Array.from(treatments).sort()
    };
  }, [labsCatalog]);

  // 2. Lista filtrada y validada
  const { validLenses, suggestions } = useMemo(() => {
    // Si no hay Rx cargada, retornamos vacío para obligar búsqueda manual o carga de Rx
    if (!showOpticalSpecs || (!currentRx.od.sph && currentRx.od.sph !== 0)) return { validLenses: [], suggestions: [] };

    let results = labsCatalog;

    // A. Filtro por Selección de Usuario
    if (filters.design) results = results.filter(l => l.design === filters.design);
    if (filters.material) results = results.filter(l => l.material === filters.material);
    if (filters.treatment) results = results.filter(l => l.treatment === filters.treatment);

    // B. Validación Clínica (Rx)
    const compatibles = [];
    const incompatibleReasons = new Set();

    results.forEach(lens => {
        const check = checkLensCompatibility(lens, currentRx);
        if (check.compatible) {
            compatibles.push({ ...lens, calculatedCost: check.cost });
        } else {
            incompatibleReasons.add(check.reason);
        }
    });

    // C. Sugerencias si no hay resultados
    let generatedSuggestions = [];
    if (compatibles.length === 0 && (filters.design || filters.material)) {
        generatedSuggestions = getSuggestions(labsCatalog, currentRx, filters);
        if (generatedSuggestions.length === 0 && incompatibleReasons.size > 0) {
            generatedSuggestions.push(`Fuera de rango: ${Array.from(incompatibleReasons)[0]}`);
        }
    }

    return { validLenses: compatibles, suggestions: generatedSuggestions };
  }, [labsCatalog, filters, currentRx, showOpticalSpecs]);

  // Lógica antigua de costo para fallback manual
  const findLensCost = (lens, rx) => {
      if (!lens.ranges || lens.ranges.length === 0) return 0;
      const sphOD = Number(rx.od.sph)||0; const cylOD = Number(rx.od.cyl)||0;
      const sphOS = Number(rx.os.sph)||0; const cylOS = Number(rx.os.cyl)||0;
      const rangeOD = lens.ranges.find(r => sphOD >= Number(r.sphMin) && sphOD <= Number(r.sphMax) && cylOD >= Number(r.cylMin) && cylOD <= Number(r.cylMax));
      const rangeOS = lens.ranges.find(r => sphOS >= Number(r.sphMin) && sphOS <= Number(r.sphMax) && cylOS >= Number(r.cylMin) && cylOS <= Number(r.cylMax));
      return (rangeOD?.cost || rangeOS?.cost) || 0;
  };

  const updateFee = (termId, months) => {
    const term = terminals.find(t => t.id === termId);
    if (!term) return 0;
    if (months === "1") return Number(term.fee) || 0;
    return Number(term.rates?.[months]) || Number(term.fee) || 0;
  };

  const handleTerminalChange = (e) => { const tId = e.target.value; const newFee = updateFee(tId, payment.installments); setPayment(p => ({ ...p, terminalId: tId, feePercent: newFee })); };
  const handleInstallmentsChange = (e) => { const months = e.target.value; const newFee = updateFee(payment.terminalId, months); setPayment(p => ({ ...p, installments: months, feePercent: newFee })); };

  // AGREGAR AL CARRITO
  const addToCart = (item) => { 
      const specsToSave = showOpticalSpecs || item.specs ? { ...itemDetails, ...(item.specs || {}) } : {};
      setCart(prev => [...prev, { ...item, specs: specsToSave, _tempId: Date.now() + Math.random() }]); 
      setProdQuery(""); setLensQuery("");
  };
  const removeFromCart = (tempId) => setCart(prev => prev.filter(i => i._tempId !== tempId));
  
  // CORRECCIÓN B2: Normalizar al importar examen
  const handleImportExam = (e) => {
    const examId = e.target.value; if(!examId) return;
    const exam = exams.find(x => x.id === examId);
    
    // Normalizamos con parseDiopter antes de guardar en estado
    const cleanRx = {
        od: { 
            sph: parseDiopter(exam.rx.od?.sph), 
            cyl: parseDiopter(exam.rx.od?.cyl), 
            axis: exam.rx.od?.axis, 
            add: parseDiopter(exam.rx.od?.add) 
        },
        os: { 
            sph: parseDiopter(exam.rx.os?.sph), 
            cyl: parseDiopter(exam.rx.os?.cyl), 
            axis: exam.rx.os?.axis,
            add: parseDiopter(exam.rx.os?.add) 
        },
        pd: exam.rx.pd, 
        notes: exam.rx.notes
    };
    
    setCurrentRx(cleanRx);
    
    const autoSpecs = { 
        design: exam.recommendations?.design || "", 
        material: exam.recommendations?.material || "", 
        treatment: exam.recommendations?.coating || "", 
        frameModel: "", frameStatus: "NUEVO", notes: "" 
    };
    
    setFilters({
        design: exam.recommendations?.design || "",
        material: exam.recommendations?.material || "",
        treatment: exam.recommendations?.coating || ""
    });

    setShowOpticalSpecs(true); 
    setItemDetails(autoSpecs);
    alert("Rx cargada. Revisa las opciones compatibles.");
  };

  // Selección Inteligente
  const selectSmartLens = (lens) => {
      const finalSpecs = {
          design: lens.design,
          material: lens.material,
          treatment: lens.treatment,
          frameModel: itemDetails.frameModel || "",
          frameStatus: itemDetails.frameStatus || "NUEVO",
          notes: itemDetails.notes || ""
      };

      addToCart({ 
          kind: "LENSES", 
          description: `Lente ${lens.name}`, 
          qty: 1, 
          unitPrice: 0, 
          cost: lens.calculatedCost, 
          requiresLab: true, 
          rxSnapshot: currentRx, 
          labName: lens.labName, 
          taxable: true,
          specs: finalSpecs
      });
  };

  // Selección Manual (Fallback)
  const selectCatalogLens = (lens) => {
      const cost = findLensCost(lens, currentRx);
      setItemDetails(prev => ({ ...prev, design: lens.design, material: lens.material, treatment: lens.treatment }));
      addToCart({ kind: "LENSES", description: `Lente ${lens.name}`, qty: 1, unitPrice: 0, cost, requiresLab: true, rxSnapshot: currentRx, labName: lens.labName, taxable: true });
  };

  const handleImportConsultation = (e) => {
    const consultId = e.target.value; if(!consultId) return;
    const consultation = consultations.find(c => c.id === consultId);
    if (consultation.prescribedMeds?.length > 0) {
      consultation.prescribedMeds.forEach(med => {
         const invProd = products.find(p => p.id === med.productId);
         addToCart({ kind: "MEDICATION", description: med.productName, qty: med.qty || 1, unitPrice: med.price || 0, cost: invProd?.cost || 0, inventoryProductId: med.productId, requiresLab: false, taxable: invProd ? invProd.taxable : true });
      });
      alert(`Se agregaron ${consultation.prescribedMeds.length} medicamentos.`);
    } else alert("Sin medicamentos vinculados.");
  };

  useEffect(() => {
    if (prefillData && prefillData.type === 'EXAM') {
      const exam = prefillData.data;
      // Normalización al cargar prefill
      const cleanRx = {
        od: { 
            sph: parseDiopter(exam.rx.od?.sph), 
            cyl: parseDiopter(exam.rx.od?.cyl), 
            axis: exam.rx.od?.axis, 
            add: parseDiopter(exam.rx.od?.add) 
        },
        os: { 
            sph: parseDiopter(exam.rx.os?.sph), 
            cyl: parseDiopter(exam.rx.os?.cyl), 
            axis: exam.rx.os?.axis,
            add: parseDiopter(exam.rx.os?.add) 
        },
        pd: exam.rx.pd, notes: exam.rx.notes
      };
      
      setCurrentRx(cleanRx);
      
      const autoSpecs = { 
          design: exam.recommendations?.design || "", 
          material: exam.recommendations?.material || "", 
          treatment: exam.recommendations?.coating || "", 
          frameModel: "", frameStatus: "NUEVO", notes: "" 
      };
      
      setFilters({
        design: exam.recommendations?.design || "",
        material: exam.recommendations?.material || "",
        treatment: exam.recommendations?.coating || ""
      });

      setShowOpticalSpecs(true); setItemDetails(autoSpecs);
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefillData]);

  const subtotalGross = cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  let discountAmount = 0; const discountValue = Number(payment.discount) || 0;
  if (payment.discountType === "PERCENT") discountAmount = subtotalGross * (discountValue / 100); else discountAmount = discountValue;
  let finalTotal = subtotalGross - discountAmount; if(finalTotal<0) finalTotal=0;

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
      patientId, boxNumber, soldBy, discount: discountAmount, total: finalTotal, payments: paymentObj ? [paymentObj] : [],
      items: cart.map(item => ({
        kind: item.kind, description: item.description, qty: item.qty, unitPrice: item.unitPrice, cost: item.cost,
        requiresLab: item.requiresLab, eyeExamId: item.eyeExamId, inventoryProductId: item.inventoryProductId,
        rxSnapshot: item.rxSnapshot, labName: item.labName, dueDate: item.dueDate, taxable: item.taxable, specs: item.specs 
      }))
    });
    setCart([]); setBoxNumber(""); setSoldBy(""); setItemDetails({ material: "", design: "", treatment: "", frameModel: "", frameStatus: "NUEVO", notes: "" }); setShowOpticalSpecs(false);
    setPayment({ initial: 0, discount: "", discountType: "AMOUNT", method: "EFECTIVO", terminalId: "", cardType: "TDD", installments: "1", feePercent: 0 });
    if (cart.some(i => i.requiresLab)) navigate("/work-orders"); else { setTick(t => t + 1); alert("Venta procesada"); }
  };
  
  const calculatedFee = payment.method === "TARJETA" ? (Number(payment.initial) * Number(payment.feePercent) / 100) : 0;

  return (
    <section style={{ background: "#1a1a1a", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
      <h3 style={{ margin: "0 0 20px 0", color: "#e5e7eb" }}>Caja y Ventas</h3>
      {viewSale && <SaleDetailModal sale={viewSale} patient={patient} onClose={() => setViewSale(null)} onUpdate={() => setTick(t=>t+1)} />}

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>
          <div style={{ background: "#111", padding: 20, borderRadius: 10, border: "1px dashed #444" }}>
            
            {/* CABECERA */}
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

            {/* ZONA DE IMPORTACIÓN DE DATOS CLÍNICOS */}
            <div style={{ marginBottom: 15, padding: 10, background: "#1e3a8a", borderRadius: 6, display: "grid", gap: 10 }}>
               
               {/* 1. Importar Rx (Lentes) */}
               <select onChange={handleImportExam} style={{ width: "100%", padding: 8, borderRadius: 4, background: "rgba(0,0,0,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.2)", fontWeight: "bold" }}>
                   <option value="">👓 Importar Graduación (Examen)</option>
                   {exams.map(e => <option key={e.id} value={e.id}>{new Date(e.examDate).toLocaleDateString()} - {e.recommendations?.design}</option>)}
               </select>

               {/* FIX B1: Restaurar Importar Receta Médica (Medicamentos) */}
               <select onChange={handleImportConsultation} style={{ width: "100%", padding: 8, borderRadius: 4, background: "rgba(0,0,0,0.2)", color: "#bfdbfe", border: "1px solid rgba(255,255,255,0.2)", fontWeight: "bold" }}>
                   <option value="">💊 Importar Receta Médica (Consulta)</option>
                   {consultations.map(c => <option key={c.id} value={c.id}>{new Date(c.visitDate).toLocaleDateString()} - {c.diagnosis}</option>)}
               </select>

               {currentRx.od.sph !== null && <div style={{fontSize:11, color:"#bfdbfe", marginTop:5}}>Rx Cargada: OD {currentRx.od.sph} / OI {currentRx.os.sph}</div>}
            </div>

            {/* DETALLES ÓPTICA Y SELECTOR INTELIGENTE */}
            {showOpticalSpecs && (
                <div style={{ background: "#1f1f1f", padding: 10, borderRadius: 8, marginBottom: 15, border:"1px solid #60a5fa" }}>
                    <div style={{fontSize:11, color:"#60a5fa", fontWeight:"bold", marginBottom:10}}>SELECTOR DE MICA (Rx Inteligente)</div>
                    
                    {/* FILTROS DROPDOWNS */}
                    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10}}>
                        <select 
                            value={filters.design} 
                            onChange={e => setFilters({...filters, design: e.target.value})} 
                            style={{padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4, fontSize:12}}
                        >
                            <option value="">-- Diseño --</option>
                            {filterOptions.designs.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        <select 
                            value={filters.material} 
                            onChange={e => setFilters({...filters, material: e.target.value})} 
                            style={{padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4, fontSize:12}}
                        >
                            <option value="">-- Material --</option>
                            {filterOptions.materials.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>

                        <select 
                            value={filters.treatment} 
                            onChange={e => setFilters({...filters, treatment: e.target.value})} 
                            style={{padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4, fontSize:12}}
                        >
                            <option value="">-- Tratamiento --</option>
                            {filterOptions.treatments.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {/* RESULTADOS O SUGERENCIAS */}
                    <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #333", borderRadius: 4, background: "#111" }}>
                        {validLenses.length > 0 ? (
                            validLenses.map(l => (
                                <div key={l.id} onClick={() => selectSmartLens(l)} style={{ padding: 8, cursor: "pointer", borderBottom: "1px solid #222", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                    <div>
                                        <div style={{fontWeight:"bold", color:"white", fontSize:13}}>{l.name}</div>
                                        <div style={{fontSize:11, color:"#aaa"}}>{l.labName} · {l.material} · {l.treatment}</div>
                                    </div>
                                    <div style={{textAlign:"right"}}>
                                        <div style={{fontSize:10, color:"#666"}}>Costo: ${l.calculatedCost}</div>
                                        <div style={{fontSize:11, color:"#4ade80"}}>Seleccionar →</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: 15, textAlign: "center", fontSize: 13, color: "#888" }}>
                                {suggestions.length > 0 ? (
                                    <>
                                        <div style={{color:"#f87171", marginBottom:5}}>No hay coincidencias exactas.</div>
                                        <ul style={{textAlign:"left", margin:0, paddingLeft:20, color:"#fbbf24"}}>
                                            {suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </>
                                ) : (
                                    currentRx.od.sph !== null ? "Usa los filtros para buscar micas compatibles." : "Carga una Rx para ver opciones inteligentes."
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Búsqueda manual como fallback */}
                    <div style={{marginTop:10, borderTop:"1px dashed #444", paddingTop:8}}>
                        <input value={lensQuery} onChange={e => setLensQuery(e.target.value)} placeholder="O busca manualmente por nombre..." style={{ width: "100%", padding: 6, background: "#222", color: "#aaa", border: "1px solid #333", borderRadius: 4, fontSize:12 }} />
                         {lensQuery && filteredLenses.length > 0 && (
                            <div style={{ position: "absolute", zIndex: 20, background: "#222", border: "1px solid #444", width: "100%" }}>
                                {filteredLenses.map(l => (
                                    <div key={l.id} onClick={() => selectCatalogLens(l)} style={{ padding: 10, cursor: "pointer", borderBottom: "1px solid #444" }}>
                                        <div style={{fontWeight:"bold", color:"white"}}>{l.name}</div>
                                        <div style={{fontSize:11, color:"#aaa"}}>{l.labName} · {l.material}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Inputs de Armazón */}
                    <div style={{display:"flex", gap:5, marginTop:10}}>
                         <input placeholder="Armazón (Marca/Modelo)" value={itemDetails.frameModel} onChange={e => setItemDetails({...itemDetails, frameModel:e.target.value})} style={{flex:1, padding:6, background:"#333", border:"none", color:"white", borderRadius:4, fontSize:12}} />
                         <select value={itemDetails.frameStatus} onChange={e => setItemDetails({...itemDetails, frameStatus:e.target.value})} style={{width:80, padding:6, background:"#333", border:"none", color:"#aaa", borderRadius:4, fontSize:11}}>
                             <option value="NUEVO">Nuevo</option><option value="USADO">Usado</option><option value="PROPIO">Propio</option>
                         </select>
                    </div>
                </div>
            )}

            {/* BUSCADOR PRODUCTOS GENERALES */}
            <div style={{ position: "relative" }}>
              <label style={{ fontSize: 12, color: "#aaa" }}>Agregar otro producto (Armazón / Accesorios)</label>
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

            {/* BOTÓN TOGGLE PARA ÓPTICA */}
            {!showOpticalSpecs && (
                <button 
                    onClick={() => setShowOpticalSpecs(true)}
                    style={{ marginTop: 15, background: "transparent", border: "1px dashed #60a5fa", color: "#60a5fa", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: "0.9em", width: "100%" }}
                >
                    👓 Agregar Detalles de Lente/Armazón Manualmente
                </button>
            )}
          </div>

          {/* DERECHA: CARRITO Y COBRO */}
          <div style={{ background: "#111", padding: 20, borderRadius: 12, border: "1px solid #333", display: "flex", flexDirection: "column" }}>
             <h3 style={{ marginTop: 0, color: "#4ade80" }}>🛒 Carrito</h3>
             <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 20 }}>
                {cart.map((item, i) => (
                    <div key={i} style={{ background: "#222", padding: 8, borderRadius: 4, marginBottom: 5, borderLeft: item.specs?.design ? "3px solid #60a5fa" : "3px solid transparent" }}>
                        <div style={{display:"flex", justifyContent:"space-between", fontSize:13}}>
                            <span>{item.description}</span>
                            <button onClick={() => removeFromCart(item._tempId)} style={{color:"red", background:"none", border:"none"}}>✕</button>
                        </div>
                        {item.cost > 0 && <div style={{fontSize:10, color:"#f87171"}}>Costo Lab: ${item.cost}</div>}
                        <div style={{display:"flex", justifyContent:"flex-end"}}>${item.unitPrice}</div>
                    </div>
                ))}
             </div>
             
             <div style={{ borderTop: "1px solid #333", paddingTop: 15 }}>
               <div style={{ background: "#1e293b", padding: 10, borderRadius: 6, marginBottom: 15 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9em", color: "#aaa", marginBottom: 5 }}><span>Subtotal:</span><span>${subtotalGross.toLocaleString()}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span style={{fontSize:"0.9em", color:"#f87171"}}>Desc:</span>
                      <div style={{ display: "flex", gap: 5 }}>
                          <input type="number" value={payment.discount} onChange={e => setPayment({...payment, discount: e.target.value})} placeholder="0" style={{ width: 60, padding: 4, background: "#0f172a", border: "1px solid #f87171", color: "#f87171", textAlign: "right", borderRadius: 4 }} />
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
               <h4 style={{margin:"0 0 10px 0", color:"#aaa"}}>Historial</h4>
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
    </section>
  );
}