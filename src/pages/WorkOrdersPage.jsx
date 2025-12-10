import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; 
import { getAllWorkOrders, updateWorkOrder, nextStatus, prevStatus, applyWarranty, deleteWorkOrder } from "@/services/workOrdersStorage";
import { getPatients } from "@/services/patientsStorage"; 
import { getAllSales } from "@/services/salesStorage"; 
import { getLabs } from "@/services/labStorage"; 
import { getEmployees } from "@/services/employeesStorage"; 
import { createExpense } from "@/services/expensesStorage";
import LoadingState from "@/components/LoadingState";
import SaleDetailModal from "@/components/SaleDetailModal";

// UI Kit & Context
import ModalWrapper from "@/components/ui/ModalWrapper";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { useConfirm, useNotify } from "@/context/UIContext";

const ACTIVE_COLS = [
  { id: "ON_HOLD", title: "⏳ En Espera", color: "border-slate-600", bg: "bg-slate-900/50" },
  { id: "TO_PREPARE", title: "🛠️ Por Preparar", color: "border-amber-500", bg: "bg-amber-900/10" },
  { id: "SENT_TO_LAB", title: "🚚 En Laboratorio", color: "border-blue-500", bg: "bg-blue-900/10" },
  { id: "QUALITY_CHECK", title: "🔍 Control Calidad", color: "border-purple-500", bg: "bg-purple-900/10" },
  { id: "READY", title: "✅ Listo Entrega", color: "border-emerald-500", bg: "bg-emerald-900/10" }
];

