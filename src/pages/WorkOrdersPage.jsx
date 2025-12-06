import { useMemo, useState, useEffect } from "react";
import { getAllWorkOrders, updateWorkOrder, nextStatus, prevStatus, applyWarranty, deleteWorkOrder } from "@/services/workOrdersStorage";
import { getPatients } from "@/services/patientsStorage"; 
import { getAllSales } from "@/services/salesStorage"; 
import { getLabs } from "@/services/labStorage"; 
import { getEmployees } from "@/services/employeesStorage"; 
import { createExpense } from "@/services/expensesStorage";
import LoadingState from "@/components/LoadingState";
import SaleDetailModal from "@/components/SaleDetailModal";

// 👇 UI Kit & Context
import ModalWrapper from "@/components/ui/ModalWrapper";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useConfirm, useNotify } from "@/context/UIContext";

const STATUS_LABELS = { 
  ON_HOLD: "En Espera",
  TO_PREPARE: "Por Preparar", 
  SENT_TO_LAB: "En Laboratorio", 
  QUALITY_CHECK: "Control Calidad",
  READY: "Listo Entrega", 
  DELIVERED: "Entregado", 
  CANCELLED: "Cancelado" 
};

// Mapeo de estados de negocio a colores del Badge
const STATUS_BADGE_COLOR = { 
  ON_HOLD: "gray", 
  TO_PREPARE: "yellow", 
  SENT_TO_LAB: "blue", 
  QUALITY_CHECK: "purple", 
  READY: "green", 
  DELIVERED: "gray", 
  CANCELLED: "red" 
};

const STATUS_TABS = ["ALL", "ON_HOLD", "TO_PREPARE", "SENT_TO_LAB", "QUALITY_CHECK", "READY", "DELIVERED"];

