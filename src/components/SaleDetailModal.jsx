import React, { useState, useEffect } from "react";
import { 
    updateSaleLogistics, 
    processReturn, 
    updateSalePaymentMethod, 
    getSaleById, 
    addPaymentToSale,
    deletePaymentFromSale 
} from "@/services/salesStorage"; 
import { getAllWorkOrders, updateWorkOrder } from "@/services/workOrdersStorage";
import { getLabs } from "@/services/labStorage"; 
import { getEmployees } from "@/services/employeesStorage"; 
import { getTerminals } from "@/services/settingsStorage"; 
import { useAuth } from "@/context/AuthContext"; // 👈 Para obtener nombre de sucursal
import WorkOrderEditForm from "./sales/WorkOrderEditForm";

// Servicios de Impresión
import { printWorkOrderQZ } from "@/services/QZService"; // 👈 Nuevo servicio QZ
import { imprimirTicket } from "@/utils/TicketHelper";   // 👈 Helper Ticket Venta

// UI Kit
import ModalWrapper from "@/components/ui/ModalWrapper";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select"; 
import Input from "@/components/ui/Input";   

export default function SaleDetailModal({ sale: initialSale, patient, onClose, onUpdate }) {
  const { currentBranch } = useAuth(); // Obtener config de la sucursal actual
  const [sale, setSale] = useState(initialSale);
  const [activeTab, setActiveTab] = useState("GENERAL");
  
  // --- ESTADOS VENDEDOR ---
  const [soldBy, setSoldBy] = useState(sale.soldBy || "");
  const [isEditingSeller, setIsEditingSeller] = useState(false);

  // --- ESTADOS DEVOLUCIÓN ---
  const [refundMethod, setRefundMethod] = useState("EFECTIVO");
  const [returnToStock, setReturnToStock] = useState(true);

  // --- ESTADOS PAGOS ---
  const [editingPaymentId, setEditingPaymentId] = useState(null); 
  const [tempMethod, setTempMethod] = useState("");
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: "", method: "EFECTIVO", note: "", terminal: "", cardType: "CONTADO" });

  // --- DATA ---
  const [labs, setLabs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [editingWO, setEditingWO] = useState(null); 

  const isLabSale = sale.saleType === "LAB" || (!sale.saleType && sale.items.some(i => i.requiresLab));

  useEffect(() => {
      Promise.all([getLabs(), getEmployees(), getAllWorkOrders(), getTerminals()]).then(([l, e, w, t]) => {
          setLabs(l); setEmployees(e);
          setWorkOrders(w.filter(wo => wo.saleId === sale.id));
          setTerminals(t);
      });
  }, [sale.id]);

  const refreshLocalSale = async () => {
      const fresh = await getSaleById(sale.id);
      if (fresh) {
          setSale(fresh);
          if (!isEditingSeller) setSoldBy(fresh.soldBy || ""); 
      }
      onUpdate && onUpdate();
  };

  const handleSaveLogistics = async () => {
      await updateSaleLogistics(sale.id, { soldBy });
      setIsEditingSeller(false);
      refreshLocalSale();
      alert("Vendedor actualizado correctamente.");
  };

  const handleAddPayment = async () => {
      const amount = Number(newPayment.amount);
      if (!amount || amount <= 0) return alert("Ingresa un monto válido.");
      if (amount > sale.balance + 0.01) return alert("El monto excede el saldo pendiente.");
      if (newPayment.method === "TARJETA" && !newPayment.terminal) return alert("Por favor selecciona una Terminal Bancaria.");

      try {
          await addPaymentToSale(sale.id, newPayment);
          alert("Abono registrado exitosamente.");
          setNewPayment({ amount: "", method: "EFECTIVO", note: "", terminal: "", cardType: "CONTADO" });
          setShowAddPayment(false);
          refreshLocalSale();
      } catch (error) {
          console.error(error);
          alert(error.message);
      }
  };

  const handlePaymentUpdate = async (pid) => {
      if(await updateSalePaymentMethod(sale.id, pid, tempMethod)) {
          setEditingPaymentId(null); 
          refreshLocalSale();
      }
  };

  const handleDeletePayment = async (paymentId, amount) => {
      if (confirm(`¿Estás seguro de eliminar este pago de $${amount.toLocaleString()}?\n\nEl saldo de la venta se ajustará automáticamente.`)) {
          try {
              await deletePaymentFromSale(sale.id, paymentId);
              refreshLocalSale();
              alert("Pago eliminado correctamente.");
          } catch (error) {
              console.error(error);
              alert("Error al eliminar pago: " + error.message);
          }
      }
  };

  const handleReturn = async (item) => {
      const q = Number(prompt(`Cantidad a devolver (Máx ${item.qty}):`, 1));
      if(q > 0 && q <= item.qty) {
          const stockMsg = returnToStock ? (item.inventoryProductId ? "✅ SÍ regresará al inventario." : "⚠️ NO regresará (Ítem sin vínculo).") : "❌ NO regresará (Merma).";
          if (confirm(`CONFIRMAR DEVOLUCIÓN:\n\n- Producto: ${item.description}\n- Cantidad: ${q}\n- Reembolso vía: ${refundMethod}\n- Stock: ${stockMsg}\n\n¿Proceder?`)) {
              const result = await processReturn(sale.id, item.id, q, refundMethod, returnToStock);
              await refreshLocalSale();
              if (result && result.stockError) alert(`⚠️ DINERO DEVUELTO, PERO STOCK FALLÓ:\n${result.stockError}`);
              else alert("Devolución procesada.");
          }
      }
  };

  const handleSaveWO = async (data) => {
      await updateWorkOrder(editingWO, data);
      setWorkOrders(prev => prev.map(w => w.id === editingWO ? { ...w, ...data } : w));
      setEditingWO(null);
      alert("Orden actualizada");
  };

  // ==========================================
  // 🖨️ NUEVA LÓGICA: IMPRIMIR ORDEN TALLER
  // ==========================================
  const handlePrintWorkOrder = async () => {
    try {
        // 1. Buscar lente con Rx
        const lensItem = sale.items.find(i => i.kind === 'LENSES' || i.kind === 'CONTACT_LENS');
        
        if (!lensItem) {
            return alert("⚠️ Esta venta no contiene lentes graduados para generar orden.");
        }

        // 2. Buscar armazón
        const frameItem = sale.items.find(i => i.kind === 'FRAMES');

        // 3. Preparar RX BLINDADA (Asegurar que OD y OI existan siempre)
        const snapshot = lensItem.rxSnapshot || {};

        // Mapeamos posibles nombres (od/right, oi/os/left) y aseguramos objetos vacíos {} si falta alguno
        const safeRx = {
            od: snapshot.od || snapshot.right || {},
            oi: snapshot.oi || snapshot.os || snapshot.left || {} 
        };

        // 3. Preparar datos para el ticket
        const workOrderData = {
            id: sale.id,
            patientName: sale.patientName,
            boxNumber: sale.boxNumber || "S/N", // Asegúrate que venga de la venta
            shopName: currentBranch?.name || "LUSSO VISUAL",
            
            // Rx Snapshot guardado al vender
            rx: safeRx,
            
            // Specs del lente
            lens: {
                design: lensItem.specs?.design || lensItem.description,
                material: lensItem.specs?.material || "",
                treatment: lensItem.specs?.treatment || ""
            },
            
            // Armazón
            frame: frameItem ? {
                description: frameItem.description,
                model: frameItem.model || ""
            } : null
        };

        // 4. Enviar a QZ
        await printWorkOrderQZ(workOrderData);
        // alert("Orden enviada a impresora 🖨️");

    } catch (error) {
        console.error(error);
        alert("Error al imprimir: Revisa que QZ Tray esté abierto.");
    }
  };

  const TabBtn = ({ id, label }) => (
      <button onClick={() => setActiveTab(id)} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab===id ? "border-primary text-primary bg-surfaceHighlight/20" : "border-transparent text-textMuted hover:text-white"}`}>
          {label}
      </button>
  );

  return (
    <ModalWrapper title={`Ticket #${sale.id.slice(0,6).toUpperCase()}`} onClose={onClose} width="800px">
        <div className="flex justify-between items-center mb-4 -mt-2">
            <div className="flex gap-2">
                <Badge color={isLabSale ? "blue" : "purple"}>{isLabSale ? "👓 Óptica" : "🛍️ Mostrador"}</Badge>
                <Badge color={sale.status === "REFUNDED" ? "gray" : sale.status === "PAID" ? "green" : "red"}>{sale.status === "PAID" ? "PAGADO" : sale.status === "REFUNDED" ? "REEMBOLSADO" : "PENDIENTE"}</Badge>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-xs text-textMuted">{new Date(sale.createdAt).toLocaleString()}</span>
                {sale.boxNumber && <span className="text-xs font-bold text-amber-400">Caja: #{sale.boxNumber}</span>}
            </div>
        </div>

        <div className="flex border-b border-border mb-4">
            <TabBtn id="GENERAL" label="1. General" />
            {isLabSale && <TabBtn id="LAB" label="2. Taller" />}
            <TabBtn id="PAYMENTS" label="3. Pagos" />
        </div>

        <div className="space-y-4 min-h-[300px]">
            {activeTab === "GENERAL" && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="bg-surfaceHighlight/30 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center border border-border gap-4">
                        <div>
                            <div className="text-xs text-textMuted uppercase font-bold">Cliente</div>
                            <div className="font-bold text-white text-lg">{patient?.firstName || sale.patientName} {patient?.lastName}</div>
                        </div>
                        <div className="text-right w-full md:w-auto">
                            <div className="text-xs text-textMuted uppercase font-bold mb-1">Atendido por</div>
                            {!isEditingSeller ? (
                                <div className="flex items-center justify-end gap-2 group cursor-pointer" onClick={() => setIsEditingSeller(true)}>
                                    <span className="text-white font-medium border-b border-dashed border-textMuted/50 hover:border-primary transition-colors">{soldBy || "Sin asignar"}</span>
                                    <span className="text-xs text-textMuted group-hover:text-primary transition-colors">✏️</span>
                                </div>
                            ) : (
                                <div className="flex gap-2 items-center justify-end">
                                    <select value={soldBy} onChange={e => setSoldBy(e.target.value)} className="bg-background border border-border rounded px-2 py-1 text-sm text-white focus:border-primary outline-none max-w-[200px]">
                                        <option value="">-- Seleccionar --</option>
                                        {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                                    </select>
                                    <button onClick={handleSaveLogistics} className="text-emerald-400 hover:text-emerald-300" title="Guardar">💾</button>
                                    <button onClick={() => { setIsEditingSeller(false); setSoldBy(sale.soldBy || ""); }} className="text-red-400 hover:text-red-300" title="Cancelar">✕</button>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* ... (Resto de la pestaña GENERAL igual) ... */}
                    <div className="space-y-2">
                        {sale.items.map((item, i) => (
                            <div key={i} className="border border-border p-3 rounded-lg flex justify-between items-center bg-background hover:border-primary/30 transition-colors">
                                <div>
                                    <div className="font-medium text-white flex items-center gap-2">
                                        {item.description}
                                        {item.inventoryProductId && <span className="text-[10px] text-blue-400 border border-blue-500/30 px-1 rounded">INV</span>}
                                    </div>
                                    <div className="text-xs text-textMuted flex gap-2">
                                        <span>Cant: {item.qty}</span>
                                        {item.returnedQty > 0 && <span className="text-red-400">· Devueltos: {item.returnedQty}</span>}
                                        {item.rxSnapshot && <span className="text-blue-400">· Con Rx</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-emerald-400">${item.unitPrice.toLocaleString()}</div>
                                    {item.qty > 0 && (
                                        <button onClick={()=>handleReturn(item)} className="text-[10px] bg-red-900/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded hover:bg-red-900/30 mt-1 transition-colors">Devolver</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- TAB 2: TALLER --- */}
            {activeTab === "LAB" && isLabSale && (
                <div className="space-y-4 animate-fadeIn">
                    {/* ... (Contenido de Taller igual) ... */}
                    {workOrders.map(wo => (
                        <div key={wo.id} className="relative bg-surface border border-border rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors group">
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${wo.status === 'CANCELLED' ? 'bg-red-500' : 'bg-blue-500'}`} />
                            <div className="p-4 pl-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider bg-blue-900/20 px-2 py-0.5 rounded border border-blue-500/30">{wo.type}</span>
                                            <span className="text-sm text-white font-bold">{wo.labName || "Sin Laboratorio Asignado"}</span>
                                        </div>
                                    </div>
                                    <Badge color={wo.status === "CANCELLED" ? "red" : wo.status === "READY" ? "green" : "blue"}>{wo.status}</Badge>
                                </div>
                                {editingWO === wo.id ? (
                                    <div className="mt-4 bg-surfaceHighlight/20 p-4 rounded-xl border border-border shadow-inner">
                                        <WorkOrderEditForm wo={wo} labs={labs} employees={employees} onSave={handleSaveWO} onCancel={()=>setEditingWO(null)} />
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                            <div className="bg-background/40 p-2.5 rounded-lg border border-white/5">
                                                <div className="text-[9px] text-textMuted uppercase font-bold mb-1">Costo Lab</div>
                                                <div className="text-sm font-mono text-white">${Number(wo.labCost).toLocaleString()}</div>
                                            </div>
                                            <div className="bg-background/40 p-2.5 rounded-lg border border-white/5">
                                                <div className="text-[9px] text-textMuted uppercase font-bold mb-1">Fecha Promesa</div>
                                                <div className="text-sm text-white">{wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : "N/D"}</div>
                                            </div>
                                            <div className="bg-background/40 p-2.5 rounded-lg border border-white/5">
                                                <div className="text-[9px] text-textMuted uppercase font-bold mb-1">Armazón</div>
                                                <div className="text-sm text-white truncate" title={wo.frameCondition}>{wo.frameCondition || "-"}</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-dashed border-border/50">
                                            <span className="text-[9px] text-textMuted">Última act.: {new Date(wo.updatedAt).toLocaleString()}</span>
                                            <Button variant="ghost" onClick={()=>setEditingWO(wo.id)} className="h-7 text-xs text-blue-300 hover:text-white hover:bg-blue-500/20 px-3 gap-2 border border-blue-500/20">
                                                <span>⚙️</span> Gestionar Orden
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- TAB 3: PAGOS --- */}
            {activeTab === "PAYMENTS" && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surfaceHighlight/20 p-4 rounded-xl border border-border text-center">
                            <div className="text-xs text-textMuted uppercase">Total Venta</div>
                            <div className="text-2xl font-bold text-white">${sale.total.toLocaleString()}</div>
                        </div>
                        <div className={`p-4 rounded-xl border text-center ${sale.balance > 0 ? "bg-red-900/10 border-red-500/30" : "bg-emerald-900/10 border-emerald-500/30"}`}>
                            <div className="text-xs text-textMuted uppercase">Saldo Pendiente</div>
                            <div className={`text-2xl font-bold ${sale.balance > 0 ? "text-red-400" : "text-emerald-400"}`}>${sale.balance.toLocaleString()}</div>
                        </div>
                    </div>

                    {sale.balance > 0.01 && !showAddPayment && (
                        <Button variant="secondary" onClick={() => setShowAddPayment(true)} className="w-full border-dashed">+ Agregar Abono</Button>
                    )}

                    {showAddPayment && (
                        <div className="bg-surface border border-primary/30 p-4 rounded-xl animate-fadeIn relative">
                            <button onClick={() => setShowAddPayment(false)} className="absolute top-2 right-2 text-textMuted hover:text-white">✕</button>
                            <h4 className="text-sm font-bold text-primary mb-3">Registrar Nuevo Pago</h4>
                            <div className={`grid gap-3 items-end ${newPayment.method === "TARJETA" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
                                <Input label="Monto" type="number" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} placeholder={`Máx: ${sale.balance}`}/>
                                <div>
                                    <label className="block text-xs font-bold text-textMuted uppercase mb-1">Método</label>
                                    <Select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}>
                                        <option value="EFECTIVO">Efectivo</option>
                                        <option value="TARJETA">Tarjeta</option>
                                        <option value="TRANSFERENCIA">Transferencia</option>
                                        <option value="PUNTOS">Puntos Lealtad</option>
                                    </Select>
                                </div>
                                {newPayment.method === "TARJETA" && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-textMuted uppercase mb-1">Terminal</label>
                                            <Select value={newPayment.terminal} onChange={e => setNewPayment({...newPayment, terminal: e.target.value})}>
                                                <option value="">-- Seleccionar --</option>
                                                {terminals.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-textMuted uppercase mb-1">Plazo</label>
                                            <Select value={newPayment.cardType} onChange={e => setNewPayment({...newPayment, cardType: e.target.value})}>
                                                <option value="CONTADO">Contado / Débito</option>
                                                <option value="3 MESES">3 Meses</option>
                                                <option value="6 MESES">6 Meses</option>
                                                <option value="9 MESES">9 Meses</option>
                                                <option value="12 MESES">12 Meses</option>
                                            </Select>
                                        </div>
                                    </>
                                )}
                                <Button onClick={handleAddPayment} className={`h-[42px] ${newPayment.method === "TARJETA" ? "md:col-span-2" : ""}`}>Confirmar Pago</Button>
                            </div>
                        </div>
                    )}

                    <div className="bg-surfaceHighlight/10 rounded-xl border border-border overflow-hidden">
                        <div className="p-3 bg-surfaceHighlight/30 text-xs font-bold text-textMuted uppercase">Historial de Transacciones</div>
                        <div className="divide-y divide-border">
                            {sale.payments.map(p => (
                                <div key={p.id} className="p-3 flex justify-between items-center text-sm hover:bg-surfaceHighlight/10 transition-colors group">
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium">
                                            {p.method} 
                                            {p.method === "TARJETA" && p.terminal && <span className="text-xs text-blue-300 ml-1">({p.terminal} - {p.cardType})</span>}
                                        </span>
                                        <span className="text-[10px] text-textMuted">{new Date(p.paidAt).toLocaleString()} {p.note && <span className="text-amber-400 ml-1">({p.note})</span>}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold ${p.amount < 0 ? "text-red-400" : "text-emerald-400"}`}>${p.amount.toLocaleString()}</span>
                                        {editingPaymentId === p.id ? (
                                            <div className="flex items-center gap-1">
                                                <select autoFocus value={tempMethod} onChange={e=>setTempMethod(e.target.value)} className="bg-background text-white border border-border rounded px-1 py-0.5 text-[10px]"><option>EFECTIVO</option><option>TARJETA</option><option>TRANSFERENCIA</option></select>
                                                <button onClick={()=>handlePaymentUpdate(p.id)} className="text-emerald-400 text-xs">💾</button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={()=>{setEditingPaymentId(p.id); setTempMethod(p.method)}} className="text-textMuted hover:text-white" title="Corregir método">✏️</button>
                                                {p.amount > 0 && (
                                                    <button onClick={() => handleDeletePayment(p.id, p.amount)} className="text-textMuted hover:text-red-500" title="Eliminar abono">🗑️</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {sale.payments.length === 0 && <div className="p-4 text-center text-textMuted text-xs italic">Sin pagos registrados.</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* ===================================== */}
        {/* 🔥 FOOTER CON BOTONES DE IMPRESIÓN 🔥 */}
        {/* ===================================== */}
        <div className="flex justify-end gap-3 mt-6 border-t border-border pt-4">
            {/* 1. IMPRIMIR TICKET DE VENTA (Siempre visible) */}
            <Button variant="secondary" onClick={() => imprimirTicket(sale)}>
                🧾 Ticket Venta
            </Button>

            {/* 2. IMPRIMIR ORDEN TALLER (Solo si tiene lentes) */}
            {isLabSale && (
                <Button 
                    variant="primary" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500/50"
                    onClick={handlePrintWorkOrder}
                >
                    👓 Orden Taller
                </Button>
            )}

            <Button variant="danger" onClick={onClose}>
                Cerrar
            </Button>
        </div>

    </ModalWrapper>
  );
}