export default function WorkOrdersPage() {
  const { user } = useAuth(); 
  const confirm = useConfirm();
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  
  const [workOrders, setWorkOrders] = useState([]);
  const [patients, setPatients] = useState([]);
  const [sales, setSales] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [labs, setLabs] = useState([]);

  // Modals
  const [sendLabModal, setSendLabModal] = useState(null); 
  const [receiveModal, setReceiveModal] = useState(null); 
  const [qualityModal, setQualityModal] = useState(null); 
  const [warrantyModal, setWarrantyModal] = useState(null); 
  const [payLabModal, setPayLabModal] = useState(null);
  const [viewSale, setViewSale] = useState(null);
  const [viewHistoryOrder, setViewHistoryOrder] = useState(null);

  const refreshData = async () => {
      if (!user?.branchId) return;

      setLoading(true);
      try {
          const [woData, patData, empData, labData, salesData] = await Promise.all([
              getAllWorkOrders(user.branchId),
              getPatients(), 
              getEmployees(), 
              getLabs(), 
              getAllSales(user.branchId)
          ]);
          setWorkOrders(woData); setPatients(patData); setEmployees(empData); setLabs(labData); setSales(salesData);
      } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { 
      if (user?.branchId) refreshData(); 
  }, [user]);

  const patientMap = useMemo(() => {
    if (!Array.isArray(patients)) return {};
    return patients.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  }, [patients]);

  const salesMap = useMemo(() => {
    if (!Array.isArray(sales)) return {};
    return sales.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
  }, [sales]);

  const { groupedOrders, historyOrders } = useMemo(() => {
    const q = query.toLowerCase();
    
    // Búsqueda por nombre completo
    const filtered = workOrders.filter(w => {
      const p = patientMap[w.patientId];
      const fullName = p ? `${p.firstName} ${p.lastName}` : "";
      const searchString = `${fullName} ${w.labName} ${w.type}`.toLowerCase();
      return searchString.includes(q);
    });

    const activeGroups = {};
    ACTIVE_COLS.forEach(col => activeGroups[col.id] = []);
    
    const history = []; 

    filtered.forEach(order => {
        if (order.status === "DELIVERED" || order.status === "CANCELLED") {
            history.push(order);
        } else if (activeGroups[order.status]) {
            activeGroups[order.status].push(order);
        } else {
            if (!activeGroups["ON_HOLD"]) activeGroups["ON_HOLD"] = [];
            activeGroups["ON_HOLD"].push(order);
        }
    });

    Object.keys(activeGroups).forEach(key => {
        activeGroups[key].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });
    
    history.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return { groupedOrders: activeGroups, historyOrders: history };
  }, [workOrders, query, patientMap]);

  // --- HELPER DE AUDITORÍA ---
  const createAuditLog = (action, details = "") => ({
      actor: user.email || user.name || "Desconocido",
      action: action,
      details: details,
      role: user.role || "USER"
  });

  // --- HANDLERS ---
  const handleDelete = async (id) => {
      const ok = await confirm({ title: "Eliminar Orden", message: "¿Borrar esta orden de trabajo permanentemente?", confirmText: "Sí, Borrar" });
      if(ok) {
          await deleteWorkOrder(id);
          notify.success("Orden eliminada");
          refreshData();
      }
  };

  const handleDeliver = async (order) => {
      const ok = await confirm({ 
          title: "Confirmar Entrega", 
          message: `¿Marcar el trabajo de ${patientMap[order.patientId]?.firstName} como ENTREGADO? Esto finalizará el flujo.`,
          confirmText: "Sí, Entregar"
      });
      
      if(ok) {
          await updateWorkOrder(order.id, { 
              status: "DELIVERED",
              deliveredAt: new Date().toISOString()
          }, createAuditLog("ENTREGA_FINALIZADA", "Trabajo entregado al cliente"));
          
          notify.success("Trabajo entregado y archivado");
          refreshData();
      }
  };

  const handleAdvance = async (order) => {
    const next = nextStatus(order.status);
    
    // FLUJO PERSONALIZADO
    if (order.status === "TO_PREPARE") return setSendLabModal(order); 
    if (order.status === "SENT_TO_LAB") return setReceiveModal(order); 
    if (order.status === "QUALITY_CHECK") return setQualityModal(order); 

    await updateWorkOrder(order.id, { status: next }, createAuditLog("AVANCE_ESTADO", `De ${order.status} a ${next}`));
    refreshData();
  };
  
  const handleStatusChange = async (id, current, direction) => {
    if (direction === 'next') {
      const w = workOrders.find(o => o.id === id);
      handleAdvance(w);
    } else {
      const prev = prevStatus(current);
      await updateWorkOrder(id, { status: prev }, createAuditLog("REGRESO_ESTADO", `De ${current} a ${prev}`));
      refreshData();
    }
  };

  // --- SUB-COMPONENTES DE MODAL ---
  const SendLabModalContent = ({ order, onClose }) => {
    const [courier, setCourier] = useState("");
    const [preparedBy, setPreparedBy] = useState(""); 

    const handleSend = async () => {
        if(!preparedBy) return notify.info("Indica quién preparó el trabajo");
        
        await updateWorkOrder(order.id, { 
            status: "SENT_TO_LAB", 
            courier,
            preparedBy, 
            sentToLabAt: new Date().toISOString()
        }, createAuditLog("ENVIADO_LAB", `Prep: ${preparedBy} | Envía: ${courier}`));
        
        notify.success("Orden enviada a laboratorio");
        refreshData(); onClose();
    };
    return (
      <div className="space-y-4">
          <Select label="¿Quién Preparó?" value={preparedBy} onChange={e => setPreparedBy(e.target.value)}>
              <option value="">-- Seleccionar Empleado --</option>
              {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
          </Select>
          <Select label="Mensajería / Método Envío" value={courier} onChange={e => setCourier(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
              <option value="Externo">Servicio Externo / Paquetería</option>
          </Select>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
             <Button variant="ghost" onClick={onClose}>Cancelar</Button>
             <Button onClick={handleSend} variant="primary">Confirmar Envío</Button>
          </div>
      </div>
    );
  };

  const ReceiveModalContent = ({ order, onClose }) => {
      const [deliveredBy, setDeliveredBy] = useState(""); 

      const handleConfirm = async () => {
          await updateWorkOrder(order.id, {
              status: "QUALITY_CHECK", 
              returnCourier: deliveredBy,
              receivedFromLabAt: new Date().toISOString()
          }, createAuditLog("LLEGADA_LAB", `Entregó: ${deliveredBy || "N/A"}`));
          
          notify.success("Trabajo recibido. Pasar a revisión.");
          refreshData(); onClose();
      };

      return (
        <div className="space-y-4">
            <div className="p-3 bg-blue-900/20 text-blue-200 text-sm rounded border border-blue-500/30">
                Confirmar que el trabajo llegó físicamente a sucursal. Pasará a <strong>Control de Calidad</strong>.
            </div>
            <Select label="Mensajería / Quien Entregó" value={deliveredBy} onChange={e => setDeliveredBy(e.target.value)}>
                <option value="">-- Seleccionar / Externo --</option>
                {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                <option value="Paquetería Externa">Paquetería Externa</option>
            </Select>
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button variant="primary" onClick={handleConfirm}>Confirmar Llegada</Button>
            </div>
        </div>
      );
  };

  const QualityModalContent = ({ order, onClose }) => {
      const [jobMadeBy, setJobMadeBy] = useState(""); 
      const [reviewedBy, setReviewedBy] = useState(""); 
      const [notes, setNotes] = useState(""); 
      const [baseMicaCost, setBaseMicaCost] = useState(order.labCost || 0);

      const handleApprove = async () => {
          if(!reviewedBy) return notify.info("Firma quién revisó el trabajo");
          
          await updateWorkOrder(order.id, {
              status: "READY",
              jobMadeBy,
              reviewedBy,
              labCost: baseMicaCost,
              qualityNotes: notes, 
              checkedAt: new Date().toISOString()
          }, createAuditLog("REVISION_CALIDAD", `Rev: ${reviewedBy} | Notas: ${notes}`));

          notify.success("Trabajo Aprobado y Listo para Entrega");
          refreshData(); onClose();
      };

      return (
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <Select label="¿Quién Biseló/Procesó?" value={jobMadeBy} onChange={e => setJobMadeBy(e.target.value)}>
                      <option value="">-- Lab Externo / N/A --</option>
                      {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                  </Select>
                  <Select label="¿Quién Revisa?" value={reviewedBy} onChange={e => setReviewedBy(e.target.value)}>
                      <option value="">-- Seleccionar --</option>
                      {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                  </Select>
              </div>
              
              <Input label="Costo Final Lab ($)" type="number" value={baseMicaCost} onChange={e => setBaseMicaCost(e.target.value)} />
              
              <label className="block w-full">
                 <span className="block text-xs font-medium text-textMuted uppercase tracking-wide mb-1.5">Comentarios de Revisión</span>
                 <textarea 
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-white placeholder-textMuted/50 text-sm focus:outline-none focus:border-primary resize-none"
                    placeholder="Estado de filtros, armazón, observaciones..." 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    rows={3} 
                 />
              </label>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                  <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                  <Button variant="primary" onClick={handleApprove} className="!bg-purple-600 hover:!bg-purple-700">Aprobar Calidad</Button>
              </div>
          </div>
      );
  };

  const WarrantyModalContent = ({ order, onClose }) => {
    const [reason, setReason] = useState("");
    const [extraCost, setExtraCost] = useState("");
    const handleApply = async () => {
        if(!reason) return notify.info("Escribe una razón para la garantía");
        await applyWarranty(order.id, reason, extraCost); 
        notify.success("Garantía aplicada. Orden reiniciada.");
        refreshData(); onClose();
    };
    return (
      <div className="space-y-4">
          <label className="block w-full">
             <span className="block text-xs font-medium text-textMuted uppercase tracking-wide mb-1.5">Motivo de Garantía</span>
             <textarea 
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-white placeholder-textMuted/50 text-sm focus:outline-none focus:border-primary resize-none"
                placeholder="Descripción del defecto..." 
                value={reason} 
                onChange={e => setReason(e.target.value)} 
                rows={3} 
             />
          </label>
          <Input label="Costo Extra ($)" type="number" value={extraCost} onChange={e => setExtraCost(e.target.value)} placeholder="Opcional" />
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
             <Button variant="ghost" onClick={onClose}>Cancelar</Button>
             <Button variant="danger" onClick={handleApply}>Aplicar Garantía</Button>
          </div>
      </div>
    );
  };

  // 🟢 ACTUALIZACIÓN: Modal de Pago con Selector de Categoría
  const PayLabModalContent = ({ order, onClose }) => {
      const [method, setMethod] = useState("EFECTIVO");
      const [category, setCategory] = useState("COSTO_LAB"); // 👈 Default

      const handlePay = async () => {
          await createExpense({
              description: `Pago ${category === 'COSTO_LAB' ? 'Lab' : 'Taller'}: ${order.labName} (P: ${patientMap[order.patientId]?.lastName})`,
              amount: order.labCost,
              category: category, 
              method: method,
              date: new Date().toISOString()
          }, user.branchId);

          await updateWorkOrder(order.id, { isPaid: true }, createAuditLog("PAGO_PROVEEDOR", `Monto: ${order.labCost} (${category})`));
          notify.success(`Pago registrado como ${category === 'COSTO_LAB' ? 'Laboratorio' : 'Taller'}`);
          refreshData(); onClose();
      };
      return (
        <div className="space-y-4">
            <div className="bg-surfaceHighlight/30 p-6 rounded-lg text-center border border-border">
                <div className="text-sm text-textMuted uppercase mb-1">Monto a Pagar a: <span className="text-white font-bold">{order.labName}</span></div>
                <div className="text-3xl font-bold text-emerald-400">${order.labCost?.toLocaleString()}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                {/* Selector de Categoría */}
                <Select label="Clasificación del Gasto" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="COSTO_LAB">🧪 Laboratorio</option>
                    <option value="COSTO_TALLER">🛠️ Taller / Bisel</option>
                </Select>

                <Select label="Método de Pago" value={method} onChange={e => setMethod(e.target.value)}>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="TARJETA">Tarjeta</option>
                </Select> 
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button variant="primary" onClick={handlePay} className="!bg-emerald-600 hover:!bg-emerald-700">Registrar Pago</Button>
            </div>
        </div>
      );
  };

  const HistoryModalContent = ({ order, onClose }) => {
      const history = order.history || [];
      return (
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {history.length === 0 ? (
                  <p className="text-textMuted text-sm text-center py-4">No hay historial registrado.</p>
              ) : (
                  <div className="space-y-4">
                      {history.slice().reverse().map((evt, idx) => (
                          <div key={idx} className="border-l-2 border-primary pl-3 ml-1 relative">
                              <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-primary"></div>
                              <div className="flex justify-between text-xs text-textMuted mb-0.5">
                                  <span>{new Date(evt.timestamp).toLocaleString()}</span>
                                  <span className="font-bold text-white">{evt.actor}</span>
                              </div>
                              <div className="text-sm font-bold text-white">{evt.action.replace(/_/g, ' ')}</div>
                              {evt.details && <div className="text-xs text-blue-200 mt-0.5">{evt.details}</div>}
                          </div>
                      ))}
                  </div>
              )}
              <div className="mt-4 text-right border-t border-border pt-3">
                  <Button variant="ghost" onClick={onClose}>Cerrar</Button>
              </div>
          </div>
      );
  };

  if (loading && workOrders.length === 0) return <LoadingState />;

  return (
    <div className="page-container h-[calc(100vh-100px)] flex flex-col animate-fadeIn">
      {/* HEADER FIJO */}
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
           <h1 className="text-3xl font-bold text-white tracking-tight">Tablero de Trabajos</h1>
           <p className="text-textMuted text-sm">
               Taller de {user.branchId === 'lusso_main' ? 'Matriz' : 'Sucursal'}
           </p>
        </div>
        <div className="flex gap-4 items-center">
            <Input 
                placeholder="🔍 Buscar orden..." 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                className="w-64 bg-surface"
            />
            <Button variant="ghost" onClick={refreshData} title="Actualizar">🔄</Button>
        </div>
      </div>
      
      {/* MODALES ACTIVOS */}
      {sendLabModal && <ModalWrapper title="Enviar a Laboratorio" onClose={() => setSendLabModal(null)} width="400px"><SendLabModalContent order={sendLabModal} onClose={() => setSendLabModal(null)} /></ModalWrapper>}
      {receiveModal && <ModalWrapper title="Confirmar Llegada" onClose={() => setReceiveModal(null)} width="400px"><ReceiveModalContent order={receiveModal} onClose={() => setReceiveModal(null)} /></ModalWrapper>}
      {qualityModal && <ModalWrapper title="Control de Calidad" onClose={() => setQualityModal(null)} width="500px"><QualityModalContent order={qualityModal} onClose={() => setQualityModal(null)} /></ModalWrapper>}
      
      {warrantyModal && <ModalWrapper title="Reportar Garantía" onClose={() => setWarrantyModal(null)} width="400px"><WarrantyModalContent order={warrantyModal} onClose={() => setWarrantyModal(null)} /></ModalWrapper>}
      {payLabModal && <ModalWrapper title="Pagar Proveedor" onClose={() => setPayLabModal(null)} width="350px"><PayLabModalContent order={payLabModal} onClose={() => setPayLabModal(null)} /></ModalWrapper>}
      {viewSale && <SaleDetailModal sale={viewSale} patient={patientMap[viewSale.patientId]} onClose={() => setViewSale(null)} onUpdate={refreshData} />}
      {viewHistoryOrder && <ModalWrapper title="📋 Historial de Movimientos" onClose={() => setViewHistoryOrder(null)} width="500px"><HistoryModalContent order={viewHistoryOrder} onClose={() => setViewHistoryOrder(null)} /></ModalWrapper>}

      {/* KANBAN BOARD */}
      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar mb-4">
          <div className="flex gap-4 min-w-max h-full">
              {ACTIVE_COLS.map(col => {
                  const orders = groupedOrders[col.id] || [];
                  
                  if (orders.length === 0 && col.id !== "ON_HOLD" && col.id !== "TO_PREPARE") {
                      return null; 
                  }

                  return (
                      <div key={col.id} className="w-80 flex flex-col h-full bg-surface rounded-xl border border-border overflow-hidden transition-all duration-300">
                          <div className={`p-3 border-b-2 ${col.color} bg-surfaceHighlight/50 flex justify-between items-center`}>
                              <span className="font-bold text-sm text-white uppercase tracking-wide">{col.title}</span>
                              <Badge color="gray" className="bg-background text-xs">{orders.length}</Badge>
                          </div>
                          
                          <div className={`flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar ${col.bg}`}>
                              {orders.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-20 text-textMuted text-xs italic opacity-50">
                                      Sin órdenes
                                  </div>
                              ) : (
                                  orders.map(o => (
                                      <KanbanCard 
                                          key={o.id} 
                                          order={o} 
                                          patient={patientMap[o.patientId]}
                                          sale={salesMap[o.saleId]}
                                          onAdvance={() => handleStatusChange(o.id, o.status, 'next')}
                                          onRegress={() => handleStatusChange(o.id, o.status, 'prev')}
                                          onWarranty={() => setWarrantyModal(o)}
                                          onDelete={() => handleDelete(o.id)}
                                          onViewSale={() => setViewSale(salesMap[o.saleId])}
                                          onPayLab={() => setPayLabModal(o)}
                                          onDeliver={() => handleDeliver(o)} 
                                          onViewHistory={() => setViewHistoryOrder(o)}
                                      />
                                  ))
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      {/* HISTORIAL */}
      <div className="border-t border-border pt-4 mt-auto">
          <button 
             onClick={() => setShowHistory(!showHistory)}
             className="flex items-center gap-2 text-sm font-bold text-textMuted hover:text-white transition-colors mb-4 w-full"
          >
              <span>{showHistory ? "▼" : "▶"}</span>
              Historial de Entregas y Cancelaciones ({historyOrders.length})
          </button>
          
          {showHistory && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-fadeIn max-h-60 overflow-y-auto custom-scrollbar pr-2">
                 {historyOrders.map(o => {
                     const patient = patientMap[o.patientId];
                     const sale = salesMap[o.saleId];
                     const item = sale?.items?.find(it => it.id === o.saleItemId);
                     return (
                         <div key={o.id} className={`p-3 rounded-lg border border-border flex justify-between items-center ${o.status === "CANCELLED" ? "bg-red-900/10 opacity-70" : "bg-surface"}`}>
                             <div>
                                 <div className="font-bold text-sm text-white">{patient?.firstName} {patient?.lastName}</div>
                                 <div className="text-xs text-textMuted">{item?.description || o.type}</div>
                                 {o.deliveredAt && <div className="text-[10px] text-emerald-400 mt-0.5">Entregado: {new Date(o.deliveredAt).toLocaleDateString()}</div>}
                             </div>
                             <div className="flex flex-col items-end gap-1">
                                 <Badge color={o.status==="DELIVERED" ? "gray" : "red"}>{o.status === "DELIVERED" ? "Entregado" : "Cancelado"}</Badge>
                                 <button onClick={() => setViewHistoryOrder(o)} className="text-[10px] text-blue-400 hover:underline">Ver Historial</button>
                             </div>
                         </div>
                     );
                 })}
                 {historyOrders.length === 0 && <p className="text-textMuted text-xs italic">No hay historial reciente.</p>}
             </div>
          )}
      </div>
    </div>
  );
}

// --- TARJETA DE TRABAJO ---
function KanbanCard({ order, patient, sale, onAdvance, onRegress, onWarranty, onDelete, onViewSale, onPayLab, onDeliver, onViewHistory }) {
    const item = sale?.items?.find(it => it.id === order.saleItemId);
    const hasBalance = sale && sale.balance > 0;
    const pendingLabPay = order.labCost > 0 && !order.isPaid;

    const renderRx = (notes) => {
        if (!notes) return null;
        if (notes.trim().startsWith("{")) {
            try {
                const rx = JSON.parse(notes);
                return (
                    <div className="mt-2 text-[10px] font-mono text-blue-200 bg-blue-900/20 p-1.5 rounded border border-blue-500/20 grid grid-cols-1 gap-0.5">
                        <div className="truncate">OD: {rx.od?.sph} / {rx.od?.cyl} x {rx.od?.axis}°</div>
                        <div className="truncate">OI: {rx.os?.sph} / {rx.os?.cyl} x {rx.os?.axis}°</div>
                    </div>
                );
            } catch (e) { return <div className="mt-2 text-[10px] text-textMuted truncate italic">{notes}</div>; }
        }
        return <div className="mt-2 text-[10px] text-textMuted truncate italic">{notes}</div>;
    };

    // Lógica de Botón Principal Dinámico
    const renderPrimaryAction = () => {
        if (order.status === "TO_PREPARE") return (
            <Button onClick={onAdvance} className="w-full text-xs h-8 bg-amber-600 hover:bg-amber-500 text-white shadow-md border-none">
                📤 Enviar a Lab
            </Button>
        );
        if (order.status === "SENT_TO_LAB") return (
            <Button onClick={onAdvance} className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-500 text-white shadow-md border-none">
                📥 Recibir / Llegada
            </Button>
        );
        if (order.status === "QUALITY_CHECK") return (
            <Button onClick={onAdvance} className="w-full text-xs h-8 bg-purple-600 hover:bg-purple-500 text-white shadow-md border-none">
                🔍 Revisión Calidad
            </Button>
        );
        if (order.status === "READY") return (
            <Button onClick={onDeliver} className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow border-none font-bold">
                ✅ Entregar al Cliente
            </Button>
        );
        if (order.status !== "DELIVERED" && order.status !== "CANCELLED") return (
            <Button onClick={onAdvance} variant="secondary" className="w-full text-xs h-8">
                Avanzar ➡
            </Button>
        );
        return null;
    };

    return (
        <div onClick={onViewSale} className="bg-background border border-border rounded-xl p-3 shadow-sm hover:border-primary/50 transition-all group relative cursor-pointer flex flex-col gap-2">
            
            {/* Cabecera: Cliente y Descripción */}
            <div className="flex justify-between items-start">
                <div className="w-full pr-6">
                    <div className="font-bold text-white text-sm truncate" title={patient ? `${patient.firstName} ${patient.lastName}` : "Paciente"}>
                        {patient ? `${patient.firstName} ${patient.lastName}` : "Paciente"}
                    </div>
                    <div className="text-xs text-textMuted truncate">{item?.description || order.type}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute top-2 right-2 text-textMuted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
            </div>

            {/* Datos Técnicos: Lab y Fecha */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-textMuted">
                <div className="bg-surfaceHighlight rounded px-2 py-1 border border-white/5">
                    <span className="block uppercase font-bold opacity-60 text-[9px]">Lab</span>
                    <span className="text-gray-300 truncate">{order.labName || "Interno"}</span>
                </div>
                <div className={`bg-surfaceHighlight rounded px-2 py-1 border border-white/5 text-right ${new Date(order.dueDate) < new Date() && order.status !== 'READY' ? 'text-red-300 border-red-500/30' : ''}`}>
                    <span className="block uppercase font-bold opacity-60 text-[9px]">Entrega</span>
                    <span className="">{order.dueDate ? new Date(order.dueDate).toLocaleDateString() : "N/D"}</span>
                </div>
            </div>

            {renderRx(order.rxNotes)}

            {/* Alertas */}
            {(hasBalance || pendingLabPay) && (
                <div className="flex gap-2 mt-1">
                    {hasBalance && (
                        <span className="text-[10px] bg-red-900/40 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            💰 Saldo ${sale.balance}
                        </span>
                    )}
                    {pendingLabPay && (
                        <span onClick={(e)=>{e.stopPropagation(); onPayLab()}} className="text-[10px] bg-amber-900/40 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:bg-amber-900/60">
                            ⚠️ Pagar Lab
                        </span>
                    )}
                </div>
            )}

            {/* Footer de Acciones */}
            <div className="mt-2 pt-2 border-t border-border flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                
                <div className="flex gap-2 items-center">
                    {order.status !== "ON_HOLD" && order.status !== "TO_PREPARE" && order.status !== "READY" && (
                        <button onClick={onRegress} className="p-1.5 rounded bg-surface border border-border text-textMuted hover:text-white" title="Regresar Estado">↩</button>
                    )}
                    <div className="flex-1">
                        {renderPrimaryAction()}
                    </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-medium text-textMuted px-1">
                    <button onClick={onWarranty} className="hover:text-red-400 transition-colors">🛡️ Garantía</button>
                    <div className="flex gap-3">
                        <button onClick={onViewHistory} className="hover:text-blue-300 transition-colors">🕒 Historial</button>
                        <button onClick={onViewSale} className="hover:text-primary transition-colors">👁️ Ver Detalles</button>
                    </div>
                </div>
            </div>
        </div>
    );
}