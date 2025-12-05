import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createSale, getSalesByPatientId, deleteSale } from "@/services/salesStorage"; 
import { getAllProducts } from "@/services/inventoryStorage"; 
import { getExamsByPatient } from "@/services/eyeExamStorage"; 
import { getConsultationsByPatient } from "@/services/consultationsStorage"; 
import { getLabs } from "@/services/labStorage"; 
import { getTerminals } from "@/services/settingsStorage"; 
import { getEmployees } from "@/services/employeesStorage"; 

import SaleDetailModal from "./SaleDetailModal"; 
import { normalizeRxValue } from "@/utils/rxOptions";
import { parseDiopter } from "@/utils/rxUtils";
import { useNotify, useConfirm } from "@/context/UIContext";

// Componentes Refactorizados
import ProductSearch from "@/components/sales/ProductSearch";
import OpticalSelector from "@/components/sales/OpticalSelector";
import CartList from "@/components/sales/CartList";
import PaymentForm from "@/components/sales/PaymentForm";

export default function SalesPanel({ patientId, prefillData, onClearPrefill }) {
  const notify = useNotify();
  const confirm = useConfirm();
  const navigate = useNavigate();
  
  // Datos
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [exams, setExams] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [labsCatalog, setLabsCatalog] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [loadingData, setLoadingData] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 

  // Estado Venta
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState({ discount: "", discountType: "AMOUNT", initial: 0, method: "EFECTIVO", terminalId: "", cardType: "TDD", installments: "1", feePercent: 0 });
  const [boxNumber, setBoxNumber] = useState("");
  const [soldBy, setSoldBy] = useState(""); 
  
  // Estado Óptica
  const [showOpticalSpecs, setShowOpticalSpecs] = useState(false);
  const [itemDetails, setItemDetails] = useState({ material: "", design: "", treatment: "", frameModel: "", frameStatus: "NUEVO", notes: "", requiresBisel: true, requiresTallado: false });
  const [currentRx, setCurrentRx] = useState(normalizeRxValue());

  const [viewSale, setViewSale] = useState(null); 

  // Carga inicial
  const loadAllData = async () => {
      setLoadingData(true);
      try {
          const [prodsData, salesData, examsData, consData, labsData, termsData, empsData] = await Promise.all([
              getAllProducts(),
              getSalesByPatientId(patientId),
              getExamsByPatient(patientId),
              getConsultationsByPatient(patientId),
              getLabs(),
              getTerminals(),
              getEmployees()
          ]);

          setProducts(prodsData);
          setSales(salesData);
          setExams(examsData || []);
          setConsultations(consData || []);
          setTerminals(termsData || []);
          setEmployees(empsData || []);
          
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

  useEffect(() => { loadAllData(); }, [patientId]);

  // Handlers Carrito
  const addToCart = (item) => { 
      const specsToSave = showOpticalSpecs || item.specs ? { ...itemDetails, ...(item.specs || {}) } : {};
      setCart(prev => [...prev, { ...item, specs: specsToSave, _tempId: Date.now() + Math.random() }]); 
  };
  const removeFromCart = (tempId) => setCart(prev => prev.filter(i => i._tempId !== tempId));

  // Handlers Micas
  const handleAddSmartLens = (lens) => {
      const finalSpecs = {
          design: lens.design, material: lens.material, treatment: lens.treatment,
          frameModel: itemDetails.frameModel || "", frameStatus: itemDetails.frameStatus || "NUEVO", notes: itemDetails.notes || "",
          requiresBisel: itemDetails.requiresBisel, requiresTallado: itemDetails.requiresTallado
      };
      addToCart({ kind: "LENSES", description: `Lente ${lens.name}`, qty: 1, unitPrice: lens.calculatedPrice || 0, cost: lens.calculatedCost, requiresLab: true, rxSnapshot: currentRx, labName: lens.labName, taxable: true, specs: finalSpecs });
  };

  const handleAddManualLens = (lens) => {
      // Intentamos calcular costo aunque sea manual
      const cost = 0; // Simplificado, podríamos reusar findLensCost si fuera necesario
      setItemDetails(prev => ({ ...prev, design: lens.design, material: lens.material, treatment: lens.treatment }));
      addToCart({ kind: "LENSES", description: `Lente ${lens.name}`, qty: 1, unitPrice: 0, cost, requiresLab: true, rxSnapshot: currentRx, labName: lens.labName, taxable: true });
  };

  // Handlers Importación
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
      notify.success("Medicamentos agregados.");
    } else notify.info("Sin medicamentos.");
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
      setShowOpticalSpecs(true);
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefillData]);

  // Cálculos totales
  const subtotalGross = cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  let discountAmount = 0; const discountValue = Number(payment.discount) || 0;
  if (payment.discountType === "PERCENT") discountAmount = subtotalGross * (discountValue / 100); else discountAmount = discountValue;
  let finalTotal = Math.max(0, subtotalGross - discountAmount);

  // Cobro
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
            patientId, boxNumber: boxNumber || "", soldBy: soldBy || "", discount: discountAmount, total: finalTotal, payments: paymentObj ? [paymentObj] : [],
            items: cart.map(item => ({
                kind: item.kind || "OTHER", description: item.description || "Item", qty: Number(item.qty)||1, unitPrice: Number(item.unitPrice)||0, cost: Number(item.cost)||0,
                requiresLab: Boolean(item.requiresLab), eyeExamId: item.eyeExamId||null, inventoryProductId: item.inventoryProductId||null,
                rxSnapshot: item.rxSnapshot||null, labName: item.labName||"", dueDate: item.dueDate||null, taxable: item.taxable!==undefined?item.taxable:true, specs: item.specs||null
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
        } else notify.success("Venta procesada exitosamente");
        
    } catch(e) {
        console.error(e);
        notify.error("Error: " + e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteSale = async (e, saleId) => {
      e.stopPropagation(); 
      if(await confirm({ title: "Eliminar", message: "¿Borrar esta venta permanentemente?", confirmText: "Borrar" })) {
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
          <div style={{ background: "#111", padding: 20, borderRadius: 10, border: "1px dashed #444" }}>
            <div style={{display:"flex", gap:10, marginBottom:15}}>
                <div style={{flex:1}}><label style={{fontSize:12, color:"#fbbf24", fontWeight:"bold"}}>No. Caja</label><input value={boxNumber} onChange={e => setBoxNumber(e.target.value)} placeholder="#" style={{width:"100%", padding:8, background:"#333", border:"1px solid #fbbf24", color:"white", borderRadius:6}} /></div>
                <div style={{flex:2}}>
                    <label style={{fontSize:12, color:"#aaa"}}>Vendedor</label>
                    <select value={soldBy} onChange={e => setSoldBy(e.target.value)} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}}>
                        <option value="">-- Seleccionar --</option>
                        {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                    </select>
                </div>
            </div>

            <div style={{ marginBottom: 15, padding: 10, background: "#1e3a8a", borderRadius: 6, display: "grid", gap: 10 }}>
               <select onChange={handleImportExam} style={{ width: "100%", padding: 8, borderRadius: 4, background: "rgba(0,0,0,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.2)", fontWeight: "bold" }}><option value="">👓 Importar Graduación (Examen)</option>{exams.map(e => <option key={e.id} value={e.id}>{new Date(e.examDate).toLocaleDateString()}</option>)}</select>
               <select onChange={handleImportConsultation} style={{ width: "100%", padding: 8, borderRadius: 4, background: "rgba(0,0,0,0.2)", color: "#bfdbfe", border: "1px solid rgba(255,255,255,0.2)", fontWeight: "bold" }}><option value="">💊 Importar Receta Médica (Consulta)</option>{consultations.map(c => <option key={c.id} value={c.id}>{new Date(c.visitDate).toLocaleDateString()} - {c.diagnosis}</option>)}</select>
               {currentRx.od.sph !== null && <div style={{fontSize:11, color:"#bfdbfe", marginTop:5}}>Rx Cargada: OD {currentRx.od.sph} / OI {currentRx.os.sph}</div>}
            </div>

            <OpticalSelector 
                show={showOpticalSpecs} 
                onToggle={() => setShowOpticalSpecs(true)}
                currentRx={currentRx}
                catalog={labsCatalog}
                itemDetails={itemDetails}
                setItemDetails={setItemDetails}
                onAddSmart={handleAddSmartLens}
                onAddManual={handleAddManualLens}
            />

            <ProductSearch products={products} onAdd={addToCart} />
          </div>

          <div style={{ background: "#111", padding: 20, borderRadius: 12, border: "1px solid #333", display: "flex", flexDirection: "column" }}>
             <h3 style={{ marginTop: 0, color: "#4ade80" }}>🛒 Carrito</h3>
             <CartList cart={cart} onRemove={removeFromCart} />
             
             <PaymentForm 
                subtotal={subtotalGross}
                total={finalTotal}
                payment={payment}
                setPayment={setPayment}
                terminals={terminals}
                onCheckout={handleCheckout}
                isProcessing={isProcessing}
                cartLength={cart.length}
             />

             <div style={{ marginTop: 20, borderTop: "1px solid #333", paddingTop: 10 }}>
               <h4 style={{margin:"0 0 10px 0", color:"#aaa"}}>Historial Reciente</h4>
               {loadingData ? <div style={{fontSize:"0.8em", color:"#666"}}>Cargando...</div> : (
                   <div style={{display:"grid", gap:8}}>
                     {sales.slice(0,5).map(s => (
                        <div key={s.id} onClick={() => setViewSale(s)} style={{ display: "flex", justifyContent: "space-between", padding: 10, background: "#222", borderRadius: 6, cursor: "pointer", border: "1px solid #333" }}>
                            <div><div style={{fontWeight:"bold", color:"white"}}>{s.description}</div><div style={{fontSize:"0.85em", color:"#888"}}>{new Date(s.createdAt).toLocaleDateString()}</div></div>
                            <div style={{textAlign:"right"}}>
                                <div style={{fontWeight:"bold"}}>${s.total.toLocaleString()}</div>
                                <button onClick={(e) => handleDeleteSale(e, s.id)} style={{marginTop: 5, color:"#666", fontSize:10, background:"none", border:"none", textDecoration:"underline", cursor:"pointer"}}>Eliminar</button>
                            </div>
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