import { useMemo, useState } from "react";
import { getPatients } from "@/services/patientsStorage";
import { getAllSales } from "@/services/salesStorage";
import { 
  getAllWorkOrders, 
  updateWorkOrder, 
  nextStatus, 
  prevStatus, 
  deleteWorkOrder 
} from "@/services/workOrdersStorage";

const STATUS_LABELS = {
  TO_PREPARE: "Por preparar",
  SENT_TO_LAB: "Enviado a laboratorio",
  READY: "Listo para entregar",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS = {
  TO_PREPARE: "#facc15",
  SENT_TO_LAB: "#60a5fa",
  READY: "#4ade80",
  DELIVERED: "#9ca3af",
  CANCELLED: "#f87171",
};

const STATUS_TABS = ["ALL", "TO_PREPARE", "SENT_TO_LAB", "READY", "DELIVERED", "CANCELLED"];

export default function WorkOrdersPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tick, setTick] = useState(0);

  const patients = useMemo(() => getPatients(), [tick]);
  const sales = useMemo(() => getAllSales(), [tick]);
  const workOrders = useMemo(() => getAllWorkOrders(), [tick]);

  const patientMap = useMemo(() => 
    patients.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}), 
  [patients]);
  
  const salesMap = useMemo(() => 
    sales.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}), 
  [sales]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return workOrders
      .filter((w) => statusFilter === "ALL" || w.status === statusFilter)
      .filter((w) => {
        if (!q) return true;
        const patient = patientMap[w.patientId];
        const text = [
          patient?.firstName, patient?.lastName, w.labName, w.type, w.status
        ].filter(Boolean).join(" ").toLowerCase();
        return text.includes(q);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [workOrders, statusFilter, query, patientMap]);

  const handleStatusChange = (id, current, direction) => {
    const newStatus = direction === 'next' ? nextStatus(current) : prevStatus(current);
    if (newStatus !== current) {
      updateWorkOrder(id, { status: newStatus });
      setTick(t => t + 1);
    }
  };

  const handleCancel = (id) => {
    if (confirm("¿Cancelar esta orden de trabajo?")) {
      updateWorkOrder(id, { status: "CANCELLED" });
      setTick(t => t + 1);
    }
  };

  // --- GENERADOR DE ORDEN DE LABORATORIO (CORREGIDO) ---
  const handlePrintOrder = (order) => {
    const patient = patientMap[order.patientId];
    const sale = salesMap[order.saleId];
    const item = sale?.items?.find(i => i.id === order.saleItemId);
    
    // Lógica de limpieza de notas
    let rxData = {};
    let isJson = false;
    let notesToDisplay = "";

    // Intentamos parsear si parece JSON
    if (order.rxNotes && order.rxNotes.trim().startsWith("{")) {
      try {
        rxData = JSON.parse(order.rxNotes);
        isJson = true;
        notesToDisplay = rxData.notes || ""; // Si es JSON, usamos SOLO la nota interna
      } catch(e) {
        notesToDisplay = order.rxNotes; // Si falla, usamos todo el texto
      }
    } else {
      notesToDisplay = order.rxNotes || ""; // Si no es JSON, es texto plano
    }

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Orden Lab #${order.id.slice(0,8)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; }
            .meta { text-align: right; font-size: 14px; }
            .section { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
            .section h3 { margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 5px; font-size: 16px; background: #f9f9f9; padding: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
            th { background: #eee; }
            .notes { font-style: italic; background: #fff3cd; padding: 10px; border: 1px solid #ffeeba; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; border-top: 1px solid #ccc; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">LUSSO ÓPTICA - ORDEN DE LABORATORIO</div>
            <div class="meta">
              <div>Folio: <strong>${order.id.slice(0, 8).toUpperCase()}</strong></div>
              <div>Fecha: ${new Date().toLocaleDateString()}</div>
              <div>Laboratorio: <strong>${order.labName || "Interno"}</strong></div>
            </div>
          </div>

          <div class="section">
            <h3>DATOS DEL PACIENTE Y TRABAJO</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>Paciente: <strong>${patient?.firstName} ${patient?.lastName}</strong></div>
              <div>Material/Producto: <strong>${item?.description || order.type}</strong></div>
              <div>Tipo: <strong>${order.type}</strong></div>
              <div>Entrega Prometida: <strong>${order.dueDate ? new Date(order.dueDate).toLocaleDateString() : "N/A"}</strong></div>
            </div>
          </div>

          <div class="section">
            <h3>GRADUACIÓN (RX)</h3>
            ${isJson ? `
            <table>
              <thead>
                <tr>
                  <th>OJO</th>
                  <th>ESFERA</th>
                  <th>CILINDRO</th>
                  <th>EJE</th>
                  <th>ADICIÓN</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>OD</strong></td>
                  <td>${rxData.od?.sph || "Neutro"}</td>
                  <td>${rxData.od?.cyl || "-"}</td>
                  <td>${rxData.od?.axis ? rxData.od.axis + "°" : "-"}</td>
                  <td>${rxData.od?.add || "-"}</td>
                </tr>
                <tr>
                  <td><strong>OI</strong></td>
                  <td>${rxData.os?.sph || "Neutro"}</td>
                  <td>${rxData.os?.cyl || "-"}</td>
                  <td>${rxData.os?.axis ? rxData.os.axis + "°" : "-"}</td>
                  <td>${rxData.os?.add || "-"}</td>
                </tr>
              </tbody>
            </table>
            
            ${(rxData.pd?.distance || rxData.pd?.near) ? `
              <div style="margin-top:10px; font-weight:bold;">
                D.P. Lejos: ${rxData.pd.distance || "-"} mm | D.P. Cerca: ${rxData.pd.near || "-"} mm
              </div>` : ''}

            ` : `<p>${order.rxNotes || "Sin datos estructurados"}</p>`}
          </div>

          ${notesToDisplay ? `
          <div class="section notes">
            <strong>Observaciones / Tratamientos Especiales:</strong><br/>
            ${notesToDisplay}
          </div>` : ''}

          <div class="footer">
            Este documento es una orden interna de trabajo. Favor de devolver con el trabajo terminado.<br/>
            Lusso CRM System
          </div>

          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const RxDisplay = ({ rxData }) => {
    if (!rxData?.od) return null;
    return (
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: 10, fontSize: "0.85em", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 5, marginBottom: 4 }}>
          <strong style={{ color: "#60a5fa" }}>OD</strong>
          <span>{rxData.od.sph} / {rxData.od.cyl} x {rxData.od.axis}° {rxData.od.add ? `Add ${rxData.od.add}` : ""}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 5 }}>
          <strong style={{ color: "#60a5fa" }}>OI</strong>
          <span>{rxData.os.sph} / {rxData.os.cyl} x {rxData.os.axis}° {rxData.os.add ? `Add ${rxData.os.add}` : ""}</span>
        </div>
        {rxData.notes && <div style={{ marginTop: 6, fontStyle: "italic", color: "#aaa", borderTop: "1px solid #444", paddingTop: 4 }}>"{rxData.notes}"</div>}
      </div>
    );
  };

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Work Orders</h1>
        <div style={{ fontSize: "0.9em", color: "#aaa" }}>
            {filtered.length} Órdenes activas
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              border: statusFilter === tab ? `1px solid ${STATUS_COLORS[tab] || "#fff"}` : "1px solid #333",
              background: statusFilter === tab ? "rgba(255,255,255,0.1)" : "transparent",
              color: statusFilter === tab ? "white" : "#888",
              cursor: "pointer",
              fontSize: "0.9em"
            }}
          >
            {STATUS_LABELS[tab] || "Todos"}
          </button>
        ))}
      </div>

      <input
        placeholder="Buscar por nombre, teléfono, laboratorio, tipo o status"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "white", marginBottom: 20 }}
      />

      <div style={{ display: "grid", gap: 15 }}>
        {filtered.map((o) => {
          const patient = patientMap[o.patientId];
          const sale = salesMap[o.saleId];
          const item = sale?.items?.find(it => it.id === o.saleItemId);
          
          let rxData = null;
          try { rxData = JSON.parse(o.rxNotes); } catch(e) { /* no es json */ }

          return (
            <div key={o.id} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: 16, display: "grid", gap: 12, position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 4, background: STATUS_COLORS[o.status] || "#555", borderRadius: "0 4px 4px 0" }}></div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", paddingLeft: 10 }}>
                 <div>
                    <div style={{ fontSize: "1.1em", fontWeight: "bold" }}>
                       {patient ? `${patient.firstName} ${patient.lastName}` : "Paciente Desconocido"}
                    </div>
                    <div style={{ fontSize: "0.85em", color: "#888", marginTop: 2 }}>
                       Folio: {o.id.slice(0, 8).toUpperCase()} · <span style={{ color: STATUS_COLORS[o.status] }}>{STATUS_LABELS[o.status]}</span>
                    </div>
                 </div>

                 <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handlePrintOrder(o)} style={{ background: "#333", border: "1px solid #555", color: "white", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: "0.9em" }} title="Imprimir Orden Lab">🖨️</button>
                    
                    {o.status !== "CANCELLED" && o.status !== "DELIVERED" && (
                      <>
                        {o.status !== "TO_PREPARE" && (
                          <button onClick={() => handleStatusChange(o.id, o.status, 'prev')} style={{ background: "transparent", border: "1px solid #555", color: "#aaa", padding: "6px 10px", borderRadius: 4, cursor: "pointer" }}>⬅</button>
                        )}
                        <button onClick={() => handleStatusChange(o.id, o.status, 'next')} style={{ background: "#2563eb", border: "none", color: "white", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontWeight: "bold", fontSize: "0.9em" }}>Avanzar ➡</button>
                      </>
                    )}
                    
                    {o.status !== "CANCELLED" && (
                        <button onClick={() => handleCancel(o.id)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: "0.8em", textDecoration: "underline" }}>Cancelar</button>
                    )}
                 </div>
              </div>

              <div style={{ paddingLeft: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                 <div>
                    <div style={{ fontSize: "0.85em", color: "#666", textTransform: "uppercase" }}>Trabajo</div>
                    <div style={{ fontWeight: "600" }}>{item?.description || o.type}</div>
                    <div style={{ marginTop: 6 }}>
                       <span style={{ fontSize: "0.85em", background: "#222", padding: "3px 6px", borderRadius: 4, color: "#aaa" }}>Lab: {o.labName || "Interno"}</span>
                       <span style={{ fontSize: "0.85em", background: "#222", padding: "3px 6px", borderRadius: 4, color: "#aaa", marginLeft: 8 }}>Entrega: {o.dueDate ? new Date(o.dueDate).toLocaleDateString() : "Sin fecha"}</span>
                    </div>
                 </div>
                 <div>
                    <div style={{ fontSize: "0.85em", color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Graduación</div>
                    {rxData ? <RxDisplay rxData={rxData} /> : <div style={{ fontStyle: "italic", color: "#666" }}>{o.rxNotes}</div>}
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}