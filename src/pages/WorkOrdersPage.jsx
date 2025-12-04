import { useMemo, useState, useEffect } from "react";
import { getAllWorkOrders, updateWorkOrder, nextStatus, prevStatus, applyWarranty, deleteWorkOrder } from "@/services/workOrdersStorage";
import { getPatients } from "@/services/patientsStorage"; 
import { getAllSales } from "@/services/salesStorage"; 
import { getLabs } from "@/services/labStorage"; 
import { getEmployees } from "@/services/employeesStorage"; 
import { createExpense } from "@/services/expensesStorage";
import LoadingState from "@/components/LoadingState";
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
  ON_HOLD: "#fca5a5", TO_PREPARE: "#facc15", SENT_TO_LAB: "#60a5fa", 
  QUALITY_CHECK: "#a78bfa", READY: "#4ade80", DELIVERED: "#9ca3af", CANCELLED: "#f87171" 
};

const STATUS_TABS = ["ALL", "ON_HOLD", "TO_PREPARE", "SENT_TO_LAB", "QUALITY_CHECK", "READY", "DELIVERED"];

export default function WorkOrdersPage() {
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

  // Función unificada para cargar datos
  const refreshData = async () => {
      setLoading(true);
      try {
          // ✅ CORRECCIÓN: getAllSales() ahora está DENTRO del Promise.all
          const [woData, patData, empData, labData, salesData] = await Promise.all([
              getAllWorkOrders(),
              getPatients(),
              getEmployees(),
              getLabs(),
              getAllSales() // 👈 Esto faltaba esperar
          ]);

          setWorkOrders(woData);
          setPatients(patData);
          setEmployees(empData);
          setLabs(labData);
          setSales(salesData); // Ahora salesData es un array real
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => { refreshData(); }, []);

  // Mapas para búsqueda rápida
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
      if(confirm("¿Eliminar orden?")) {
          await deleteWorkOrder(id);
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
          </div>
          {rx.notes && <div style={{marginTop:5, fontStyle:"italic", opacity:0.7, borderTop:"1px solid #444", paddingTop:4}}>"{rx.notes}"</div>}
        </div>
      );
    } catch(e) { return <div>{rxNotes}</div>; }
  };

  const SendLabModal = ({ order, onClose }) => {
    const [courier, setCourier] = useState("");
    return (
      <div style={modalOverlay}>
        <div style={modalContent}>
          <h3 style={{ marginTop: 0, color: "#60a5fa" }}>Enviar a Laboratorio</h3>
          <select value={courier} onChange={e => setCourier(e.target.value)} style={selectStyle}>
              <option value="">-- Mensajero --</option>
              {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
              <option value="Externo">Servicio Externo</option>
          </select>
          <div style={actionsStyle}>
             <button onClick={onClose} style={cancelBtn}>Cancelar</button>
             <button onClick={async () => { await updateWorkOrder(order.id, { status: "SENT_TO_LAB", courier }); refreshData(); onClose(); }} style={confirmBtn}>Confirmar</button>
          </div>
        </div>
      </div>
    );
  };

  const RevisionModal = ({ order, salesMap, onClose }) => {
      const [receivedBy, setReceivedBy] = useState("");
      const [baseMicaCost, setBaseMicaCost] = useState(order.labCost || 0);
      const [biselCost, setBiselCost] = useState(0);
      const [talladoCost, setTalladoCost] = useState(0);
      const [jobMadeBy, setJobMadeBy] = useState(""); 
      const [talladoBy, setTalladoBy] = useState(""); 
      const [frameCondition, setFrameCondition] = useState("Llega en buen estado");

      const sale = salesMap[order.saleId];
      const saleItem = sale?.items?.find(i => i.id === order.saleItemId);
      const specs = saleItem?.specs || {};

      const handleBiselLabChange = (e) => {
          const id = e.target.value;
          setJobMadeBy(id);
          if (id === "INTERNAL" || !id) { setBiselCost(0); return; }
          const lab = labs.find(l => l.id === id);
          const service = lab?.services.find(s => s.type === "BISEL");
          setBiselCost(service ? Number(service.price) : 0);
      };

      const handleTalladoLabChange = (e) => {
          const id = e.target.value;
          setTalladoBy(id);
          if (id === "INTERNAL" || !id) { setTalladoCost(0); return; }
          const lab = labs.find(l => l.id === id);
          const service = lab?.services.find(s => s.type === "TALLADO");
          setTalladoCost(service ? Number(service.price) : 0);
      };

      const finalTotal = Number(baseMicaCost) + Number(biselCost) + Number(talladoCost);

      const handleConfirm = async () => {
          if(!receivedBy) return alert("Indica quién recibe.");
          const biselLabName = labs.find(l => l.id === jobMadeBy)?.name || (jobMadeBy === "INTERNAL" ? "Taller Interno" : "");
          const talladoLabName = labs.find(l => l.id === talladoBy)?.name || (talladoBy === "INTERNAL" ? "Taller Interno" : "");
          const mainLabId = talladoBy !== "INTERNAL" ? talladoBy : jobMadeBy !== "INTERNAL" ? jobMadeBy : "";
          const mainLabName = labs.find(l => l.id === mainLabId)?.name || "Taller Interno";

          await updateWorkOrder(order.id, {
              status: "READY", 
              receivedBy,
              labId: mainLabId,
              labName: mainLabName,
              labCost: finalTotal,
              jobMadeBy: biselLabName,
              talladoBy: talladoLabName,
              frameCondition
          });
          refreshData();
          onClose();
      };

      return (
        <div style={modalOverlay}>
            <div style={{...modalContent, width: 600, border: "1px solid #a78bfa"}}>
                <h3 style={{ marginTop: 0, color: "#a78bfa" }}>Recepción y Cálculo</h3>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
                    <div>
                        <label style={{display:"block", marginBottom:10}}>
                            <span style={{fontSize:11, color:"#aaa"}}>Costo Base</span>
                            <input type="number" value={baseMicaCost} onChange={e => setBaseMicaCost(e.target.value)} style={inputStyle} />
                        </label>
                        {specs.requiresBisel && (
                            <label style={{display:"block", marginBottom:10}}>
                                <span style={{fontSize:11, color:"#aaa"}}>Biseló</span>
                                <select value={jobMadeBy} onChange={handleBiselLabChange} style={inputStyle}>
                                    <option value="">-- Seleccionar --</option>
                                    <option value="INTERNAL">Taller Interno</option>
                                    {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </label>
                        )}
                    </div>
                    <div>
                        <label style={{display:"block", marginBottom:10}}>
                            <span style={{fontSize:11, color:"#aaa"}}>Recibió</span>
                            <select value={receivedBy} onChange={e => setReceivedBy(e.target.value)} style={inputStyle}>
                                <option value="">-- Seleccionar --</option>
                                {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                            </select>
                        </label>
                        <div style={{fontSize:20, fontWeight:"bold", color:"#f87171", textAlign:"right", marginTop:20}}>
                            Total: ${finalTotal.toLocaleString()}
                        </div>
                    </div>
                </div>
                <div style={actionsStyle}>
                    <button onClick={onClose} style={cancelBtn}>Cancelar</button>
                    <button onClick={handleConfirm} style={confirmBtn}>Guardar</button>
                </div>
            </div>
        </div>
      );
  };

  const WarrantyModal = ({ order, onClose }) => {
    const [reason, setReason] = useState("");
    const [extraCost, setExtraCost] = useState("");
    return (
      <div style={modalOverlay}>
        <div style={{...modalContent, border: "1px solid #f87171"}}>
          <h3 style={{ marginTop: 0, color: "#f87171" }}>Reportar Garantía</h3>
          <textarea placeholder="Razón..." value={reason} onChange={e => setReason(e.target.value)} rows={3} style={{...inputStyle, height:"auto"}} />
          <input type="number" value={extraCost} onChange={e => setExtraCost(e.target.value)} placeholder="Costo Extra ($)" style={{...inputStyle, marginTop:10}} />
          <div style={actionsStyle}>
             <button onClick={onClose} style={cancelBtn}>Cancelar</button>
             <button onClick={async () => { if(!reason) return alert("Escribe razón"); await applyWarranty(order.id, reason, extraCost); refreshData(); onClose(); }} style={{...confirmBtn, background:"#f87171"}}>Aplicar</button>
          </div>
        </div>
      </div>
    );
  };

  const PayLabModal = ({ order, onClose }) => {
      const [method, setMethod] = useState("EFECTIVO");
      const handlePay = async () => {
          if (!order.labCost || order.labCost <= 0) return alert("No hay costo.");
          await createExpense({
              description: `Pago Lab: ${order.labName} (P: ${patientMap[order.patientId]?.lastName})`,
              amount: order.labCost,
              category: "COSTO_VENTA",
              method: method,
              date: new Date().toISOString()
          });
          await updateWorkOrder(order.id, { isPaid: true });
          refreshData();
          onClose();
      };
      return (
        <div style={modalOverlay}>
            <div style={{...modalContent, width:350, border: "1px solid #4ade80"}}>
                <h3 style={{ marginTop: 0, color: "#4ade80" }}>Pagar a Proveedor</h3>
                <p>Monto: <strong>${order.labCost?.toLocaleString()}</strong></p>
                <select value={method} onChange={e => setMethod(e.target.value)} style={inputStyle}>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                </select>
                <div style={actionsStyle}>
                    <button onClick={onClose} style={cancelBtn}>Cancelar</button>
                    <button onClick={handlePay} style={{...confirmBtn, background:"#4ade80", color:"black"}}>Pagar</button>
                </div>
            </div>
        </div>
      );
  };

  const modalOverlay = {position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100};
  const modalContent = {background:"#1a1a1a", padding:20, borderRadius:10, width:400, border:"1px solid #60a5fa"};
  const inputStyle = {width:"100%", padding:8, background:"#222", color:"white", border:"1px solid #444", borderRadius:4};
  const selectStyle = {width:"100%", padding:8, background:"#222", color:"white", border:"1px solid #444", marginTop:10, marginBottom:20};
  const actionsStyle = {display:"flex", justifyContent:"flex-end", gap:10, marginTop:20};
  const cancelBtn = {background:"transparent", color:"#aaa", border:"none", cursor:"pointer"};
  const confirmBtn = {background:"#60a5fa", color:"black", padding:"8px 16px", border:"none", borderRadius:4, fontWeight:"bold", cursor:"pointer"};

  if (loading && workOrders.length === 0) return <LoadingState />;

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>Work Orders (Nube)</h1>
        <button onClick={refreshData} style={{ background: "#333", color: "white", border: "1px solid #555", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Actualizar</button>
      </div>
      
      {sendLabModal && <SendLabModal order={sendLabModal} onClose={() => setSendLabModal(null)} />}
      {revisionModal && <RevisionModal order={revisionModal} salesMap={salesMap} onClose={() => setRevisionModal(null)} />}
      {warrantyModal && <WarrantyModal order={warrantyModal} onClose={() => setWarrantyModal(null)} />}
      {payLabModal && <PayLabModal order={payLabModal} onClose={() => setPayLabModal(null)} />}
      {viewSale && <SaleDetailModal sale={viewSale} patient={patientMap[viewSale.patientId]} onClose={() => setViewSale(null)} onUpdate={refreshData} />}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {STATUS_TABS.map((tab) => <button key={tab} onClick={() => setStatusFilter(tab)} style={{ padding: "6px 12px", borderRadius: 20, border: statusFilter === tab ? `1px solid ${STATUS_COLORS[tab]}` : "1px solid #333", background: statusFilter === tab ? "rgba(255,255,255,0.1)" : "transparent", color: statusFilter === tab ? "white" : "#888", cursor: "pointer", fontSize: "0.9em" }}>{STATUS_LABELS[tab] || "Todos"}</button>)}
      </div>
      
      <div style={{ display: "grid", gap: 15 }}>
        {filtered.map((o) => {
          const patient = patientMap[o.patientId];
          const sale = salesMap[o.saleId];
          const item = sale?.items?.find(it => it.id === o.saleItemId);
          
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
                    {o.status !== "CANCELLED" && o.status !== "DELIVERED" && (
                      <>
                        {o.status !== "ON_HOLD" && o.status !== "TO_PREPARE" && <button onClick={() => handleStatusChange(o.id, o.status, 'prev')} style={{ background: "transparent", border: "1px solid #555", color: "#aaa", padding: "6px 10px", borderRadius: 4, cursor: "pointer" }}>⬅</button>}
                        <button onClick={() => handleStatusChange(o.id, o.status, 'next')} style={{ background: "#2563eb", border: "none", color: "white", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontWeight: "bold", fontSize: "0.9em" }}>Avanzar ➡</button>
                      </>
                    )}
                    <button onClick={() => handleDelete(o.id)} style={{background:"none", border:"1px solid #333", color:"#666", cursor:"pointer", padding:"6px", borderRadius:4}}>🗑️</button>
                 </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, paddingLeft: 10, marginTop: 10, fontSize: "0.9em", color: "#ccc" }}>
                  <div>
                      <div style={{color:"#666", fontSize:11, textTransform:"uppercase"}}>Laboratorio</div>
                      <div>{o.labName || "No asignado"}</div>
                  </div>
                  <div>
                      <div style={{color:"#666", fontSize:11, textTransform:"uppercase"}}>Rx / Notas</div>
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