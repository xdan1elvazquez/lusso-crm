import { useMemo, useState } from "react";
import { getPatients } from "@/services/patientsStorage";
import { getAllSales } from "@/services/salesStorage";
import { getAllWorkOrders, updateWorkOrder, nextStatus } from "@/services/workOrdersStorage";

const STATUS_LABELS = {
  TO_PREPARE: "Por preparar",
  SENT_TO_LAB: "Enviado a laboratorio",
  READY: "Listo para entregar",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

const STATUS_TABS = ["ALL", "TO_PREPARE", "SENT_TO_LAB", "READY", "DELIVERED", "CANCELLED"];

export default function WorkOrdersPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [tick, setTick] = useState(0);

  const patients = useMemo(() => getPatients(), [tick]);
  const patientMap = useMemo(
    () =>
      patients.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {}),
    [patients]
  );
  const salesMap = useMemo(() => {
    const map = {};
    getAllSales().forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [tick]);

  const workOrders = useMemo(() => getAllWorkOrders(), [tick]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return workOrders
      .filter((w) => status === "ALL" || w.status === status)
      .filter((w) => {
        if (!q) return true;
        const patient = patientMap[w.patientId];
        const text = [
          patient?.firstName,
          patient?.lastName,
          patient?.phone,
          w.labName,
          w.type,
          w.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
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

  // --- FUNCIÓN INTELIGENTE PARA LEER RX (JSON) O TEXTO ---
  const renderNotesOrRx = (notes) => {
    if (!notes) return null;

    // Detectamos si es JSON (empieza con llave { )
    if (notes.trim().startsWith("{")) {
      try {
        const rx = JSON.parse(notes);
        return (
          <div style={{ background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 8, marginTop: 6, fontSize: "0.9em", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "grid", gap: 8 }}>
              {/* OJO DERECHO */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <strong style={{ color: "#60a5fa", minWidth: 24 }}>OD:</strong>
                <span>
                  {rx.od?.sph?.toFixed(2)} / {rx.od?.cyl?.toFixed(2)} x {rx.od?.axis}° 
                  {rx.od?.add && <span style={{ opacity: 0.7, marginLeft: 8, fontSize: "0.9em" }}>Add: {rx.od.add.toFixed(2)}</span>}
                </span>
              </div>
              
              {/* OJO IZQUIERDO */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <strong style={{ color: "#60a5fa", minWidth: 24 }}>OI:</strong>
                <span>
                  {rx.os?.sph?.toFixed(2)} / {rx.os?.cyl?.toFixed(2)} x {rx.os?.axis}° 
                  {rx.os?.add && <span style={{ opacity: 0.7, marginLeft: 8, fontSize: "0.9em" }}>Add: {rx.os.add.toFixed(2)}</span>}
                </span>
              </div>

              {/* Distancia Pupilar */}
              {(rx.pd?.distance || rx.pd?.near) && (
                 <div style={{ fontSize: "0.85em", color: "#aaa", marginLeft: 34 }}>
                    DP: {rx.pd?.distance || "-"} / {rx.pd?.near || "-"}
                 </div>
              )}
            </div>
            
            {/* Notas adicionales dentro del JSON */}
            {rx.notes && (
              <div style={{ marginTop: 8, fontStyle: "italic", opacity: 0.7, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 6 }}>
                📝 "{rx.notes}"
              </div>
            )}
          </div>
        );
      } catch (e) {
        // Si falla la conversión, muestra texto normal
        return <div style={{ whiteSpace: "pre-wrap" }}>{notes}</div>;
      }
    }

    // Si no es JSON, es una nota normal
    return <div style={{ whiteSpace: "pre-wrap" }}>{notes}</div>;
  };

  return (
    <div style={{ color: "white", display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Work Orders</h1>
        <button onClick={() => setTick((t) => t + 1)} style={{ background: "#333", color: "white", border: "1px solid #555", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
          Actualizar
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: tab === status ? "rgba(255,255,255,0.12)" : "transparent",
              color: "white",
              cursor: "pointer",
            }}
          >
            {tab === "ALL" ? "Todos" : STATUS_LABELS[tab] || tab}
          </button>
        ))}
      </div>

      <input
        placeholder="Buscar por nombre, teléfono, laboratorio, tipo o status"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          padding: 10,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.05)",
          color: "white",
          width: "100%"
        }}
      />

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <p style={{ opacity: 0.8 }}>No hay work orders con ese filtro.</p>
        ) : (
          filtered.map((o) => {
            const patient = patientMap[o.patientId];
            const sale = o.saleId ? salesMap[o.saleId] : null;
            const saleItem = sale?.items?.find((it) => it.id === o.saleItemId);
            const due = o.dueDate ? new Date(o.dueDate).toLocaleDateString() : "Sin fecha";
            const canAdvance = !["DELIVERED", "CANCELLED"].includes(o.status);
            return (
              <div
                key={o.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: 16,
                  display: "grid",
                  gap: 12,
                  background: "#111"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", borderBottom: "1px solid #222", paddingBottom: 8 }}>
                  <div>
                    <strong style={{ fontSize: "1.1em" }}>{patient ? `${patient.firstName} ${patient.lastName}` : "Paciente"}</strong>
                    <div style={{ fontSize: 13, opacity: 0.6 }}>
                      {patient?.phone || "Sin teléfono"} · <span style={{color: "#4ade80"}}>{STATUS_LABELS[o.status] || o.status}</span>
                    </div>
                  </div>
                  {canAdvance && (
                    <button 
                      onClick={() => onAdvance(o.id, o.status)}
                      style={{ background: "#2563eb", color: "white", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9em" }}
                    >
                      Avanzar status
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
                  <Metric label="Tipo" value={o.type} />
                  <Metric label="Laboratorio" value={o.labName || "No asignado"} />
                  <Metric label="Entrega estimada" value={due} />
                  {sale && (
                    <>
                      <Metric label="Venta total" value={formatCurrency(sale.total)} />
                      <Metric label="Saldo venta" value={formatCurrency(sale.balance)} />
                    </>
                  )}
                </div>
                
                {saleItem && (
                   <div style={{ background: "#222", padding: 8, borderRadius: 4, fontSize: "0.9em" }}>
                      <span style={{ opacity: 0.7 }}>Producto:</span> <strong>{saleItem.kind} · {saleItem.description}</strong>
                   </div>
                )}

                {o.rxNotes && (
                  <div>
                    {/* AQUÍ ESTÁ EL CAMBIO: El label debe decir Notas / Rx */}
                    <strong style={{ fontSize: "0.9em", opacity: 0.8 }}>Notas / Rx:</strong>
                    {renderNotesOrRx(o.rxNotes)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <div style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: "1.05em" }}>{value}</div>
    </div>
  );
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return num.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });
}