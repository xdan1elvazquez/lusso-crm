import { useMemo, useState, useEffect } from "react";
import { getPatients } from "@/services/patientsStorage";
import { getAllSales } from "@/services/salesStorage";
import { getAllWorkOrders, updateWorkOrder, nextStatus, prevStatus, applyWarranty, deleteWorkOrder } from "@/services/workOrdersStorage";
import { getLabs } from "@/services/labStorage"; 
import { getEmployees, ROLES } from "@/services/employeesStorage"; 
import SaleDetailModal from "@/components/SaleDetailModal"; 

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

  // Handlers
  const handleDelete = (id) => {
      if(confirm("¿Eliminar orden de trabajo? Esto no borra la venta asociada.")) {
          deleteWorkOrder(id);
          setTick(t => t + 1);
      }
  };

  const handleAdvance = (order) => {
    const next = nextStatus(order.status);
    
    // 1. De TO_PREPARE -> SENT_TO_LAB: Pedir mensajero
    if (order.status === "TO_PREPARE") {
      setSendLabModal(order);
      return;
    }
    
    // 2. De SENT_TO_LAB -> QUALITY_CHECK: Pedir revisión (Lab y Costos)
    if (order.status === "SENT_TO_LAB") {
      setRevisionModal(order);
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

  const handlePrintOrder = (order) => { alert("Imprimiendo orden..."); };

  // --- MODAL 1: ENVIAR (Solo Logística) ---
  const SendLabModal = ({ order, onClose }) => {
    const [courier, setCourier] = useState("");
    return (
      <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
        <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 10, width: 400, border: "1px solid #60a5fa" }}>
          <h3 style={{ marginTop: 0, color: "#60a5fa" }}>Enviar a Laboratorio</h3>
          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: "#aaa" }}>¿Qué mensajero envía?</span>
            <select value={courier} onChange={e => setCourier(e.target.value)} style={{ width: "100%", padding: 8, background: "#222", color: "white", border: "1px solid #444", marginTop: 4 }}>
                <option value="">-- Seleccionar --</option>
                {employees.map(e => <option key={e.id} value={e.name}>{e.name} ({ROLES[e.role] || e.role})</option>)}
                <option value="Servicio Externo (Uber/Paquetería)">Servicio Externo (Uber/Paquetería)</option>
            </select>
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
             <button onClick={onClose} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
             <button onClick={() => { updateWorkOrder(order.id, { status: "SENT_TO_LAB", courier }); setTick(t => t + 1); onClose(); }} style={{ background: "#60a5fa", color: "black", padding: "8px 16px", border: "none", borderRadius: 4, fontWeight: "bold", cursor: "pointer" }}>Confirmar Envío</button>
          </div>
        </div>
      </div>
    );
  };

  // --- MODAL 2: REVISIÓN Y CÁLCULO AUTOMÁTICO DE COSTOS ---
  const RevisionModal = ({ order, salesMap, onClose }) => {
      const [receivedBy, setReceivedBy] = useState("");
      
      // Costos Desglosados
      const [baseMicaCost, setBaseMicaCost] = useState(order.labCost || 0);
      const [biselCost, setBiselCost] = useState(0);
      const [talladoCost, setTalladoCost] = useState(0);
      
      // Laboratorios Responsables
      const [jobMadeBy, setJobMadeBy] = useState(""); // ID Lab Bisel
      const [talladoBy, setTalladoBy] = useState(""); // ID Lab Tallado
      
      const [frameCondition, setFrameCondition] = useState("Llega en buen estado");

      const sale = salesMap[order.saleId];
      const saleItem = sale?.items?.find(i => i.id === order.saleItemId);
      const specs = saleItem?.specs || {};

      // Lógica de Costo Automático: Buscar servicio BISEL en el lab seleccionado
      const handleBiselLabChange = (e) => {
          const id = e.target.value;
          setJobMadeBy(id);
          if (id === "INTERNAL" || !id) { setBiselCost(0); return; }
          const lab = labs.find(l => l.id === id);
          const service = lab?.services.find(s => s.type === "BISEL");
          setBiselCost(service ? Number(service.price) : 0);
      };

      // Lógica de Costo Automático: Buscar servicio TALLADO en el lab seleccionado
      const handleTalladoLabChange = (e) => {
          const id = e.target.value;
          setTalladoBy(id);
          if (id === "INTERNAL" || !id) { setTalladoCost(0); return; }
          const lab = labs.find(l => l.id === id);
          const service = lab?.services.find(s => s.type === "TALLADO");
          setTalladoCost(service ? Number(service.price) : 0);
      };

      // Suma final dinámica
      const finalTotal = Number(baseMicaCost) + Number(biselCost) + Number(talladoCost);

      const handleConfirm = () => {
          if(!receivedBy) return alert("Indica quién recibe.");
          
          // Definimos nombres legibles para guardar en historial
          const biselLabName = labs.find(l => l.id === jobMadeBy)?.name || (jobMadeBy === "INTERNAL" ? "Taller Interno" : "");
          const talladoLabName = labs.find(l => l.id === talladoBy)?.name || (talladoBy === "INTERNAL" ? "Taller Interno" : "");
          
          // "Main Lab" para la tarjeta principal será el de Tallado (o Bisel si no hay tallado)
          const mainLabId = talladoBy !== "INTERNAL" ? talladoBy : jobMadeBy !== "INTERNAL" ? jobMadeBy : "";
          const mainLabName = labs.find(l => l.id === mainLabId)?.name || "Taller Interno";

          updateWorkOrder(order.id, {
              status: "READY", 
              receivedBy,
              labId: mainLabId,
              labName: mainLabName,
              labCost: finalTotal, // Guardamos el total sumado
              jobMadeBy: biselLabName, // Guardamos nombres de responsables
              talladoBy: talladoLabName,
              frameCondition
          });
          setTick(t => t + 1);
          onClose();
      };

      return (
        <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
            <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 10, width: 600, border: "1px solid #a78bfa" }}>
                <h3 style={{ marginTop: 0, color: "#a78bfa" }}>Recepción y Cálculo de Costos</h3>
                
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20}}>
                    
                    {/* COLUMNA IZQUIERDA: RESPONSABLES Y COSTOS */}
                    <div style={{display:"grid", gap:15}}>
                        <div>
                            <div style={{fontSize:11, color:"#aaa", marginBottom:5}}>COSTO BASE MICA (Editable)</div>
                            <input type="number" value={baseMicaCost} onChange={e => setBaseMicaCost(e.target.value)} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} />
                        </div>

                        {specs.requiresBisel && (
                            <div>
                                <div style={{fontSize:11, color:"#aaa", marginBottom:5}}>¿QUIÉN BISELÓ? (Servicio: Bisel)</div>
                                <select value={jobMadeBy} onChange={handleBiselLabChange} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}}>
                                    <option value="">-- Seleccionar --</option>
                                    <option value="INTERNAL">Taller Interno ($0)</option>
                                    {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                                <div style={{fontSize:10, color:"#f87171", marginTop:2}}>Costo Bisel: ${biselCost}</div>
                            </div>
                        )}

                        {specs.requiresTallado && (
                            <div>
                                <div style={{fontSize:11, color:"#aaa", marginBottom:5}}>¿QUIÉN TALLÓ? (Servicio: Tallado)</div>
                                <select value={talladoBy} onChange={handleTalladoLabChange} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}}>
                                    <option value="">-- Seleccionar --</option>
                                    <option value="INTERNAL">Taller Interno ($0)</option>
                                    {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                                <div style={{fontSize:10, color:"#f87171", marginTop:2}}>Costo Tallado: ${talladoCost}</div>
                            </div>
                        )}
                    </div>

                    {/* COLUMNA DERECHA: LOGÍSTICA Y TOTAL */}
                    <div style={{display:"grid", gap:15, alignContent:"start"}}>
                        <div>
                            <div style={{fontSize:11, color:"#aaa", marginBottom:5}}>¿QUIÉN RECIBE EN ÓPTICA?</div>
                            <select value={receivedBy} onChange={e => setReceivedBy(e.target.value)} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}}>
                                <option value="">-- Seleccionar Empleado --</option>
                                {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <div style={{fontSize:11, color:"#aaa", marginBottom:5}}>ESTADO DEL ARMAZÓN</div>
                            <textarea rows={2} value={frameCondition} onChange={e => setFrameCondition(e.target.value)} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} />
                        </div>

                        <div style={{background:"#333", padding:15, borderRadius:8, marginTop:10, textAlign:"center"}}>
                            <div style={{fontSize:12, color:"#aaa"}}>COSTO TOTAL REAL</div>
                            <div style={{fontSize:24, fontWeight:"bold", color:"#f87171"}}>${finalTotal.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop:"1px solid #333", paddingTop:15 }}>
                    <button onClick={onClose} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
                    <button onClick={handleConfirm} style={{ background: "#a78bfa", color: "black", padding: "10px 25px", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}>✅ Aprobar Calidad</button>
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
      {revisionModal && <RevisionModal order={revisionModal} salesMap={salesMap} onClose={() => setRevisionModal(null)} />}
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
                    <button onClick={() => handleDelete(o.id)} style={{background:"none", border:"1px solid #333", color:"#666", cursor:"pointer", padding:"6px", borderRadius:4}}>🗑️</button>
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
                    <div style={{ fontSize: "0.85em", color: "#666", textTransform: "uppercase" }}>Graduación</div>
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