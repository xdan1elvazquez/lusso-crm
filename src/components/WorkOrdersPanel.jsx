import { useMemo, useState } from "react";
import { getPatients } from "@/services/patientsStorage";
import { getAllSales } from "@/services/salesStorage";
import { getAllWorkOrders, updateWorkOrder, nextStatus } from "@/services/workOrdersStorage";

// UI Kit
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

const STATUS_LABELS = {
  TO_PREPARE: "Por preparar",
  SENT_TO_LAB: "Enviado a laboratorio",
  READY: "Listo para entregar",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

const STATUS_BADGE_COLOR = {
  TO_PREPARE: "yellow",
  SENT_TO_LAB: "blue",
  READY: "green",
  DELIVERED: "gray",
  CANCELLED: "red"
};

const STATUS_TABS = ["ALL", "TO_PREPARE", "SENT_TO_LAB", "READY", "DELIVERED", "CANCELLED"];

export default function WorkOrdersPanel() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [tick, setTick] = useState(0);

  const patients = useMemo(() => getPatients(), [tick]);
  const patientMap = useMemo(() => patients.reduce((acc, p) => { acc[p.id] = p; return acc; }, {}), [patients]);
  const salesMap = useMemo(() => { const map = {}; getAllSales().forEach((s) => { map[s.id] = s; }); return map; }, [tick]);
  const workOrders = useMemo(() => getAllWorkOrders(), [tick]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return workOrders
      .filter((w) => status === "ALL" || w.status === status)
      .filter((w) => {
        if (!q) return true;
        const patient = patientMap[w.patientId];
        const text = [patient?.firstName, patient?.lastName, patient?.phone, w.labName, w.type, w.status].filter(Boolean).join(" ").toLowerCase();
        return text.includes(q);
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [workOrders, status, query, patientMap]);

  const onAdvance = (id, currentStatus) => {
    const next = nextStatus(currentStatus);
    if (next === currentStatus) return;
    updateWorkOrder(id, { status: next });
    setTick((t) => t + 1);
  };

  const renderNotesOrRx = (notes) => {
    if (!notes) return null;
    if (notes.trim().startsWith("{")) {
      try {
        const rx = JSON.parse(notes);
        return (
          <div className="bg-surfaceHighlight/50 p-3 rounded-lg mt-2 text-xs border border-border font-mono">
            <div className="grid gap-1">
              <div className="flex gap-2"><strong className="text-blue-400 w-6">OD:</strong><span>{rx.od?.sph} / {rx.od?.cyl} x {rx.od?.axis}° {rx.od?.add && <span className="opacity-70 ml-2">Add: {rx.od.add}</span>}</span></div>
              <div className="flex gap-2"><strong className="text-green-400 w-6">OI:</strong><span>{rx.os?.sph} / {rx.os?.cyl} x {rx.os?.axis}° {rx.os?.add && <span className="opacity-70 ml-2">Add: {rx.os.add}</span>}</span></div>
            </div>
            {rx.notes && <div className="mt-2 pt-2 border-t border-white/10 text-textMuted italic">"{rx.notes}"</div>}
          </div>
        );
      } catch (e) { return <div className="mt-2 text-sm text-textMuted whitespace-pre-wrap">{notes}</div>; }
    }
    return <div className="mt-2 text-sm text-textMuted whitespace-pre-wrap">{notes}</div>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-white">Órdenes de Trabajo (Panel)</h2>
        <button onClick={() => setTick(t => t + 1)} className="text-xs bg-surface border border-border px-3 py-1.5 rounded hover:bg-surfaceHighlight text-white">🔄 Actualizar</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${tab === status ? "bg-primary text-white border-primary" : "bg-surface text-textMuted border-border hover:text-white"}`}
          >
            {tab === "ALL" ? "Todos" : STATUS_LABELS[tab] || tab}
          </button>
        ))}
      </div>

      <Input 
        placeholder="Buscar por nombre, teléfono, laboratorio..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="bg-surface"
      />

      <div className="grid gap-3">
        {filtered.length === 0 ? <p className="text-center py-8 text-textMuted italic">No hay órdenes.</p> : 
          filtered.map((o) => {
            const patient = patientMap[o.patientId];
            const sale = o.saleId ? salesMap[o.saleId] : null;
            const saleItem = sale?.items?.find((it) => it.id === o.saleItemId);
            const due = o.dueDate ? new Date(o.dueDate).toLocaleDateString() : "Sin fecha";
            const canAdvance = !["DELIVERED", "CANCELLED"].includes(o.status);
            
            return (
              <Card key={o.id} noPadding className="p-4 group">
                <div className="flex justify-between items-start border-b border-border pb-2 mb-3">
                  <div>
                    <strong className="text-lg text-white">{patient ? `${patient.firstName} ${patient.lastName}` : "Paciente"}</strong>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge color={STATUS_BADGE_COLOR[o.status]}>{STATUS_LABELS[o.status] || o.status}</Badge>
                        <span className="text-xs text-textMuted">{patient?.phone}</span>
                    </div>
                  </div>
                  {canAdvance && (
                    <button 
                      onClick={() => onAdvance(o.id, o.status)}
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded font-bold transition-colors shadow-glow"
                    >
                      Avanzar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                      <span className="block text-[10px] text-textMuted uppercase font-bold">Tipo</span>
                      <span className="text-white">{o.type}</span>
                  </div>
                  <div>
                      <span className="block text-[10px] text-textMuted uppercase font-bold">Laboratorio</span>
                      <span className="text-white">{o.labName || "No asignado"}</span>
                  </div>
                  <div>
                      <span className="block text-[10px] text-textMuted uppercase font-bold">Entrega</span>
                      <span className="text-white">{due}</span>
                  </div>
                  {sale && (
                    <div>
                      <span className="block text-[10px] text-textMuted uppercase font-bold">Saldo Venta</span>
                      <span className={`font-bold ${sale.balance > 0 ? "text-red-400" : "text-emerald-400"}`}>${sale.balance}</span>
                    </div>
                  )}
                </div>
                
                {saleItem && (
                   <div className="bg-surfaceHighlight/30 p-2 rounded text-xs text-gray-300 mb-2">
                      Producto: <strong className="text-white">{saleItem.kind} · {saleItem.description}</strong>
                   </div>
                )}

                {o.rxNotes && (
                  <div>
                    <strong className="text-xs text-textMuted uppercase">Notas / Rx:</strong>
                    {renderNotesOrRx(o.rxNotes)}
                  </div>
                )}
              </Card>
            );
          })
        }
      </div>
    </div>
  );
}