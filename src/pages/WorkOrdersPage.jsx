import { useMemo, useState, useEffect } from "react";
import { getPatients } from "@/services/patientsStorage";
import { getAllSales } from "@/services/salesStorage";
import { getAllWorkOrders, updateWorkOrder, nextStatus, prevStatus, applyWarranty } from "@/services/workOrdersStorage";
import { getLabs } from "@/services/labStorage"; 
import { getEmployees, ROLES } from "@/services/employeesStorage"; // 👈 Importamos el catálogo de empleados
import SaleDetailModal from "@/components/SaleDetailModal"; 

// --- CONSTANTES DE ESTADO NUEVAS ---
const STATUS_LABELS = { 
  ON_HOLD: "En Espera (Anticipo)",
  TO_PREPARE: "Por Preparar", 
  SENT_TO_LAB: "En Laboratorio", 
  QUALITY_CHECK: "Revisión / Calidad",
  READY: "Listo para Entregar", 
  DELIVERED: "Entregado", 
  CANCELLED: "Cancelado" 
};

const STATUS_COLORS = { 
  ON_HOLD: "#fca5a5",
  TO_PREPARE: "#facc15", 
  SENT_TO_LAB: "#60a5fa", 
  QUALITY_CHECK: "#a78bfa", // Morado
  READY: "#4ade80", 
  DELIVERED: "#9ca3af", 
  CANCELLED: "#f87171" 
};

const STATUS_TABS = ["ALL", "ON_HOLD", "TO_PREPARE", "SENT_TO_LAB", "QUALITY_CHECK", "READY", "DELIVERED"];

