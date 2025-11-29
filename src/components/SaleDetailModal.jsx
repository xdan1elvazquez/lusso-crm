import React, { useState } from "react";
import { updateSaleLogistics } from "@/services/salesStorage";

export default function SaleDetailModal({ sale, patient, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState("GENERAL"); // GENERAL, LAB, PAYMENTS
  
  // Estados locales editables
  const [soldBy, setSoldBy] = useState(sale.soldBy || "");
  const [labDetails, setLabDetails] = useState(sale.labDetails || {});

  const handleSave = () => {
      updateSaleLogistics(sale.id, { 
          soldBy, 
          labDetails 
      });
      alert("Información actualizada");
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
                        {/* RESUMEN CABECERA */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15, background: "#222", padding: 15, borderRadius: 8 }}>
                             <div><div style={labelStyle}>Paciente</div><div style={valStyle}>{patient?.firstName} {patient?.lastName}</div></div>
                             <div><div style={labelStyle}>Teléfono</div><div style={valStyle}>{patient?.phone}</div></div>
                             <div><div style={labelStyle}>No. Caja</div><div style={{...valStyle, color:"#fbbf24", fontSize:"1.2em"}}>{sale.boxNumber || "-"}</div></div>
                             <div>
                                 <div style={labelStyle}>Vendedor</div>
                                 {/* Vendedor Editable Aquí */}
                                 <input value={soldBy} onChange={e => setSoldBy(e.target.value)} style={{...inputStyle, padding:4, width:"100%"}} placeholder="Nombre..." />
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
                                        {/* DETALLES TÉCNICOS */}
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
                                        {/* GRADUACIÓN */}
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

                        <button onClick={handleSave} style={{ marginTop: 10, background: "#333", color: "white", padding: "10px", border: "1px solid #555", borderRadius: 6, cursor: "pointer" }}>Guardar Cambios (Vendedor)</button>
                    </div>
                )}

                {/* TAB 2: TALLER Y LOGÍSTICA */}
                {activeTab === "LAB" && (
                    <div style={{ display: "grid", gap: 15 }}>
                        <h4 style={{ margin: "0", color: "#60a5fa", borderBottom: "1px solid #60a5fa", paddingBottom: 5 }}>Seguimiento de Taller</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                            <label><span style={labelStyle}>¿Quién elaboró/biseló?</span><input value={labDetails.jobMadeBy} onChange={e => setLabDetails({...labDetails, jobMadeBy:e.target.value})} style={inputStyle} placeholder="Técnico" /></label>
                            <label><span style={labelStyle}>Fecha Promesa Entrega</span><input type="date" value={labDetails.deliveryDate} onChange={e => setLabDetails({...labDetails, deliveryDate:e.target.value})} style={inputStyle} /></label>
                            <label><span style={labelStyle}>Envió a Lab</span><input value={labDetails.sentBy} onChange={e => setLabDetails({...labDetails, sentBy:e.target.value})} style={inputStyle} placeholder="Nombre" /></label>
                            <label><span style={labelStyle}>Recibió de Lab</span><input value={labDetails.receivedBy} onChange={e => setLabDetails({...labDetails, receivedBy:e.target.value})} style={inputStyle} placeholder="Nombre" /></label>
                            <label><span style={labelStyle}>Mensajería / Chofer</span><input value={labDetails.courier} onChange={e => setLabDetails({...labDetails, courier:e.target.value})} style={inputStyle} /></label>
                        </div>
                        <button onClick={handleSave} style={{ marginTop: 20, background: "#2563eb", color: "white", padding: 12, border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}>Guardar Datos de Taller</button>
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