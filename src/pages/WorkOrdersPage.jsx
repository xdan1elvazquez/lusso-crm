import { useMemo, useState } from "react";
import { getPatients } from "@/services/patientsStorage";
import { getAllSales } from "@/services/salesStorage";
import { getAllWorkOrders, updateWorkOrder, nextStatus, prevStatus, applyWarranty, deleteWorkOrder } from "@/services/workOrdersStorage";
import { getLabs } from "@/services/labStorage"; 

const STATUS_LABELS = { TO_PREPARE: "Por preparar", SENT_TO_LAB: "Enviado a laboratorio", READY: "Listo para entregar", DELIVERED: "Entregado", CANCELLED: "Cancelado" };
const STATUS_COLORS = { TO_PREPARE: "#facc15", SENT_TO_LAB: "#60a5fa", READY: "#4ade80", DELIVERED: "#9ca3af", CANCELLED: "#f87171" };
const STATUS_TABS = ["ALL", "TO_PREPARE", "SENT_TO_LAB", "READY", "DELIVERED", "CANCELLED"];

export default function WorkOrdersPage() {
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  const [sendLabModal, setSendLabModal] = useState(null); 
  const [warrantyModal, setWarrantyModal] = useState(null); 

  const patients = useMemo(() => getPatients(), [tick]);
  const sales = useMemo(() => getAllSales(), [tick]);
  const workOrders = useMemo(() => getAllWorkOrders(), [tick]);
  const labs = useMemo(() => getLabs(), []);

  const patientMap = useMemo(() => patients.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}), [patients]);
  const salesMap = useMemo(() => sales.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}), [sales]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return workOrders.filter(w => (statusFilter === "ALL" || w.status === statusFilter) && (
      (patientMap[w.patientId]?.firstName + " " + w.labName + " " + w.type).toLowerCase().includes(q)
    )).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [workOrders, statusFilter, query, patientMap]);

  const handleAdvance = (order) => {
    const next = nextStatus(order.status);
    if (next === "SENT_TO_LAB") {
      setSendLabModal(order);
      return;
    }
    updateWorkOrder(order.id, { status: next });
    setTick(t => t + 1);
  };
  
  const handleStatusChange = (id, current, direction) => {
    if (direction === 'next') {
      const w = workOrders.find(o => o.id === id);
      handleAdvance(w);
    } else {
      const prev = prevStatus(current);
      updateWorkOrder(id, { status: prev });
      setTick(t => t + 1);
    }
  };

  const handleCancel = (id) => {
    if (confirm("¿Cancelar orden?")) { updateWorkOrder(id, { status: "CANCELLED" }); setTick(t => t + 1); }
  };

  // --- RENDERIZADO DE RX ---
  const RxDisplay = ({ rxNotes }) => {
    if (!rxNotes) return null;
    if (!rxNotes.trim().startsWith("{")) return <div style={{ whiteSpace: "pre-wrap", fontSize: "0.9em" }}>{rxNotes}</div>;

    try {
      const rx = JSON.parse(rxNotes);
      return (
        <div style={{ background: "rgba(255,255,255,0.05)", padding: 10, borderRadius: 6, fontSize: "0.9em", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "grid", gap: 5 }}>
             <div><strong style={{color:"#60a5fa"}}>OD:</strong> {rx.od?.sph} / {rx.od?.cyl} x {rx.od?.axis}° {rx.od?.add && <span>Add: {rx.od.add}</span>}</div>
             <div><strong style={{color:"#60a5fa"}}>OI:</strong> {rx.os?.sph} / {rx.os?.cyl} x {rx.os?.axis}° {rx.os?.add && <span>Add: {rx.os.add}</span>}</div>
             {(rx.pd?.distance || rx.pd?.near) && <div style={{fontSize:"0.85em", color:"#aaa"}}>DP: {rx.pd?.distance} / {rx.pd?.near}</div>}
          </div>
          {rx.notes && <div style={{marginTop:5, fontStyle:"italic", opacity:0.7, borderTop:"1px solid #444", paddingTop:4}}>"{rx.notes}"</div>}
        </div>
      );
    } catch(e) { return <div>{rxNotes}</div>; }
  };

  // --- IMPRESIÓN PDF ---
  const handlePrintOrder = (order) => {
     const patient = patientMap[order.patientId];
     const sale = salesMap[order.saleId];
     const item = sale?.items?.find(i => i.id === order.saleItemId);
     let rxHtml = "";
     
     if(order.rxNotes.startsWith("{")){
        try {
           const rx = JSON.parse(order.rxNotes);
           rxHtml = `
             <table style="width:100%; border-collapse:collapse; margin-top:10px;">
               <tr><th style="border:1px solid #ccc; padding:5px;">OJO</th><th style="border:1px solid #ccc;">ESF</th><th style="border:1px solid #ccc;">CIL</th><th style="border:1px solid #ccc;">EJE</th><th style="border:1px solid #ccc;">ADD</th></tr>
               <tr><td>OD</td><td>${rx.od.sph}</td><td>${rx.od.cyl}</td><td>${rx.od.axis}</td><td>${rx.od.add||""}</td></tr>
               <tr><td>OI</td><td>${rx.os.sph}</td><td>${rx.os.cyl}</td><td>${rx.os.axis}</td><td>${rx.os.add||""}</td></tr>
             </table>
             ${rx.notes ? `<div style="margin-top:10px; font-style:italic;">Nota: ${rx.notes}</div>` : ""}
           `;
        } catch(e) { rxHtml = `<p>${order.rxNotes}</p>`; }
     } else { rxHtml = `<p>${order.rxNotes}</p>`; }

     const win = window.open('','','width=800,height=600');
     win.document.write(`
       <html><body style="font-family:Arial; padding:20px;">
         <h2 style="text-align:center; border-bottom:2px solid black;">ORDEN DE LABORATORIO</h2>
         <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">
            <div>Paciente: <strong>${patient?.firstName} ${patient?.lastName}</strong></div>
            <div>Trabajo: <strong>${item?.description || order.type}</strong></div>
            <div>Folio: <strong>${order.id.slice(0,8).toUpperCase()}</strong></div>
            <div>Fecha: ${new Date().toLocaleDateString()}</div>
         </div>
         <div style="border:1px solid #ccc; padding:10px; border-radius:5px;">
            <h3>Graduación</h3>
            ${rxHtml}
         </div>
         <div style="margin-top:40px; text-align:center; font-size:12px;">Lusso CRM System</div>
         <script>window.print();</script>
       </body></html>
     `);
     win.document.close();
  };

  // --- MODALES ---
  const SendLabModal = ({ order, onClose }) => {
    const [labId, setLabId] = useState(order.labId || "");
    const [cost, setCost] = useState(order.labCost || "");
    const selectedLab = labs.find(l => l.id === labId);
    return (
      <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
        <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 10, width: 400, border: "1px solid #60a5fa" }}>
          <h3 style={{ marginTop: 0, color: "#60a5fa" }}>Enviar a Laboratorio</h3>
          <label style={{ display: "block", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "#aaa" }}>Laboratorio</span>
            <select value={labId} onChange={e => setLabId(e.target.value)} style={{ width: "100%", padding: 8, background: "#222", color: "white", border: "1px solid #444", marginTop: 4 }}>
              <option value="">-- Seleccionar --</option>
              {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          {selectedLab && (
             <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                {selectedLab.services.map(s => <button key={s.id} onClick={() => setCost(s.price)} style={{ fontSize: 11, padding: "4px 8px", background: "#333", border: "1px solid #555", color: "#ddd", cursor: "pointer" }}>{s.name} ${s.price}</button>)}
             </div>
          )}
          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: "#aaa" }}>Costo ($)</span>
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} style={{ width: "100%", padding: 8, background: "#222", color: "white", border: "1px solid #444", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
             <button onClick={onClose} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
             <button onClick={() => { updateWorkOrder(order.id, { status: "SENT_TO_LAB", labId, labName: selectedLab?.name || "Externo", labCost: Number(cost) }); setTick(t => t + 1); onClose(); }} style={{ background: "#60a5fa", color: "black", padding: "8px 16px", border: "none", borderRadius: 4, fontWeight: "bold", cursor: "pointer" }}>Confirmar</button>
          </div>
        </div>
      </div>
    );
  };

  const WarrantyModal = ({ order, onClose }) => {
    const [reason, setReason] = useState("");
    const [extraCost, setExtraCost] = useState("");
    return (
      <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
        <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 10, width: 400, border: "1px solid #f87171" }}>
          <h3 style={{ marginTop: 0, color: "#f87171" }}>⚠️ Reportar Garantía</h3>
          <textarea placeholder="Razón..." value={reason} onChange={e => setReason(e.target.value)} rows={3} style={{ width: "100%", padding: 8, background: "#222", color: "white", border: "1px solid #444", marginBottom: 10 }} />
          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: "#aaa" }}>Costo Extra ($)</span>
            <input type="number" value={extraCost} onChange={e => setExtraCost(e.target.value)} placeholder="0.00" style={{ width: "100%", padding: 8, background: "#222", color: "white", border: "1px solid #444", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
             <button onClick={onClose} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
             <button onClick={() => { if(!reason) return alert("Escribe razón"); applyWarranty(order.id, reason, extraCost); setTick(t => t + 1); onClose(); }} style={{ background: "#f87171", color: "white", padding: "8px 16px", border: "none", borderRadius: 4, fontWeight: "bold", cursor: "pointer" }}>Aplicar</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>Work Orders</h1>
        <button onClick={() => setTick(t => t + 1)} style={{ background: "#333", color: "white", border: "1px solid #555", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Actualizar</button>
      </div>
      {sendLabModal && <SendLabModal order={sendLabModal} onClose={() => setSendLabModal(null)} />}
      {warrantyModal && <WarrantyModal order={warrantyModal} onClose={() => setWarrantyModal(null)} />}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {STATUS_TABS.map((tab) => <button key={tab} onClick={() => setStatusFilter(tab)} style={{ padding: "6px 12px", borderRadius: 20, border: statusFilter === tab ? `1px solid ${STATUS_COLORS[tab]}` : "1px solid #333", background: statusFilter === tab ? "rgba(255,255,255,0.1)" : "transparent", color: statusFilter === tab ? "white" : "#888", cursor: "pointer", fontSize: "0.9em" }}>{STATUS_LABELS[tab] || "Todos"}</button>)}
      </div>
      <input placeholder="Buscar..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "white", marginBottom: 20 }} />
      <div style={{ display: "grid", gap: 15 }}>
        {filtered.map((o) => {
          const patient = patientMap[o.patientId];
          const sale = salesMap[o.saleId];
          const item = sale?.items?.find(it => it.id === o.saleItemId);
          const salePrice = item?.unitPrice || 0;
          const totalCost = (o.labCost || 0);
          const profit = salePrice - totalCost;
          const profitMargin = salePrice > 0 ? ((profit / salePrice) * 100).toFixed(0) : 0;
          
          return (
            <div key={o.id} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: 16, display: "grid", gap: 12, position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 4, background: STATUS_COLORS[o.status] || "#555", borderRadius: "0 4px 4px 0" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", paddingLeft: 10 }}>
                 <div>
                    <div style={{ fontSize: "1.1em", fontWeight: "bold" }}>{patient ? `${patient.firstName} ${patient.lastName}` : "Paciente"}</div>
                    <div style={{ fontSize: "0.85em", color: "#888" }}>{item?.description || o.type}</div>
                 </div>
                 <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handlePrintOrder(o)} style={{ background: "#333", border: "1px solid #555", color: "white", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: "0.9em" }}>🖨️</button>
                    {o.status !== "CANCELLED" && o.status !== "DELIVERED" && (
                      <>
                        {o.status !== "TO_PREPARE" && <button onClick={() => handleStatusChange(o.id, o.status, 'prev')} style={{ background: "transparent", border: "1px solid #555", color: "#aaa", padding: "6px 10px", borderRadius: 4, cursor: "pointer" }}>⬅</button>}
                        <button onClick={() => handleStatusChange(o.id, o.status, 'next')} style={{ background: "#2563eb", border: "none", color: "white", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontWeight: "bold", fontSize: "0.9em" }}>{o.status === "TO_PREPARE" ? "Enviar a Lab ➡" : "Avanzar ➡"}</button>
                      </>
                    )}
                    {o.status !== "CANCELLED" && <button onClick={() => setWarrantyModal(o)} style={{ background: "#450a0a", border: "1px solid #f87171", color: "#f87171", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: "0.8em" }}>⚠️ Garantía</button>}
                 </div>
              </div>
              <div style={{ paddingLeft: 10, display: "flex", gap: 20, fontSize: "0.9em", background: "#111", padding: 10, borderRadius: 6 }}>
                 <div><div style={{ color: "#aaa", fontSize: 11 }}>LABORATORIO</div><div style={{ fontWeight: "bold" }}>{o.labName || "Pendiente"}</div></div>
                 <div><div style={{ color: "#aaa", fontSize: 11 }}>COSTO</div><div style={{ fontWeight: "bold", color: "#f87171" }}>${o.labCost}</div></div>
                 <div><div style={{ color: "#aaa", fontSize: 11 }}>UTILIDAD</div><div style={{ fontWeight: "bold", color: profit >= 0 ? "#4ade80" : "#f87171" }}>${profit} ({profitMargin}%)</div></div>
                 {o.isWarranty && <div style={{ color: "#f87171", fontSize: 11, alignSelf: "center", fontWeight: "bold" }}>🚨 TIENE GARANTÍA</div>}
              </div>
              <RxDisplay rxNotes={o.rxNotes} />
            </div>
          );
        })}
      </div>
    </div>
  );
}