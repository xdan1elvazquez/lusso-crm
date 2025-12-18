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

// Componentes Internos
import ProductSearch from "@/components/sales/ProductSearch";
import OpticalSelector from "@/components/sales/OpticalSelector";
import CartList from "@/components/sales/CartList";
import PaymentForm from "@/components/sales/PaymentForm";
import SaleDetailModal from "./SaleDetailModal";
import PatientSalesHistory from "@/components/sales/PatientSalesHistory"; // 👈 NUEVO IMPORT

import { imprimirTicket } from "@/utils/TicketHelper"; 

// UI Components
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input"; 
import Badge from "@/components/ui/Badge";
// Printer ya no se usa aquí arriba, se movió al componente hijo, pero lo dejo por si acaso o se puede borrar.
import { Printer } from 'lucide-react'; 

export default function SalesPanel({ patientId, prefillData, onClearPrefill, branchId }) {
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
          const baseRx = e.refraction?.finalRx || e.rx || {};
          const recs = e.recommendations || {}; 

          setCurrentRx({
              od: { sph: parseDiopter(baseRx.od?.sph), cyl: parseDiopter(baseRx.od?.cyl), axis: baseRx.od?.axis, add: parseDiopter(baseRx.od?.add) },
              os: { sph: parseDiopter(baseRx.os?.sph), cyl: parseDiopter(baseRx.os?.cyl), axis: baseRx.os?.axis, add: parseDiopter(baseRx.os?.add) },
              pd: baseRx.pd, 
              notes: baseRx.notes,
              recommendations: recs 
          });
          setShowOpticalSpecs(true);
          onClearPrefill && onClearPrefill();
      }
  }, [prefillData]);

  // Handlers UI
  const handleImportExam = (e) => {
      const examId = e.target.value;
      const exam = exams.find(x => x.id === examId);
      if(!exam) return;

      const rxData = exam.refraction?.finalRx || exam.rx || normalizeRxValue();
      const recommendations = exam.recommendations || {};

      setCurrentRx({ ...rxData, recommendations });
      setShowOpticalSpecs(true); 
      notify.success("Rx y Recomendación importadas");
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
      pos.addToCart({ 
          kind: "LENSES", description: `Lente ${lens.name}`, qty: 1, 
          unitPrice: lens.calculatedPrice || 0, originalPrice: lens.originalPrice || lens.calculatedPrice, 
          cost: lens.calculatedCost, requiresLab: true, rxSnapshot: currentRx, labName: lens.labName, specs 
      });
  };

  const handlePrintClick = (e, sale) => {
      e.stopPropagation(); 
      if (!sale) return;
      imprimirTicket(sale); 
  };

  return (
    <div className="space-y-8">
        
      {viewSale && <SaleDetailModal sale={viewSale} patient={{firstName:"", lastName:""}} onClose={()=>setViewSale(null)} onUpdate={loadData} />}

      {/* SECCIÓN POS (VENTA NUEVA) - GRID DIVIDIDO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA IZQUIERDA (8/12) - CONFIGURACIÓN Y CATÁLOGOS */}
        <div className="lg:col-span-8 space-y-6">
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

            <div className="space-y-6">
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

        {/* COLUMNA DERECHA (4/12) - CARRITO SOLAMENTE */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="flex-1 flex flex-col border-t-4 border-t-emerald-500" noPadding>
                <div className="p-5 border-b border-border bg-surfaceHighlight/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        🛒 Carrito <span className="text-xs bg-surface border border-border px-2 py-0.5 rounded-full text-textMuted">{pos.cart.length} items</span>
                    </h3>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                    <div className="flex-1 min-h-[200px]">
                        <CartList cart={pos.cart} onRemove={pos.removeFromCart} onUpdate={pos.updateCartItem} />
                    </div>
                    <PaymentForm 
                        subtotal={pos.totals.subtotal} total={pos.totals.total}
                        payment={pos.payment} setPayment={pos.setPayment}
                        terminals={terminals} onCheckout={pos.handleCheckout}
                        isProcessing={pos.isProcessing} cartLength={pos.cart.length}
                    />
                </div>
            </Card>
            
            {/* SE ELIMINÓ EL CARD DE LISTA ENORME DE VENTAS AQUÍ */}
        </div>
      </div>

      {/* SECCIÓN HISTORIAL (MODULO COMPLETO ABAJO) */}
      <div className="pt-6 border-t border-border">
          <PatientSalesHistory 
            sales={salesHistory} 
            onViewSale={setViewSale} 
            onPrint={handlePrintClick} 
          />
      </div>

    </div>
  );
}