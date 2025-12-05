import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePOS } from "@/hooks/usePOS"; 
import { getAllProducts } from "@/services/inventoryStorage"; 
import { getExamsByPatient } from "@/services/eyeExamStorage"; 
import { getConsultationsByPatient } from "@/services/consultationsStorage"; 
import { getLabs } from "@/services/labStorage"; 
import { getTerminals } from "@/services/settingsStorage"; 
import { getEmployees } from "@/services/employeesStorage"; 
import { getSalesByPatientId, deleteSale } from "@/services/salesStorage"; 

import { normalizeRxValue } from "@/utils/rxOptions";
import { parseDiopter } from "@/utils/rxUtils";
import { useNotify, useConfirm } from "@/context/UIContext";

import ProductSearch from "@/components/sales/ProductSearch";
import OpticalSelector from "@/components/sales/OpticalSelector";
import CartList from "@/components/sales/CartList";
import PaymentForm from "@/components/sales/PaymentForm";
import SaleDetailModal from "./SaleDetailModal";

export default function SalesPanel({ patientId, prefillData, onClearPrefill }) {
  const navigate = useNavigate();
  const notify = useNotify();
  const confirm = useConfirm();

  // Carga de catálogos
  const [products, setProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [exams, setExams] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [labsCatalog, setLabsCatalog] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [viewSale, setViewSale] = useState(null);

  // Estados UI Locales
  const [showOpticalSpecs, setShowOpticalSpecs] = useState(false);
  const [itemDetails, setItemDetails] = useState({ material: "", design: "", treatment: "", frameModel: "", frameStatus: "NUEVO", requiresBisel: true });
  const [currentRx, setCurrentRx] = useState(normalizeRxValue());

  const loadData = async () => {
      const [p, s, x, c, l, t, e] = await Promise.all([
          getAllProducts(), getSalesByPatientId(patientId), getExamsByPatient(patientId),
          getConsultationsByPatient(patientId), getLabs(), getTerminals(), getEmployees()
      ]);
      setProducts(p); setSalesHistory(s); setExams(x); setConsultations(c); setTerminals(t); setEmployees(e);
      const flats = []; l.forEach(lab => lab.lensCatalog?.forEach(lens => flats.push({...lens, labName: lab.name})));
      setLabsCatalog(flats);
  };

  useEffect(() => { loadData(); }, [patientId]);

  // Hook POS
  const pos = usePOS(patientId, terminals, loadData);

  // Efecto Prefill (desde Examen)
  useEffect(() => {
      if (prefillData?.type === 'EXAM') {
          const e = prefillData.data;
          setCurrentRx({
              od: { sph: parseDiopter(e.rx.od?.sph), cyl: parseDiopter(e.rx.od?.cyl), axis: e.rx.od?.axis, add: parseDiopter(e.rx.od?.add) },
              os: { sph: parseDiopter(e.rx.os?.sph), cyl: parseDiopter(e.rx.os?.cyl), axis: e.rx.os?.axis, add: parseDiopter(e.rx.os?.add) },
              pd: e.rx.pd, notes: e.rx.notes
          });
          setShowOpticalSpecs(true);
          onClearPrefill && onClearPrefill();
      }
  }, [prefillData]);

  // Handlers UI
  const handleImportExam = (e) => {
      const exam = exams.find(x => x.id === e.target.value);
      if(!exam) return;
      setCurrentRx(exam.rx); setShowOpticalSpecs(true); notify.success("Rx importada");
      e.target.value = "";
  };

  // 🧠 RECUPERADO: Importar medicamentos de consulta
  const handleImportConsultation = (e) => {
    const consultId = e.target.value; 
    if(!consultId) return;
    
    const consultation = consultations.find(c => c.id === consultId);
    if (consultation && consultation.prescribedMeds?.length > 0) {
      consultation.prescribedMeds.forEach(med => {
         const invProd = products.find(p => p.id === med.productId);
         // Usamos pos.addToCart del hook
         pos.addToCart({ 
             kind: "MEDICATION", 
             description: med.productName, 
             qty: med.qty || 1, 
             unitPrice: med.price || 0, 
             cost: invProd?.cost || 0, 
             inventoryProductId: med.productId, 
             requiresLab: false, // Medicamentos son venta simple
             taxable: invProd ? invProd.taxable : true 
         });
      });
      notify.success("Medicamentos agregados al carrito.");
    } else {
        notify.info("Esta consulta no tiene medicamentos recetados.");
    }
    e.target.value = "";
  };

  const handleAddSmartLens = (lens) => {
      const specs = { ...itemDetails, design: lens.design, material: lens.material, treatment: lens.treatment };
      pos.addToCart({ kind: "LENSES", description: `Lente ${lens.name}`, qty: 1, unitPrice: lens.calculatedPrice || 0, cost: lens.calculatedCost, requiresLab: true, rxSnapshot: currentRx, labName: lens.labName, specs });
  };

  const handleDeleteSale = async (e, id) => {
      e.stopPropagation();
      if(await confirm({title:"Eliminar", message:"¿Borrar venta permanentemente?"})) {
          await deleteSale(id); loadData(); notify.success("Eliminada");
      }
  };

  return (
    <section style={{ background: "#1a1a1a", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
      <h3 style={{ margin: "0 0 20px 0", color: "#e5e7eb" }}>Caja y Ventas</h3>
      {viewSale && <SaleDetailModal sale={viewSale} patient={{firstName:"", lastName:""}} onClose={()=>setViewSale(null)} onUpdate={loadData} />}

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>
          {/* COLUMNA IZQUIERDA: INPUTS */}
          <div style={{ background: "#111", padding: 20, borderRadius: 10, border: "1px dashed #444" }}>
              <div style={{display:"flex", gap:10, marginBottom:15}}>
                  <div style={{flex:1}}><label style={{fontSize:12, color:"#fbbf24"}}>No. Caja</label><input value={pos.logistics.boxNumber} onChange={e=>pos.setLogistics({...pos.logistics, boxNumber:e.target.value})} style={{width:"100%", padding:8, background:"#333", border:"1px solid #fbbf24", color:"white", borderRadius:6}} /></div>
                  <div style={{flex:2}}>
                      <label style={{fontSize:12, color:"#aaa"}}>Vendedor</label>
                      <select value={pos.logistics.soldBy} onChange={e=>pos.setLogistics({...pos.logistics, soldBy:e.target.value})} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}}>
                          <option value="">-- Seleccionar --</option>
                          {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                      </select>
                  </div>
              </div>

              <div style={{marginBottom:15, padding:10, background:"#1e3a8a", borderRadius:6, display:"grid", gap:10}}>
                  <select onChange={handleImportExam} style={{width:"100%", padding:8, background:"rgba(0,0,0,0.3)", color:"white", border:"1px solid rgba(255,255,255,0.2)", borderRadius:4, fontWeight:"bold"}}>
                      <option value="">👓 Importar Graduación (Examen)</option>
                      {exams.map(e => <option key={e.id} value={e.id}>{new Date(e.examDate).toLocaleDateString()}</option>)}
                  </select>
                  {/* 👇 Selector recuperado */}
                  <select onChange={handleImportConsultation} style={{width:"100%", padding:8, background:"rgba(0,0,0,0.3)", color:"#bfdbfe", border:"1px solid rgba(255,255,255,0.2)", borderRadius:4, fontWeight:"bold"}}>
                      <option value="">💊 Importar Receta Médica (Consulta)</option>
                      {consultations.map(c => <option key={c.id} value={c.id}>{new Date(c.visitDate).toLocaleDateString()} - {c.diagnosis}</option>)}
                  </select>
              </div>

              <OpticalSelector 
                  show={showOpticalSpecs} onToggle={()=>setShowOpticalSpecs(true)}
                  currentRx={currentRx} catalog={labsCatalog}
                  itemDetails={itemDetails} setItemDetails={setItemDetails}
                  onAddSmart={handleAddSmartLens}
                  onAddManual={(l) => pos.addToCart({kind:"LENSES", description:l.name, qty:1, unitPrice:0, requiresLab:true, rxSnapshot:currentRx})}
              />
              <ProductSearch products={products} onAdd={pos.addToCart} />
          </div>

          {/* COLUMNA DERECHA: CARRITO */}
          <div style={{ background: "#111", padding: 20, borderRadius: 12, border: "1px solid #333", display: "flex", flexDirection: "column" }}>
              <h3 style={{ marginTop: 0, color: "#4ade80" }}>🛒 Carrito</h3>
              <CartList cart={pos.cart} onRemove={pos.removeFromCart} />
              
              <PaymentForm 
                  subtotal={pos.totals.subtotal} total={pos.totals.total}
                  payment={pos.payment} setPayment={pos.setPayment}
                  terminals={terminals} onCheckout={pos.handleCheckout}
                  isProcessing={pos.isProcessing} cartLength={pos.cart.length}
              />

              <div style={{marginTop:20, borderTop:"1px solid #333", paddingTop:10}}>
                  <h4 style={{margin:"0 0 10px 0", color:"#aaa"}}>Historial</h4>
                  <div style={{display:"grid", gap:8}}>
                      {salesHistory.slice(0,5).map(s => (
                          <div key={s.id} onClick={()=>setViewSale(s)} style={{display:"flex", justifyContent:"space-between", padding:10, background:"#222", borderRadius:6, cursor:"pointer", borderLeft: s.saleType==="LAB"?"3px solid #60a5fa":"3px solid #333"}}>
                              <div><div style={{fontWeight:"bold", color:"white"}}>{s.description}</div><div style={{fontSize:"0.8em", color:"#888"}}>{new Date(s.createdAt).toLocaleDateString()}</div></div>
                              <div style={{textAlign:"right"}}><div style={{fontWeight:"bold"}}>${s.total.toLocaleString()}</div><div style={{fontSize:"0.7em", color: s.saleType==="LAB"?"#60a5fa":"#aaa"}}>{s.saleType==="LAB"?"TALLER":"SIMPLE"}</div></div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>
    </section>
  );
}