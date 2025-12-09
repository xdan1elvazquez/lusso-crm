import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // 👈 1. Importar Auth
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
import Card from "@/components/ui/Card";
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
  const { user } = useAuth(); // 👈 2. Obtener usuario y sucursal
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
  const [revisionModal, setRevisionModal] = useState(null); 
  const [warrantyModal, setWarrantyModal] = useState(null); 
  const [payLabModal, setPayLabModal] = useState(null);
  const [viewSale, setViewSale] = useState(null); 

  const refreshData = async () => {
      // Seguridad: esperar a que cargue el usuario
      if (!user?.branchId) return;

      setLoading(true);
      try {
          // 👈 3. Filtrar Órdenes y Ventas por Sucursal
          // Pacientes, Empleados y Labs siguen siendo globales
          const [woData, patData, empData, labData, salesData] = await Promise.all([
              getAllWorkOrders(user.branchId), // Filtrado
              getPatients(), 
              getEmployees(), 
              getLabs(), 
              getAllSales(user.branchId) // Filtrado
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

  // Agrupación Inteligente para Kanban
  const { groupedOrders, historyOrders } = useMemo(() => {
    const q = query.toLowerCase();
    
    // 1. Filtrar
    const filtered = workOrders.filter(w => 
      (patientMap[w.patientId]?.firstName + " " + w.labName + " " + w.type).toLowerCase().includes(q)
    );

    // 2. Inicializar grupos activos
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

  // Handlers
  const handleDelete = async (id) => {
      const ok = await confirm({ title: "Eliminar Orden", message: "¿Borrar esta orden de trabajo permanentemente?", confirmText: "Sí, Borrar" });
      if(ok) {
          await deleteWorkOrder(id);
          notify.success("Orden eliminada");
          refreshData();
      }
  };

  const handleAdvance = async (order) => {
    const next = nextStatus(order.status);
    if (order.status === "TO_PREPARE") return setSendLabModal(order);
    if (order.status === "SENT_TO_LAB") return setRevisionModal(order);

    await updateWorkOrder(order.id, { status: next });
    refreshData();
  };
  
  const handleStatusChange = async (id, current, direction) => {
    if (direction === 'next') {
      const w = workOrders.find(o => o.id === id);
      handleAdvance(w);
    } else {
      const prev = prevStatus(current);
      await updateWorkOrder(id, { status: prev });
      refreshData();
    }
  };

  // --- SUB-COMPONENTES DE MODAL ---
  const SendLabModalContent = ({ order, onClose }) => {
    const [courier, setCourier] = useState("");
    const handleSend = async () => {
        await updateWorkOrder(order.id, { status: "SENT_TO_LAB", courier });
        notify.success("Orden enviada a laboratorio");
        refreshData(); onClose();
    };
    return (
      <div className="space-y-4">
          <Select label="Selecciona Mensajero / Servicio" value={courier} onChange={e => setCourier(e.target.value)}>
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

  const PayLabModalContent = ({ order, onClose }) => {
      const [method, setMethod] = useState("EFECTIVO");
      const handlePay = async () => {
          // 👈 4. Crear gasto en la sucursal correcta
          await createExpense({
              description: `Pago Lab: ${order.labName} (P: ${patientMap[order.patientId]?.lastName})`,
              amount: order.labCost,
              category: "COSTO_VENTA",
              method: method,
              date: new Date().toISOString()
          }, user.branchId); // Pasar branchId

          await updateWorkOrder(order.id, { isPaid: true });
          notify.success(`Pago de $${order.labCost} registrado`);
          refreshData(); onClose();
      };
      return (
        <div className="space-y-4">
            <div className="bg-surfaceHighlight/30 p-6 rounded-lg text-center border border-border">
                <div className="text-sm text-textMuted uppercase mb-1">Monto a Pagar</div>
                <div className="text-3xl font-bold text-emerald-400">${order.labCost?.toLocaleString()}</div>
            </div>
            <Select label="Método de Pago" value={method} onChange={e => setMethod(e.target.value)}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA">Tarjeta</option>
            </Select> 
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button variant="primary" onClick={handlePay} className="!bg-emerald-600 hover:!bg-emerald-700">Registrar Pago</Button>
            </div>
        </div>
      );
  };

  const RevisionModalContent = ({ order, onClose }) => {
      const [receivedBy, setReceivedBy] = useState("");
      const [baseMicaCost, setBaseMicaCost] = useState(order.labCost || 0);
      
      const handleConfirm = async () => {
          if(!receivedBy) return notify.info("Indica quién recibe el trabajo");
          await updateWorkOrder(order.id, {
              status: "READY", receivedBy, labCost: baseMicaCost, frameCondition: "Buen estado"
          });
          notify.success("Trabajo recibido y listo");
          refreshData(); onClose();
      };

      return (
        <div className="space-y-4">
            <Input label="Costo Final Lab ($)" type="number" value={baseMicaCost} onChange={e => setBaseMicaCost(e.target.value)} />
            <Select label="Recibido por (Sucursal)" value={receivedBy} onChange={e => setReceivedBy(e.target.value)}>
                <option value="">-- Seleccionar --</option>
                {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
            </Select>
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button variant="primary" onClick={handleConfirm} className="!bg-purple-600 hover:!bg-purple-700">Confirmar Recepción</Button>
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
      
      {/* MODALES */}
      {sendLabModal && <ModalWrapper title="Enviar a Laboratorio" onClose={() => setSendLabModal(null)} width="400px"><SendLabModalContent order={sendLabModal} onClose={() => setSendLabModal(null)} /></ModalWrapper>}
      {warrantyModal && <ModalWrapper title="Reportar Garantía" onClose={() => setWarrantyModal(null)} width="400px"><WarrantyModalContent order={warrantyModal} onClose={() => setWarrantyModal(null)} /></ModalWrapper>}
      {payLabModal && <ModalWrapper title="Pagar Proveedor" onClose={() => setPayLabModal(null)} width="350px"><PayLabModalContent order={payLabModal} onClose={() => setPayLabModal(null)} /></ModalWrapper>}
      {revisionModal && <ModalWrapper title="Recepción de Trabajo" onClose={() => setRevisionModal(null)} width="450px"><RevisionModalContent order={revisionModal} onClose={() => setRevisionModal(null)} /></ModalWrapper>}
      {viewSale && <SaleDetailModal sale={viewSale} patient={patientMap[viewSale.patientId]} onClose={() => setViewSale(null)} onUpdate={refreshData} />}

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
                             </div>
                             <div className="text-right">
                                 <Badge color={o.status==="DELIVERED" ? "gray" : "red"}>{o.status === "DELIVERED" ? "Entregado" : "Cancelado"}</Badge>
                                 <div className="text-[10px] text-textMuted mt-1">{new Date(o.updatedAt).toLocaleDateString()}</div>
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
function KanbanCard({ order, patient, sale, onAdvance, onRegress, onWarranty, onDelete, onViewSale, onPayLab }) {
    const item = sale?.items?.find(it => it.id === order.saleItemId);
    
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

    return (
        <div onClick={onViewSale} className="bg-background border border-border rounded-lg p-3 shadow-sm hover:border-primary/50 transition-colors group relative cursor-pointer">
            <div className="flex justify-between items-start mb-2">
                <div className="w-full pr-6">
                    <div className="font-bold text-white text-sm truncate" title={patient ? `${patient.firstName} ${patient.lastName}` : "Paciente"}>
                        {patient ? `${patient.firstName} ${patient.lastName}` : "Paciente"}
                    </div>
                    <div className="text-xs text-textMuted truncate">{item?.description || order.type}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute top-2 right-2 text-textMuted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-textMuted mb-2">
                <div className="bg-surfaceHighlight rounded px-1.5 py-1">
                    <span className="block uppercase font-bold opacity-70 text-[9px]">Lab</span>
                    <span className="text-gray-300 truncate">{order.labName || "Interno"}</span>
                </div>
                <div className="bg-surfaceHighlight rounded px-1.5 py-1 text-right">
                    <span className="block uppercase font-bold opacity-70 text-[9px]">Entrega</span>
                    <span className="text-gray-300">{order.dueDate ? new Date(order.dueDate).toLocaleDateString() : "N/D"}</span>
                </div>
            </div>

            {renderRx(order.rxNotes)}

            <div className="flex justify-between items-center pt-2 mt-2 border-t border-border border-dashed">
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {order.status !== "ON_HOLD" && order.status !== "TO_PREPARE" && (
                        <button onClick={onRegress} className="p-1 rounded bg-surface border border-border text-textMuted hover:text-white hover:bg-surfaceHighlight" title="Regresar">←</button>
                    )}
                    {order.status !== "READY" && (
                        <button onClick={onAdvance} className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500 shadow-glow" title="Avanzar">➡</button>
                    )}
                </div>

                <div className="flex gap-3 text-[10px] font-medium items-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={onWarranty} className="text-red-400 hover:underline">Garantía</button>
                    <div className="flex gap-1">
                        {sale && sale.balance > 0 && (
                            <span onClick={onViewSale} className="cursor-pointer w-2.5 h-2.5 rounded-full bg-red-500 border border-background" title={`Saldo Pendiente: $${sale.balance}`}></span>
                        )}
                        {order.labCost > 0 && !order.isPaid && (
                            <span onClick={onPayLab} className="cursor-pointer w-2.5 h-2.5 rounded-full bg-amber-500 border border-background animate-pulse" title={`Pago Lab Pendiente: $${order.labCost}`}></span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}