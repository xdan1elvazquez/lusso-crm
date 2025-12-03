import React, { useState, useEffect } from "react";
import { updateSaleLogistics, processReturn, updateSalePaymentMethod } from "@/services/salesStorage"; 
import { getAllWorkOrders } from "@/services/workOrdersStorage";

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
  const [activeTab, setActiveTab] = useState("GENERAL");
  const [soldBy, setSoldBy] = useState(sale.soldBy || "");
  
  // Estado para edición de pagos
  const [editingPaymentId, setEditingPaymentId] = useState(null); 
  const [tempMethod, setTempMethod] = useState("");

  // Estado para las Work Orders (Ahora se cargan asíncronamente)
  const [relatedWorkOrders, setRelatedWorkOrders] = useState([]);

  useEffect(() => {
      async function loadWOs() {
          try {
              // Solo cargamos las órdenes si estamos en la pestaña de LAB para ahorrar recursos
              if (activeTab === "LAB") {
                  const allWos = await getAllWorkOrders();
                  setRelatedWorkOrders(allWos.filter(w => w.saleId === sale.id));
              }
          } catch (error) {
              console.error("Error cargando work orders:", error);
          }
      }
      loadWOs();
  }, [activeTab, sale.id]);

  const handleSave = async () => {
      await updateSaleLogistics(sale.id, { soldBy });
      alert("Vendedor actualizado");
      if (onUpdate) onUpdate();
  };

  // Manejador para guardar corrección de pago
  const handleUpdatePayment = async (paymentId) => {
      if (!tempMethod) return;
      
      const success = await updateSalePaymentMethod(sale.id, paymentId, tempMethod);
      if (success) {
          alert("Método de pago corregido.");
          setEditingPaymentId(null);
          if (onUpdate) onUpdate(); 
      } else {
          alert("Error al actualizar.");
      }
  };
  
  const handleReturnItem = async (item) => {
      // 1. Preguntar cantidad
      const qty = prompt(`¿Cuántos "${item.description}" deseas devolver? (Máx: ${item.qty})`, 1);
      if (!qty) return;
      
      const q = Number(qty);
      if (isNaN(q) || q <= 0 || q > item.qty) return alert("Cantidad inválida");

      // 2. Confirmar acción financiera
      const confirmMsg = `¿Confirmas la devolución de ${q} pieza(s)?\n\n⚠️ Acciones automáticas:\n1. Se regresará al inventario.\n2. Se registrará un egreso de caja (Devolución).\n3. Se actualizará la venta.`;
      
      if (confirm(confirmMsg)) {
          try {
              await processReturn(sale.id, item.id, q);
              alert("Devolución procesada correctamente.");
              if (onUpdate) onUpdate();
              onClose(); 
          } catch (e) {
              alert("Error: " + e.message);
          }
      }
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

  // Estilos inline para mantener consistencia
  const labelStyle = { fontSize: 11, color: "#888", textTransform: "uppercase", marginBottom: 2 };
  const valStyle = { fontSize: 14, fontWeight: "bold", color: "white" };
  const inputStyle = { width: "100%", padding: "8px 10px", background: "#111", border: "1px solid #444", color: "white", borderRadius: 4 };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
        <div style={{ background: "#1a1a1a", width: "90%", maxWidth: 800, maxHeight: "90vh", borderRadius: 12, border: "1px solid #444", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
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
                            <div key={i} style={{ border: "1px solid #444", borderRadius: 8, padding: 15, marginBottom: 10, position: "relative" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                                    <div>
                                        <strong style={{ fontSize: "1.1em", color:"white" }}>{item.description}</strong>
                                        <div style={{fontSize:"0.8em", color:"#aaa"}}>Cant: {item.qty}</div>
                                    </div>
                                    <span style={{ color: "#4ade80", fontWeight: "bold" }}>${item.unitPrice.toLocaleString()}</span>
                                </div>
                                
                                {item.qty > 0 && (
                                    <button 
                                        onClick={() => handleReturnItem(item)} 
                                        style={{position:"absolute", top:15, right:120, fontSize:"0.75em", background:"#450a0a", color:"#f87171", border:"1px solid #f87171", padding:"4px 8px", borderRadius:4, cursor:"pointer"}}
                                        title="Devolver producto y ajustar inventario"
                                    >
                                        ↩ Devolver
                                    </button>
                                )}

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

                                    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, fontSize:"0.9em", background:"#1a1a1a", padding:10, borderRadius:6}}>
                                        <div>
                                            <div style={{fontSize:10, color:"#666", textTransform:"uppercase"}}>Mensajería</div>
                                            <div style={{color: wo.courier ? "white" : "#444"}}>{wo.courier || "—"}</div>
                                        </div>
                                        <div>
                                            <div style={{fontSize:10, color:"#666", textTransform:"uppercase"}}>Recibido Por</div>
                                            <div style={{color: wo.receivedBy ? "#a78bfa" : "#444"}}>{wo.receivedBy || "—"}</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === "PAYMENTS" && (
                    <div>
                        <h4 style={{ margin: "0 0 15px 0", color: "#c084fc", borderBottom: "1px solid #c084fc", paddingBottom: 5 }}>Estado de Cuenta</h4>
                        <div style={{ marginBottom: 20, background: "#222", padding: 15, borderRadius: 8, textAlign: "center", display:"flex", justifyContent:"space-around" }}>
                             <div><div style={labelStyle}>TOTAL</div><div style={{fontSize:"1.4em", fontWeight:"bold", color:"white"}}>${sale.total.toLocaleString()}</div></div>
                             <div><div style={labelStyle}>PAGADO</div><div style={{fontSize:"1.4em", fontWeight:"bold", color:"#4ade80"}}>${sale.paidAmount.toLocaleString()}</div></div>
                             <div><div style={labelStyle}>RESTA</div><div style={{fontSize:"1.4em", fontWeight:"bold", color:"#f87171"}}>${sale.balance.toLocaleString()}</div></div>
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
                            <thead><tr style={{ background: "#333", color: "#aaa" }}><th style={{ padding: 8, textAlign: "left" }}>Fecha</th><th style={{ padding: 8, textAlign: "left" }}>Método</th><th style={{ padding: 8, textAlign: "right" }}>Monto</th><th style={{ padding: 8 }}></th></tr></thead>
                            <tbody>
                                {sale.payments.map((p, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #333" }}>
                                        <td style={{ padding: 8 }}>{new Date(p.paidAt).toLocaleDateString()}</td>
                                        
                                        {/* CELDA EDITABLE */}
                                        <td style={{ padding: 8 }}>
                                            {editingPaymentId === p.id ? (
                                                <select 
                                                    autoFocus
                                                    value={tempMethod} 
                                                    onChange={e => setTempMethod(e.target.value)}
                                                    style={{padding:4, borderRadius:4, background:"#444", color:"white", border:"1px solid #60a5fa"}}
                                                >
                                                    <option value="EFECTIVO">EFECTIVO</option>
                                                    <option value="TARJETA">TARJETA</option>
                                                    <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                                                    <option value="CHEQUE">CHEQUE</option>
                                                    <option value="OTRO">OTRO</option>
                                                </select>
                                            ) : (
                                                <span>
                                                    {p.method} 
                                                    {p.terminal && <span style={{fontSize:"0.8em", color:"#888"}}> ({p.terminal})</span>}
                                                </span>
                                            )}
                                        </td>
                                        
                                        <td style={{ padding: 8, textAlign: "right", color: "#4ade80", fontWeight: "bold" }}>${p.amount.toLocaleString()}</td>
                                        
                                        {/* BOTONES DE ACCIÓN */}
                                        <td style={{ padding: 8, textAlign: "right" }}>
                                            {editingPaymentId === p.id ? (
                                                <div style={{display:"flex", gap:5, justifyContent:"flex-end"}}>
                                                    <button onClick={() => handleUpdatePayment(p.id)} style={{cursor:"pointer", border:"none", background:"none"}} title="Guardar">💾</button>
                                                    <button onClick={() => setEditingPaymentId(null)} style={{cursor:"pointer", border:"none", background:"none"}} title="Cancelar">✕</button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => { setEditingPaymentId(p.id); setTempMethod(p.method); }} 
                                                    style={{cursor:"pointer", border:"none", background:"none", opacity:0.5}} 
                                                    title="Corregir método de pago"
                                                >
                                                    ✏️
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{marginTop:15, fontSize:"0.8em", color:"#666", fontStyle:"italic"}}>
                            * Usa el botón de lápiz para corregir si cobraste con el método incorrecto. Esto ajustará el arqueo de caja automáticamente.
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}