import React, { useState, useMemo } from "react";
import { updateSaleLogistics } from "@/services/salesStorage";
import { getAllWorkOrders } from "@/services/workOrdersStorage"; // 👈 Conectamos con W.O.

const STATUS_LABELS = { 
  ON_HOLD: "En Espera", TO_PREPARE: "Por Preparar", SENT_TO_LAB: "En Laboratorio", 
  QUALITY_CHECK: "Revisión Calidad", READY: "Listo entrega", DELIVERED: "Entregado", 
  CANCELLED: "Cancelado", WARRANTY: "Garantía" 
};

const STATUS_COLORS = { 
  ON_HOLD: "#fca5a5", TO_PREPARE: "#facc15", SENT_TO_LAB: "#60a5fa", 
  QUALITY_CHECK: "#a78bfa", READY: "#4ade80", DELIVERED: "#9ca3af", 
  CANCELLED: "#f87171", WARRANTY: "#ef4444"
};

export default function SaleDetailModal({ sale, patient, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState("GENERAL"); // GENERAL, LAB, PAYMENTS
  const [soldBy, setSoldBy] = useState(sale.soldBy || "");

  // 1. Buscamos las órdenes de trabajo vinculadas a esta venta en tiempo real
  const relatedWorkOrders = useMemo(() => {
      const allWos = getAllWorkOrders();
      return allWos.filter(w => w.saleId === sale.id);
  }, [sale.id]);

  const handleSave = () => {
      updateSaleLogistics(sale.id, { soldBy });
      alert("Vendedor actualizado");
      if (onUpdate) onUpdate();
  };

  const RxDisplay = ({ rx }) => {
      if (!rx) return <span style={{color:"#666", fontSize:"0.8em"}}>Sin graduación</span>;
      return (
          <div style={{fontSize:"0.85em", background:"#222", padding:8, borderRadius:4, marginTop:5, border:"1px solid #444"}}>
              <div style={{display:"grid", gridTemplateColumns:"25px 1fr", gap:5}}>
                  <strong style={{color:"#60a5fa"}}>OD</strong>
                  <span>{rx.od?.sph} / {rx.od?.cyl} x {rx.od?.axis}° {rx.od?.add ? `Add ${rx.od.add}` : ""}</span>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"25px 1fr", gap:5}}>
                  <strong style={{color:"#60a5fa"}}>OS</strong>
                  <span>{rx.os?.sph} / {rx.os?.cyl} x {rx.os?.axis}° {rx.os?.add ? `Add ${rx.os.add}` : ""}</span>
              </div>
          </div>
      );
  };

  const TabBtn = ({ id, label }) => (
      <button onClick={() => setActiveTab(id)} style={{ flex: 1, padding: 12, background: activeTab===id ? "#2563eb" : "#333", color: "white", border: "none", borderBottom: activeTab===id ? "2px solid white" : "2px solid transparent", cursor: "pointer", fontWeight: "bold", fontSize:"0.9em" }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
        <div style={{ background: "#1a1a1a", width: "90%", maxWidth: 800, maxHeight: "90vh", borderRadius: 12, border: "1px solid #444", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
            {/* HEADER */}
            <div style={{ padding: 20, borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111" }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: "1.3em", color: "#e5e7eb" }}>Detalle de Venta #{sale.id.slice(0,6).toUpperCase()}</h2>
                    <div style={{ color: "#888", fontSize: "0.9em" }}>{new Date(sale.createdAt).toLocaleString()}</div>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", borderBottom: "1px solid #333" }}>
                <TabBtn id="GENERAL" label="1. General y Productos" />
                <TabBtn id="LAB" label="2. Taller y Logística" />
                <TabBtn id="PAYMENTS" label="3. Abonos" />
            </div>

            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
                
                {/* TAB 1: GENERAL */}
                {activeTab === "GENERAL" && (
                    <div style={{ display: "grid", gap: 20 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15, background: "#222", padding: 15, borderRadius: 8 }}>
                             <div><div style={labelStyle}>Paciente</div><div style={valStyle}>{patient?.firstName} {patient?.lastName}</div></div>
                             <div><div style={labelStyle}>Teléfono</div><div style={valStyle}>{patient?.phone}</div></div>
                             <div><div style={labelStyle}>No. Caja</div><div style={{...valStyle, color:"#fbbf24", fontSize:"1.2em"}}>{sale.boxNumber || "-"}</div></div>
                             <div>
                                 <div style={labelStyle}>Vendedor</div>
                                 <div style={{display:"flex", gap:5}}>
                                    <input value={soldBy} onChange={e => setSoldBy(e.target.value)} style={{...inputStyle, padding:4, width:"100%"}} placeholder="Nombre..." />
                                    <button onClick={handleSave} style={{background:"#2563eb", border:"none", borderRadius:4, color:"white", cursor:"pointer"}}>💾</button>
                                 </div>
                             </div>
                        </div>

                        <h4 style={{ margin: "0", color: "#4ade80", borderBottom: "1px solid #4ade80", paddingBottom: 5 }}>Productos</h4>
                        {sale.items.map((item, i) => (
                            <div key={i} style={{ border: "1px solid #444", borderRadius: 8, padding: 15, marginBottom: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                                    <strong style={{ fontSize: "1.1em", color:"white" }}>{item.description}</strong>
                                    <span style={{ color: "#4ade80", fontWeight: "bold" }}>${item.unitPrice.toLocaleString()}</span>
                                </div>
                                
                                {item.kind === "LENSES" || item.kind === "CONTACT_LENS" ? (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, fontSize: "0.9em" }}>
                                        <div>
                                            <div style={{color:"#aaa", marginBottom:4, fontSize:"0.9em", fontWeight:"bold"}}>ESPECIFICACIONES</div>
                                            <ul style={{ margin: "0", paddingLeft: 15, color: "#ccc", lineHeight:"1.6" }}>
                                                {item.specs?.design && <li><strong>Diseño:</strong> {item.specs.design}</li>}
                                                {item.specs?.material && <li><strong>Material:</strong> {item.specs.material}</li>}
                                                {item.specs?.treatment && <li><strong>Tratamiento:</strong> {item.specs.treatment}</li>}
                                                {item.specs?.frameModel && <li><strong>Armazón:</strong> {item.specs.frameModel} <span style={{fontSize:"0.8em", background:"#333", padding:"1px 4px", borderRadius:3}}>{item.specs.frameStatus}</span></li>}
                                            </ul>
                                            {item.specs?.notes && <div style={{color:"#fca5a5", fontStyle:"italic", marginTop:5}}>Nota: {item.specs.notes}</div>}
                                        </div>
                                        <div>
                                            <div style={{color:"#aaa", marginBottom:4, fontSize:"0.9em", fontWeight:"bold"}}>GRADUACIÓN</div>
                                            <RxDisplay rx={item.rxSnapshot} />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ color: "#888", fontSize: "0.9em" }}>Categoría: {item.kind}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB 2: TALLER Y LOGÍSTICA (VISTA DE WORK ORDERS) */}
                {activeTab === "LAB" && (
                    <div style={{ display: "grid", gap: 15 }}>
                        <h4 style={{ margin: "0", color: "#60a5fa", borderBottom: "1px solid #60a5fa", paddingBottom: 5 }}>Rastreo de Trabajos (Work Orders)</h4>
                        
                        {relatedWorkOrders.length === 0 ? (
                            <p style={{opacity:0.5, fontStyle:"italic"}}>No hay órdenes de laboratorio generadas para esta venta.</p>
                        ) : (
                            relatedWorkOrders.map(wo => (
                                <div key={wo.id} style={{background:"#222", padding:15, borderRadius:8, borderLeft: `4px solid ${STATUS_COLORS[wo.status]}`}}>
                                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:10}}>
                                        <div>
                                            <div style={{fontWeight:"bold", color:"white"}}>{wo.type} - {wo.labName}</div>
                                            <div style={{fontSize:"0.8em", color:"#aaa"}}>ID: {wo.id.slice(0,8)}</div>
                                        </div>
                                        <div style={{textAlign:"right"}}>
                                            <div style={{fontWeight:"bold", color:STATUS_COLORS[wo.status]}}>{STATUS_LABELS[wo.status]}</div>
                                            <div style={{fontSize:"0.8em", color:"#aaa"}}>{new Date(wo.updatedAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>

                                    {/* GRID DE DATOS DE RASTREO (LEÍDOS DEL EMPLEADO SELECCIONADO) */}
                                    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, fontSize:"0.9em", background:"#1a1a1a", padding:10, borderRadius:6}}>
                                        <div>
                                            <div style={{fontSize:10, color:"#666", textTransform:"uppercase"}}>Mensajería / Envío</div>
                                            <div style={{color: wo.courier ? "white" : "#444"}}>{wo.courier || "—"}</div>
                                        </div>
                                        <div>
                                            <div style={{fontSize:10, color:"#666", textTransform:"uppercase"}}>Recibido Por</div>
                                            <div style={{color: wo.receivedBy ? "#a78bfa" : "#444"}}>{wo.receivedBy || "—"}</div>
                                        </div>
                                        <div>
                                            <div style={{fontSize:10, color:"#666", textTransform:"uppercase"}}>Bisel / Montaje</div>
                                            <div style={{color: wo.jobMadeBy ? "white" : "#444"}}>{wo.jobMadeBy || "—"}</div>
                                        </div>
                                        <div>
                                            <div style={{fontSize:10, color:"#666", textTransform:"uppercase"}}>Tallado</div>
                                            <div style={{color: wo.talladoBy ? "white" : "#444"}}>{wo.talladoBy || "—"}</div>
                                        </div>
                                    </div>

                                    {wo.frameCondition && (
                                        <div style={{marginTop:10, fontSize:"0.9em"}}>
                                            <div style={{fontSize:10, color:"#666", textTransform:"uppercase"}}>Estado del Armazón</div>
                                            <div style={{fontStyle:"italic", color:"#ccc"}}>"{wo.frameCondition}"</div>
                                        </div>
                                    )}
                                    
                                    {/* VISUALIZAR COSTO REAL (Solo informativo) */}
                                    {wo.labCost > 0 && (
                                        <div style={{marginTop:10, textAlign:"right", fontSize:"0.85em", color:"#666"}}>
                                            Costo Real Lab: ${wo.labCost.toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        
                        <div style={{fontSize:"0.8em", color:"#666", marginTop:10, textAlign:"center"}}>
                            * Para actualizar estos estados, ve a la sección "Órdenes de Trabajo".
                        </div>
                    </div>
                )}

                {/* TAB 3: PAGOS */}
                {activeTab === "PAYMENTS" && (
                    <div>
                        <h4 style={{ margin: "0 0 15px 0", color: "#c084fc", borderBottom: "1px solid #c084fc", paddingBottom: 5 }}>Estado de Cuenta</h4>
                        <div style={{ marginBottom: 20, background: "#222", padding: 15, borderRadius: 8, textAlign: "center", display:"flex", justifyContent:"space-around" }}>
                             <div><div style={labelStyle}>TOTAL</div><div style={{fontSize:"1.4em", fontWeight:"bold", color:"white"}}>${sale.total.toLocaleString()}</div></div>
                             <div><div style={labelStyle}>PAGADO</div><div style={{fontSize:"1.4em", fontWeight:"bold", color:"#4ade80"}}>${sale.paidAmount.toLocaleString()}</div></div>
                             <div><div style={labelStyle}>RESTA</div><div style={{fontSize:"1.4em", fontWeight:"bold", color:"#f87171"}}>${sale.balance.toLocaleString()}</div></div>
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
                            <thead><tr style={{ background: "#333", color: "#aaa" }}><th style={{ padding: 8, textAlign: "left" }}>Fecha</th><th style={{ padding: 8, textAlign: "left" }}>Método</th><th style={{ padding: 8, textAlign: "right" }}>Monto</th></tr></thead>
                            <tbody>
                                {sale.payments.map((p, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #333" }}>
                                        <td style={{ padding: 8 }}>{new Date(p.paidAt).toLocaleDateString()}</td>
                                        <td style={{ padding: 8 }}>{p.method} {p.terminal && <span style={{fontSize:"0.8em", color:"#888"}}>({p.terminal} {p.installments>1?`${p.installments} MSI`:""})</span>}</td>
                                        <td style={{ padding: 8, textAlign: "right", color: "#4ade80", fontWeight: "bold" }}>${p.amount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}

const labelStyle = { fontSize: 11, color: "#888", textTransform: "uppercase", marginBottom: 2 };
const valStyle = { fontSize: 14, fontWeight: "bold", color: "white" };
const inputStyle = { width: "100%", padding: 8, background: "#111", border: "1px solid #444", color: "white", borderRadius: 4 };