export default function WorkOrdersPage() {
  const confirm = useConfirm();
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // Datos
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
      setLoading(true);
      try {
          const [woData, patData, empData, labData, salesData] = await Promise.all([
              getAllWorkOrders(), getPatients(), getEmployees(), getLabs(), getAllSales()
          ]);
          setWorkOrders(woData); setPatients(patData); setEmployees(empData); setLabs(labData); setSales(salesData);
      } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { refreshData(); }, []);

  const patientMap = useMemo(() => {
    if (!Array.isArray(patients)) return {};
    return patients.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  }, [patients]);

  const salesMap = useMemo(() => {
    if (!Array.isArray(sales)) return {};
    return sales.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
  }, [sales]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return workOrders.filter(w => (statusFilter === "ALL" || w.status === statusFilter) && (
      (patientMap[w.patientId]?.firstName + " " + w.labName + " " + w.type).toLowerCase().includes(q)
    )).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [workOrders, statusFilter, query, patientMap]);

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

  // --- COMPONENTE INTERNO PARA FORMATEAR LA RX (Visualizador JSON) ---
  const RxDisplay = ({ notes }) => {
    if (!notes) return <span className="text-gray-500 italic text-xs">Sin datos Rx</span>;

    // Intentamos detectar si es JSON
    if (notes.trim().startsWith("{")) {
        try {
            const rx = JSON.parse(notes);
            return (
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs mt-2 font-mono">
                    <div className="grid gap-1">
                        <div className="flex gap-2">
                            <span className="text-blue-400 font-bold w-6">OD:</span> 
                            <span className="text-gray-300">
                                {rx.od?.sph} / {rx.od?.cyl} x {rx.od?.axis}° 
                                {rx.od?.add && <span className="text-gray-500 ml-2">Add: {rx.od.add}</span>}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-blue-400 font-bold w-6">OI:</span> 
                            <span className="text-gray-300">
                                {rx.os?.sph} / {rx.os?.cyl} x {rx.os?.axis}° 
                                {rx.os?.add && <span className="text-gray-500 ml-2">Add: {rx.os.add}</span>}
                            </span>
                        </div>
                    </div>
                    {rx.notes && (
                        <div className="mt-2 pt-2 border-t border-slate-800 text-gray-500 italic">
                            "{rx.notes}"
                        </div>
                    )}
                </div>
            );
        } catch (e) {
            // Si falla el parseo, mostramos texto plano
            return <div className="mt-2 bg-slate-950 p-2 rounded text-xs text-gray-400 border border-slate-800 font-mono truncate">{notes}</div>;
        }
    }
    // Texto normal
    return <div className="mt-2 bg-slate-950 p-2 rounded text-xs text-gray-400 border border-slate-800 font-mono truncate">{notes}</div>;
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
          <div className="flex justify-end gap-3 mt-4">
             <Button variant="ghost" onClick={onClose}>Cancelar</Button>
             <Button onClick={handleSend}>Confirmar Envío</Button>
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
             <span className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Motivo de Garantía</span>
             <textarea 
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Descripción del defecto..." 
                value={reason} 
                onChange={e => setReason(e.target.value)} 
                rows={3} 
             />
          </label>
          <Input label="Costo Extra ($)" type="number" value={extraCost} onChange={e => setExtraCost(e.target.value)} placeholder="Opcional" />
          <div className="flex justify-end gap-3 mt-4">
             <Button variant="ghost" onClick={onClose}>Cancelar</Button>
             <Button variant="danger" onClick={handleApply}>Aplicar Garantía</Button>
          </div>
      </div>
    );
  };

  const PayLabModalContent = ({ order, onClose }) => {
      const [method, setMethod] = useState("EFECTIVO");
      const handlePay = async () => {
          await createExpense({
              description: `Pago Lab: ${order.labName} (P: ${patientMap[order.patientId]?.lastName})`,
              amount: order.labCost,
              category: "COSTO_VENTA",
              method: method,
              date: new Date().toISOString()
          });
          await updateWorkOrder(order.id, { isPaid: true });
          notify.success(`Pago de $${order.labCost} registrado`);
          refreshData(); onClose();
      };
      return (
        <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded-lg text-center border border-slate-800">
                <div className="text-sm text-gray-400">Monto a Pagar</div>
                <div className="text-2xl font-bold text-emerald-400">${order.labCost?.toLocaleString()}</div>
            </div>
            <Select label="Método de Pago" value={method} onChange={e => setMethod(e.target.value)}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA">Tarjeta</option>
            </Select> 
            <div className="flex justify-end gap-3 mt-4">
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button variant="primary" onClick={handlePay} className="bg-emerald-600 hover:bg-emerald-700">Registrar Pago</Button>
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
            <div className="flex justify-end gap-3 mt-4">
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button variant="primary" onClick={handleConfirm} className="bg-purple-600 hover:bg-purple-700">Confirmar Recepción</Button>
            </div>
        </div>
      );
  };

  if (loading && workOrders.length === 0) return <LoadingState />;

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Work Orders</h1>
        <Button variant="outline" onClick={refreshData}>🔄 Actualizar</Button>
      </div>
      
      {/* MODALES */}
      {sendLabModal && (
          <ModalWrapper title="Enviar a Laboratorio" onClose={() => setSendLabModal(null)} width="400px">
              <SendLabModalContent order={sendLabModal} onClose={() => setSendLabModal(null)} />
          </ModalWrapper>
      )}
      {warrantyModal && (
          <ModalWrapper title="Reportar Garantía" onClose={() => setWarrantyModal(null)} width="400px">
              <WarrantyModalContent order={warrantyModal} onClose={() => setWarrantyModal(null)} />
          </ModalWrapper>
      )}
      {payLabModal && (
          <ModalWrapper title="Pagar Proveedor" onClose={() => setPayLabModal(null)} width="350px">
              <PayLabModalContent order={payLabModal} onClose={() => setPayLabModal(null)} />
          </ModalWrapper>
      )}
      {revisionModal && (
          <ModalWrapper title="Recepción de Trabajo" onClose={() => setRevisionModal(null)} width="450px">
              <RevisionModalContent order={revisionModal} onClose={() => setRevisionModal(null)} />
          </ModalWrapper>
      )}
      {viewSale && <SaleDetailModal sale={viewSale} patient={patientMap[viewSale.patientId]} onClose={() => setViewSale(null)} onUpdate={refreshData} />}

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por paciente, folio o laboratorio..." 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            className="md:w-1/3"
          />
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border
                  ${statusFilter === tab 
                    ? "bg-slate-700 text-white border-slate-500" 
                    : "bg-transparent text-gray-500 border-slate-800 hover:border-slate-600 hover:text-gray-300"}
                `}
              >
                {STATUS_LABELS[tab] || "Todos"}
              </button>
            ))}
          </div>
      </div>
      
      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((o) => {
          const patient = patientMap[o.patientId];
          const sale = salesMap[o.saleId];
          const item = sale?.items?.find(it => it.id === o.saleItemId);
          const profit = (item?.unitPrice || 0) - (o.labCost || 0);
          
          return (
            <Card key={o.id} className="relative group hover:border-slate-600 transition-colors" noPadding>
              {/* Barra de estado lateral */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  o.status === "READY" ? "bg-emerald-500" : 
                  o.status === "SENT_TO_LAB" ? "bg-blue-500" : 
                  o.status === "TO_PREPARE" ? "bg-amber-500" : "bg-slate-700"
              }`}></div>
              
              <div className="p-4 pl-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                     <div>
                        <div className="font-bold text-white text-lg truncate w-48" title={`${patient?.firstName} ${patient?.lastName}`}>
                            {patient ? `${patient.firstName} ${patient.lastName}` : "Paciente"}
                        </div>
                        <div className="text-sm text-gray-400">{item?.description || o.type}</div>
                        <div className="mt-2">
                            <Badge color={STATUS_BADGE_COLOR[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                        </div>
                     </div>
                     
                     <div className="flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {o.status !== "CANCELLED" && o.status !== "DELIVERED" && (
                          <div className="flex gap-1">
                            {o.status !== "ON_HOLD" && o.status !== "TO_PREPARE" && (
                                <button onClick={() => handleStatusChange(o.id, o.status, 'prev')} className="p-1.5 text-gray-500 hover:text-white bg-slate-800 rounded hover:bg-slate-700" title="Regresar Estado">⬅</button>
                            )}
                            <button onClick={() => handleStatusChange(o.id, o.status, 'next')} className="p-1.5 text-blue-400 hover:text-white bg-slate-800 rounded hover:bg-blue-600" title="Avanzar Estado">➡</button>
                          </div>
                        )}
                        {o.status !== "CANCELLED" && (
                            <button onClick={() => setWarrantyModal(o)} className="text-xs text-red-400 hover:underline text-right">Garantía</button>
                        )}
                     </div>
                  </div>
                  
                  {/* Detalles */}
                  <div className="border-t border-slate-800 pt-3 mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                          <div className="text-xs text-gray-500 uppercase font-bold mb-1">Logística</div>
                          <div className="text-gray-300">🏭 {o.labName || "Interno"}</div>
                          {o.courier && <div className="text-gray-400 text-xs mt-1">🚚 {o.courier}</div>}
                          
                          {sale && (
                            <div 
                                onClick={() => setViewSale(sale)} 
                                className={`mt-2 cursor-pointer text-xs font-bold flex items-center gap-1 ${sale.balance > 0 ? "text-red-400" : "text-emerald-400"}`}
                            >
                                {sale.balance > 0 ? `Debe $${sale.balance}` : "Venta Pagada"} ↗
                            </div>
                          )}
                      </div>
                      <div>
                          <div className="text-xs text-gray-500 uppercase font-bold mb-1">Finanzas</div>
                          <div className={profit >= 0 ? "text-emerald-400" : "text-red-400"}>
                              Util: ${profit.toLocaleString()}
                          </div>
                          
                          {o.labCost > 0 && !o.isPaid && o.status !== "CANCELLED" && (
                              <button 
                                  onClick={() => setPayLabModal(o)} 
                                  className="mt-2 text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-800 px-2 py-1 rounded hover:bg-emerald-900/50 w-full"
                              >
                                  Pagar ${o.labCost}
                              </button>
                          )}
                          {o.isPaid && <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">✅ Lab Pagado</div>}
                      </div>
                  </div>

                  {/* Notas Técnicas / Rx (RESTAURADO CON ESTILOS) */}
                  <div className="mt-3">
                      <RxDisplay notes={o.rxNotes} />
                  </div>
                  
                  <div className="mt-2 text-right">
                      <button onClick={() => handleDelete(o.id)} className="text-xs text-gray-600 hover:text-red-500 transition-colors">Eliminar Orden</button>
                  </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}