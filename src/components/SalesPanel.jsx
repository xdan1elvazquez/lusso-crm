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

// Componentes Internos (Se refactorizarán en Parte B)
import ProductSearch from "@/components/sales/ProductSearch";
import OpticalSelector from "@/components/sales/OpticalSelector";
import CartList from "@/components/sales/CartList";
import PaymentForm from "@/components/sales/PaymentForm";
import SaleDetailModal from "./SaleDetailModal";

// UI Components
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

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

  const pos = usePOS(patientId, terminals, loadData);

  // Efecto Prefill
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

  const handleImportConsultation = (e) => {
    const consultId = e.target.value; 
    if(!consultId) return;
    
    const consultation = consultations.find(c => c.id === consultId);
    if (consultation && consultation.prescribedMeds?.length > 0) {
      consultation.prescribedMeds.forEach(med => {
         const invProd = products.find(p => p.id === med.productId);
         pos.addToCart({ 
             kind: "MEDICATION", description: med.productName, qty: med.qty || 1, 
             unitPrice: med.price || 0, cost: invProd?.cost || 0, 
             inventoryProductId: med.productId, requiresLab: false, taxable: invProd ? invProd.taxable : true 
         });
      });
      notify.success("Medicamentos agregados.");
    } else {
        notify.info("Sin medicamentos en esta consulta.");
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {viewSale && <SaleDetailModal sale={viewSale} patient={{firstName:"", lastName:""}} onClose={()=>setViewSale(null)} onUpdate={loadData} />}

      {/* COLUMNA IZQUIERDA (8/12) - CONFIGURACIÓN */}
      <div className="lg:col-span-8 space-y-6">
          
          {/* TARJETA DE LOGÍSTICA E IMPORTACIÓN */}
          <Card className="border-t-4 border-t-primary">
              <h3 className="text-sm font-bold text-textMuted uppercase tracking-wider mb-4">Configuración de Venta</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Input label="No. Caja / Folio Físico" value={pos.logistics.boxNumber} onChange={e=>pos.setLogistics({...pos.logistics, boxNumber:e.target.value})} className="border-yellow-500/30 focus:border-yellow-500" />
                  
                  <div>
                      <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2 ml-1">Vendedor</label>
                      <select value={pos.logistics.soldBy} onChange={e=>pos.setLogistics({...pos.logistics, soldBy:e.target.value})} className="w-full px-4 py-3 bg-background border border-border rounded-xl text-textMain text-sm focus:border-primary outline-none appearance-none">
                          <option value="">-- Seleccionar --</option>
                          {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                      </select>
                  </div>
              </div>

              {/* BARRA DE IMPORTACIÓN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surfaceHighlight rounded-xl border border-dashed border-border">
                  <div className="relative">
                      <select onChange={handleImportExam} className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-textMain focus:ring-1 focus:ring-primary outline-none cursor-pointer">
                          <option value="">Importar Graduación (Examen)</option>
                          {exams.map(e => <option key={e.id} value={e.id}>{new Date(e.examDate).toLocaleDateString()} (Rx)</option>)}
                      </select>
                      <span className="absolute left-3 top-2.5 text-base">👓</span>
                  </div>
                  
                  <div className="relative">
                      <select onChange={handleImportConsultation} className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-textMain focus:ring-1 focus:ring-primary outline-none cursor-pointer">
                          <option value="">Importar Receta (Consulta)</option>
                          {consultations.map(c => <option key={c.id} value={c.id}>{new Date(c.visitDate).toLocaleDateString()} - {c.diagnosis}</option>)}
                      </select>
                      <span className="absolute left-3 top-2.5 text-base">💊</span>
                  </div>
              </div>
          </Card>

          {/* SELECTORES DE PRODUCTOS (COMPONENTES INTERNOS) */}
          <div className="space-y-6">
              {/* Aquí se montan los componentes que aún tienen estilos viejos. 
                  Se arreglarán en la siguiente fase */}
              <OpticalSelector 
                  show={showOpticalSpecs} onToggle={()=>setShowOpticalSpecs(true)}
                  currentRx={currentRx} catalog={labsCatalog}
                  itemDetails={itemDetails} setItemDetails={setItemDetails}
                  onAddSmart={handleAddSmartLens}
                  onAddManual={(l) => pos.addToCart({kind:"LENSES", description:l.name, qty:1, unitPrice:0, requiresLab:true, rxSnapshot:currentRx})}
              />
              
              <ProductSearch products={products} onAdd={pos.addToCart} />
          </div>
      </div>

      {/* COLUMNA DERECHA (4/12) - CARRITO Y COBRO */}
      <div className="lg:col-span-4 flex flex-col gap-6">
          
          <Card className="flex-1 flex flex-col border-t-4 border-t-emerald-500" noPadding>
              <div className="p-5 border-b border-border bg-surfaceHighlight/50">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      🛒 Carrito <span className="text-xs bg-surface border border-border px-2 py-0.5 rounded-full text-textMuted">{pos.cart.length} items</span>
                  </h3>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                  {/* LISTA CARRITO */}
                  <div className="flex-1 min-h-[200px]">
                      <CartList cart={pos.cart} onRemove={pos.removeFromCart} />
                  </div>

                  {/* FORMULARIO PAGO */}
                  <PaymentForm 
                      subtotal={pos.totals.subtotal} total={pos.totals.total}
                      payment={pos.payment} setPayment={pos.setPayment}
                      terminals={terminals} onCheckout={pos.handleCheckout}
                      isProcessing={pos.isProcessing} cartLength={pos.cart.length}
                  />
              </div>
          </Card>

          {/* HISTORIAL RÁPIDO */}
          <Card className="max-h-80 overflow-y-auto custom-scrollbar" noPadding>
              <div className="p-4 bg-surfaceHighlight/30 sticky top-0 backdrop-blur-sm border-b border-border">
                  <h4 className="text-xs font-bold text-textMuted uppercase">Últimas Ventas</h4>
              </div>
              <div className="divide-y divide-border">
                  {salesHistory.slice(0,5).map(s => (
                      <div key={s.id} onClick={()=>setViewSale(s)} className="p-4 cursor-pointer hover:bg-surfaceHighlight transition-colors group">
                          <div className="flex justify-between items-center mb-1">
                              <div className="font-bold text-white group-hover:text-primary transition-colors">{s.description}</div>
                              <div className="font-bold text-emerald-400">${s.total.toLocaleString()}</div>
                          </div>
                          <div className="flex justify-between items-center text-xs text-textMuted">
                              <div>{new Date(s.createdAt).toLocaleDateString()}</div>
                              <Badge color={s.saleType==="LAB"?"blue":"gray"}>{s.saleType==="LAB"?"TALLER":"SIMPLE"}</Badge>
                          </div>
                      </div>
                  ))}
              </div>
          </Card>
      </div>
    </div>
  );
}