import React, { useState, useEffect } from "react";
import { updateSaleLogistics, processReturn, updateSalePaymentMethod } from "@/services/salesStorage"; 
import { getAllWorkOrders, updateWorkOrder } from "@/services/workOrdersStorage";
import { getLabs } from "@/services/labStorage"; 
import { getEmployees } from "@/services/employeesStorage"; 
import WorkOrderEditForm from "./sales/WorkOrderEditForm";

// UI Kit
import ModalWrapper from "@/components/ui/ModalWrapper";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export default function SaleDetailModal({ sale, patient, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState("GENERAL");
  const [soldBy, setSoldBy] = useState(sale.soldBy || "");
  const [editingPaymentId, setEditingPaymentId] = useState(null); 
  const [tempMethod, setTempMethod] = useState("");

  const [labs, setLabs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [editingWO, setEditingWO] = useState(null); 

  const isLabSale = sale.saleType === "LAB" || (!sale.saleType && sale.items.some(i => i.requiresLab));

  useEffect(() => {
      Promise.all([getLabs(), getEmployees(), getAllWorkOrders()]).then(([l, e, w]) => {
          setLabs(l); setEmployees(e);
          setWorkOrders(w.filter(wo => wo.saleId === sale.id));
      });
  }, [sale.id]);

  const handleSaveWO = async (data) => {
      await updateWorkOrder(editingWO, data);
      setWorkOrders(prev => prev.map(w => w.id === editingWO ? { ...w, ...data } : w));
      setEditingWO(null);
      alert("Actualizado");
  };

  const handleSaveLogistics = async () => {
      await updateSaleLogistics(sale.id, { soldBy });
      onUpdate && onUpdate();
      alert("Guardado");
  };

  const handleReturn = async (item) => {
      const q = Number(prompt(`Cantidad a devolver (Máx ${item.qty}):`, 1));
      if(q > 0 && q <= item.qty && confirm("¿Confirmar devolución?")) {
          await processReturn(sale.id, item.id, q);
          onUpdate && onUpdate(); onClose();
      }
  };

  const handlePaymentUpdate = async (pid) => {
      if(await updateSalePaymentMethod(sale.id, pid, tempMethod)) {
          setEditingPaymentId(null); onUpdate && onUpdate();
      }
  };

  const TabBtn = ({ id, label }) => (
      <button 
        onClick={() => setActiveTab(id)} 
        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab===id ? "border-primary text-primary bg-surfaceHighlight/20" : "border-transparent text-textMuted hover:text-white"}`}
      >
          {label}
      </button>
  );

  return (
    <ModalWrapper title={`Ticket #${sale.id.slice(0,6).toUpperCase()}`} onClose={onClose} width="800px">
        {/* HEADER EXTRA */}
        <div className="flex justify-between items-center mb-4 -mt-2">
            <Badge color={isLabSale ? "blue" : "purple"}>{isLabSale ? "👓 Óptica" : "🛍️ Mostrador"}</Badge>
            <span className="text-xs text-textMuted">{new Date(sale.createdAt).toLocaleString()}</span>
        </div>

        <div className="flex border-b border-border mb-4">
            <TabBtn id="GENERAL" label="1. General" />
            {isLabSale && <TabBtn id="LAB" label="2. Taller" />}
            <TabBtn id="PAYMENTS" label="3. Pagos" />
        </div>

        <div className="space-y-4 min-h-[300px]">
            {activeTab === "GENERAL" && (
                <div className="space-y-4">
                    <div className="bg-surfaceHighlight/30 p-4 rounded-xl flex justify-between items-center border border-border">
                        <div>
                            <div className="text-xs text-textMuted uppercase font-bold">Cliente</div>
                            <div className="font-bold text-white text-lg">{patient?.firstName} {patient?.lastName}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-textMuted uppercase font-bold mb-1">Vendedor</div>
                            <div className="flex gap-2 items-center">
                                <input 
                                    value={soldBy} 
                                    onChange={e=>setSoldBy(e.target.value)} 
                                    className="bg-background border border-border rounded px-2 py-1 text-sm text-white focus:border-primary outline-none" 
                                />
                                <button onClick={handleSaveLogistics} className="text-primary hover:text-white" title="Guardar">💾</button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {sale.items.map((item, i) => (
                            <div key={i} className="border border-border p-3 rounded-lg flex justify-between items-center bg-background">
                                <div>
                                    <div className="font-medium text-white">{item.description}</div>
                                    <div className="text-xs text-textMuted flex gap-2">
                                        <span>Cant: {item.qty}</span>
                                        {item.rxSnapshot && <span className="text-blue-400">· Con Rx</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-emerald-400">${item.unitPrice.toLocaleString()}</div>
                                    {item.qty > 0 && <button onClick={()=>handleReturn(item)} className="text-[10px] text-red-400 hover:underline mt-1">Devolver</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === "LAB" && isLabSale && (
                <div className="space-y-3">
                    {workOrders.map(wo => (
                        <div key={wo.id} className="bg-background p-4 rounded-xl border-l-4 border-blue-500 border-y border-r border-border">
                            <div className="flex justify-between mb-2">
                                <strong className="text-white text-sm">{wo.type} - {wo.labName}</strong>
                                <Badge color="gray">{wo.status}</Badge>
                            </div>
                            {editingWO === wo.id ? (
                                <WorkOrderEditForm wo={wo} labs={labs} employees={employees} onSave={handleSaveWO} onCancel={()=>setEditingWO(null)} />
                            ) : (
                                <div className="flex justify-between items-center text-xs text-textMuted">
                                    <span>Costo: ${wo.labCost} | Envía: {wo.courier||"-"}</span>
                                    <button onClick={()=>setEditingWO(wo.id)} className="text-blue-400 hover:text-white underline">Editar Detalles</button>
                                </div>
                            )}
                        </div>
                    ))}
                    {workOrders.length === 0 && <p className="text-textMuted italic text-center py-4">Sin órdenes de trabajo generadas.</p>}
                </div>
            )}

            {activeTab === "PAYMENTS" && (
                <div className="bg-surfaceHighlight/10 p-5 rounded-xl border border-border">
                    <div className="flex justify-between mb-6 text-xl font-bold">
                        <span className="text-white">Total: ${sale.total.toLocaleString()}</span>
                        <span className={sale.balance>0 ? "text-red-400" : "text-emerald-400"}>Saldo: ${sale.balance.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                        {sale.payments.map(p => (
                            <div key={p.id} className="flex justify-between items-center border-b border-border/50 pb-2 last:border-0 text-sm">
                                <span className="text-textMuted">{new Date(p.paidAt).toLocaleDateString()}</span>
                                {editingPaymentId === p.id ? (
                                    <select autoFocus value={tempMethod} onChange={e=>setTempMethod(e.target.value)} className="bg-background text-white border border-border rounded px-2 py-1 text-xs"><option>EFECTIVO</option><option>TARJETA</option><option>TRANSFERENCIA</option></select>
                                ) : <span className="text-white font-medium w-32 text-center">{p.method}</span>}
                                <span className="text-emerald-400 font-bold w-24 text-right">${p.amount.toLocaleString()}</span>
                                {editingPaymentId === p.id ? (
                                    <button onClick={()=>handlePaymentUpdate(p.id)} className="text-emerald-400">💾</button>
                                ) : (
                                    <button onClick={()=>{setEditingPaymentId(p.id); setTempMethod(p.method)}} className="text-textMuted hover:text-white">✏️</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </ModalWrapper>
  );
}