export default function WorkOrdersPage() {
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // Modals
  const [sendLabModal, setSendLabModal] = useState(null); 
  const [revisionModal, setRevisionModal] = useState(null); 
  const [warrantyModal, setWarrantyModal] = useState(null); 
  const [viewSale, setViewSale] = useState(null); 

  // Data
  const patients = useMemo(() => getPatients(), [tick]);
  const sales = useMemo(() => getAllSales(), [tick]);
  const workOrders = useMemo(() => getAllWorkOrders(), [tick]);
  const labs = useMemo(() => getLabs(), []);
  
  // 👈 NUEVO: Cargamos empleados
  const [employees, setEmployees] = useState([]);
  useEffect(() => { setEmployees(getEmployees()); }, [tick]);

  const patientMap = useMemo(() => patients.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}), [patients]);
  const salesMap = useMemo(() => sales.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}), [sales]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return workOrders.filter(w => (statusFilter === "ALL" || w.status === statusFilter) && (
      (patientMap[w.patientId]?.firstName + " " + w.labName + " " + w.type).toLowerCase().includes(q)
    )).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [workOrders, statusFilter, query, patientMap]);

  // MANEJO DE AVANCE DE ESTADO
  const handleAdvance = (order) => {
    const next = nextStatus(order.status);
    
    // 1. De TO_PREPARE -> SENT_TO_LAB: Pedir mensajero
    if (order.status === "TO_PREPARE") {
      setSendLabModal(order);
      return;
    }
    
    // 2. De SENT_TO_LAB -> QUALITY_CHECK: Pedir revisión
    if (order.status === "SENT_TO_LAB") {
      setRevisionModal(order);
      return;
    }

    // 3. Avance directo en otros casos
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

  const handlePrintOrder = (order) => {
     // Lógica de impresión existente...
     alert("Imprimiendo orden (simulación)..."); 
  };

  // --- MODAL 1: ENVIAR A LABORATORIO ---
  const SendLabModal = ({ order, salesMap, onClose }) => {
    const [labId, setLabId] = useState(order.labId || "");
    const [courier, setCourier] = useState("");
    const [cost, setCost] = useState(order.labCost || 0);
    
    // Obtenemos specs de la venta
    const sale = salesMap[order.saleId];
    const saleItem = sale?.items?.find(i => i.id === order.saleItemId);
    const specs = saleItem?.specs || {};

    const handleLabChange = (e) => {
        const newLabId = e.target.value;
        setLabId(newLabId);
        
        const selectedLab = labs.find(l => l.id === newLabId);
        if (selectedLab) {
            let totalCost = order.labCost || 0; // Costo mica
            if (specs.requiresBisel) {
                const biselService = selectedLab.services.find(s => s.name.toLowerCase().includes("bisel"));
                if (biselService) totalCost += Number(biselService.price);
            }
            if (specs.requiresTallado) {
                const talladoService = selectedLab.services.find(s => s.name.toLowerCase().includes("tallado"));
                if (talladoService) totalCost += Number(talladoService.price);
            }
            setCost(totalCost);
        }
    };

    return (
      <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
        <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 10, width: 400, border: "1px solid #60a5fa" }}>
          <h3 style={{ marginTop: 0, color: "#60a5fa" }}>Enviar a Laboratorio</h3>
          
          <div style={{marginBottom:15, fontSize:12, color:"#ddd", background:"#333", padding:8, borderRadius:4}}>
              <div style={{fontWeight:"bold", marginBottom:4, color:"#aaa"}}>SERVICIOS REQUERIDOS:</div>
              <div>{specs.requiresBisel ? "✅ Bisel/Montaje" : "⬜ Sin Bisel"}</div>
              <div>{specs.requiresTallado ? "✅ Tallado Digital" : "⬜ Sin Tallado"}</div>
          </div>

          <label style={{ display: "block", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "#aaa" }}>Laboratorio</span>
            <select value={labId} onChange={handleLabChange} style={{ width: "100%", padding: 8, background: "#222", color: "white", border: "1px solid #444", marginTop: 4 }}>
              <option value="">-- Seleccionar --</option>
              {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>

          {/* 👈 SELECTOR DE MENSAJERO */}
          <label style={{ display: "block", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "#aaa" }}>¿Qué mensajero envía?</span>
            <select value={courier} onChange={e => setCourier(e.target.value)} style={{ width: "100%", padding: 8, background: "#222", color: "white", border: "1px solid #444", marginTop: 4 }}>
                <option value="">-- Seleccionar --</option>
                {employees.map(e => <option key={e.id} value={e.name}>{e.name} ({ROLES[e.role] || e.role})</option>)}
                <option value="Servicio Externo (Uber/Paquetería)">Servicio Externo (Uber/Paquetería)</option>
            </select>
          </label>
          
          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: "#aaa" }}>Costo Total ($)</span>
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} style={{ width: "100%", padding: 8, background: "#222", color: "white", border: "1px solid #444", marginTop: 4 }} />
            <div style={{fontSize:10, color:"#666", marginTop:4}}>* Incluye Mica + Servicios detectados</div>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
             <button onClick={onClose} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
             <button onClick={() => { 
                 updateWorkOrder(order.id, { 
                     status: "SENT_TO_LAB", 
                     labId, 
                     labName: labs.find(l=>l.id===labId)?.name || "Externo", 
                     labCost: Number(cost),
                     courier 
                 }); 
                 setTick(t => t + 1); onClose(); 
             }} style={{ background: "#60a5fa", color: "black", padding: "8px 16px", border: "none", borderRadius: 4, fontWeight: "bold", cursor: "pointer" }}>Confirmar Envío</button>
          </div>
        </div>
      </div>
    );
  };

  // --- MODAL 2: REVISIÓN DE CALIDAD ---
  const RevisionModal = ({ order, onClose }) => {
      const [receivedBy, setReceivedBy] = useState("");
      const [jobMadeBy, setJobMadeBy] = useState("");
      const [talladoBy, setTalladoBy] = useState("");
      const [frameCondition, setFrameCondition] = useState("Llega en buen estado");
      const [finalCost, setFinalCost] = useState(order.labCost); 

      // Filtramos técnicos para los selectores de trabajo
      const techs = employees.filter(e => e.role === 'LAB' || e.role === 'DOCTOR' || e.role === 'SALES');

      const handleConfirm = () => {
          if(!receivedBy) return alert("Indica quién recibe el trabajo.");
          
          updateWorkOrder(order.id, {
              status: "READY", // Pasa a Listo
              receivedBy,
              jobMadeBy,
              talladoBy,
              frameCondition,
              labCost: Number(finalCost)
          });
          setTick(t => t + 1);
          onClose();
      };

      return (
        <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
            <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 10, width: 500, border: "1px solid #a78bfa" }}>
                <h3 style={{ marginTop: 0, color: "#a78bfa" }}>Recepción y Revisión de Calidad</h3>
                
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:15, marginBottom:15}}>
                    {/* 👈 SELECTOR QUIÉN RECIBE */}
                    <label>
                        <span style={{fontSize:11, color:"#aaa"}}>¿Quién recibe?</span>
                        <select value={receivedBy} onChange={e => setReceivedBy(e.target.value)} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}}>
                            <option value="">-- Seleccionar --</option>
                            {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                        </select>
                    </label>
                    <label>
                        <span style={{fontSize:11, color:"#aaa"}}>Costo Real Final ($)</span>
                        <input type="number" value={finalCost} onChange={e => setFinalCost(e.target.value)} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} />
                    </label>
                </div>

                <div style={{background:"#222", padding:10, borderRadius:6, marginBottom:15}}>
                    <div style={{fontSize:12, color:"#a78bfa", fontWeight:"bold", marginBottom:10}}>DETALLES DEL TRABAJO</div>
                    <div style={{display:"grid", gap:10}}>
                        {/* 👈 SELECTOR BISEL */}
                        <label>
                            <span style={{fontSize:11, color:"#aaa"}}>¿Quién elaboró el bisel?</span>
                            <select value={jobMadeBy} onChange={e => setJobMadeBy(e.target.value)} style={{width:"100%", padding:6, background:"#111", border:"1px solid #444", color:"white", borderRadius:4}}>
                                <option value="">-- Seleccionar / Externo --</option>
                                <option value="Laboratorio Externo">Laboratorio Externo</option>
                                {techs.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                            </select>
                        </label>

                        {/* 👈 SELECTOR TALLADO */}
                        <label>
                            <span style={{fontSize:11, color:"#aaa"}}>¿Quién realizó el tallado?</span>
                            <select value={talladoBy} onChange={e => setTalladoBy(e.target.value)} style={{width:"100%", padding:6, background:"#111", border:"1px solid #444", color:"white", borderRadius:4}}>
                                <option value="">-- Seleccionar / Externo --</option>
                                <option value="Laboratorio Externo">Laboratorio Externo</option>
                                {techs.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                            </select>
                        </label>
                    </div>
                </div>

                <label style={{display:"block", marginBottom:20}}>
                    <span style={{fontSize:11, color:"#aaa"}}>Estado del Armazón Recibido</span>
                    <textarea rows={2} value={frameCondition} onChange={e => setFrameCondition(e.target.value)} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} />
                </label>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button onClick={onClose} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
                    <button onClick={handleConfirm} style={{ background: "#a78bfa", color: "black", padding: "8px 16px", border: "none", borderRadius: 4, fontWeight: "bold", cursor: "pointer" }}>✅ Aprobar Calidad</button>
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
      
      {/* MODALES ACTIVOS */}
      {sendLabModal && <SendLabModal order={sendLabModal} salesMap={salesMap} onClose={() => setSendLabModal(null)} />}
      {revisionModal && <RevisionModal order={revisionModal} onClose={() => setRevisionModal(null)} />}
      {warrantyModal && <WarrantyModal order={warrantyModal} onClose={() => setWarrantyModal(null)} />}
      {viewSale && <SaleDetailModal sale={viewSale} patient={patientMap[viewSale.patientId]} onClose={() => setViewSale(null)} onUpdate={() => setTick(t => t + 1)} />}

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
          
          return (
            <div key={o.id} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: 16, display: "grid", gap: 12, position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 4, background: STATUS_COLORS[o.status] || "#555", borderRadius: "0 4px 4px 0" }}></div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", paddingLeft: 10 }}>
                 <div>
                    <div style={{ fontSize: "1.1em", fontWeight: "bold" }}>{patient ? `${patient.firstName} ${patient.lastName}` : "Paciente"}</div>
                    <div style={{ fontSize: "0.85em", color: "#888" }}>{item?.description || o.type}</div>
                    <div style={{ fontSize: "0.8em", color: STATUS_COLORS[o.status], marginTop:4, fontWeight:"bold" }}>{STATUS_LABELS[o.status]}</div>
                 </div>
                 <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handlePrintOrder(o)} style={{ background: "#333", border: "1px solid #555", color: "white", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: "0.9em" }}>🖨️</button>
                    {o.status !== "CANCELLED" && o.status !== "DELIVERED" && (
                      <>
                        {o.status !== "ON_HOLD" && o.status !== "TO_PREPARE" && <button onClick={() => handleStatusChange(o.id, o.status, 'prev')} style={{ background: "transparent", border: "1px solid #555", color: "#aaa", padding: "6px 10px", borderRadius: 4, cursor: "pointer" }}>⬅</button>}
                        <button onClick={() => handleStatusChange(o.id, o.status, 'next')} style={{ background: "#2563eb", border: "none", color: "white", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontWeight: "bold", fontSize: "0.9em" }}>
                            {o.status === "TO_PREPARE" ? "Enviar a Lab ➡" : o.status === "SENT_TO_LAB" ? "Recibir / Revisar ➡" : "Avanzar ➡"}
                        </button>
                      </>
                    )}
                    {o.status !== "CANCELLED" && <button onClick={() => setWarrantyModal(o)} style={{ background: "#450a0a", border: "1px solid #f87171", color: "#f87171", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: "0.8em" }}>⚠️ Garantía</button>}
                 </div>
              </div>

              <div style={{ paddingLeft: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                 <div>
                    <div style={{ fontSize: "0.85em", color: "#666", textTransform: "uppercase" }}>Taller</div>
                    <div style={{ marginTop: 4, display: "flex", gap: 10 }}>
                       <span style={{ fontSize: "0.85em", background: "#222", padding: "3px 6px", borderRadius: 4, color: "#aaa" }}>Lab: {o.labName || "Interno"}</span>
                       <span style={{ fontSize: "0.85em", color: profit >= 0 ? "#4ade80" : "#f87171" }}>Utilidad: ${profit.toLocaleString()}</span>
                    </div>
                    {/* INFO ADICIONAL SEGÚN ESTADO */}
                    {o.courier && <div style={{fontSize:"0.8em", color:"#aaa", marginTop:4}}>🚚 Enviado con: {o.courier}</div>}
                    {o.receivedBy && <div style={{fontSize:"0.8em", color:"#a78bfa", marginTop:4}}>✅ Recibido por: {o.receivedBy}</div>}

                    {sale && (
                      <div onClick={() => setViewSale(sale)} style={{ marginTop: 8, fontSize: "0.9em", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
                         <span style={{ color: sale.balance > 0 ? "#f87171" : "#4ade80", fontWeight: "bold" }}>{sale.balance > 0 ? `⚠️ Restan $${sale.balance.toLocaleString()}` : "✅ Pagado"}</span>
                         <span style={{ textDecoration: "underline", color: "#60a5fa", fontSize: "0.9em" }}>Ver Venta 👁️</span>
                      </div>
                    )}
                 </div>
                 <div>
                    <div style={{ fontSize: "0.85em", color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Graduación</div>
                    <RxDisplay rxNotes={o.rxNotes} />
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}