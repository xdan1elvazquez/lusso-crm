import React, { useState, useEffect } from "react";
import { updateSaleLogistics, processReturn, updateSalePaymentMethod } from "@/services/salesStorage"; 
import { getAllWorkOrders, updateWorkOrder } from "@/services/workOrdersStorage";
import { getLabs } from "@/services/labStorage"; 
import { getEmployees } from "@/services/employeesStorage"; 
import WorkOrderEditForm from "./sales/WorkOrderEditForm";

export default function SaleDetailModal({ sale, patient, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState("GENERAL");
  const [soldBy, setSoldBy] = useState(sale.soldBy || "");
  const [editingPaymentId, setEditingPaymentId] = useState(null); 
  const [tempMethod, setTempMethod] = useState("");

  const [labs, setLabs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [editingWO, setEditingWO] = useState(null); 

  // 🧠 DETECCIÓN DE TIPO
  const isLabSale = sale.saleType === "LAB" || (!sale.saleType && sale.items.some(i => i.requiresLab));

  useEffect(() => {
      Promise.all([getLabs(), getEmployees(), getAllWorkOrders()]).then(([l, e, w]) => {
          setLabs(l); setEmployees(e);
          setWorkOrders(w.filter(wo => wo.saleId === sale.id));
      });
  }, [sale.id]);

  const handleSaveWO = async (data) => {
      await updateWorkOrder(editingWO, data);
      setWorkOrders(prev => prev.map(w => w.id === editingWO ? { ...w, ...data } : w));
      setEditingWO(null);
      alert("Actualizado");
  };

  const handleSaveLogistics = async () => {
      await updateSaleLogistics(sale.id, { soldBy });
      onUpdate && onUpdate();
      alert("Guardado");
  };

  const handleReturn = async (item) => {
      const q = Number(prompt(`Cantidad a devolver (Máx ${item.qty}):`, 1));
      if(q > 0 && q <= item.qty && confirm("¿Confirmar devolución?")) {
          await processReturn(sale.id, item.id, q);
          onUpdate && onUpdate(); onClose();
      }
  };

  const handlePaymentUpdate = async (pid) => {
      if(await updateSalePaymentMethod(sale.id, pid, tempMethod)) {
          setEditingPaymentId(null); onUpdate && onUpdate();
      }
  };

  const TabBtn = ({ id, label }) => (
      <button onClick={() => setActiveTab(id)} style={{ flex: 1, padding: 12, background: activeTab===id ? "#2563eb" : "#333", color: "white", border: "none", borderBottom: activeTab===id ? "2px solid white" : "2px solid transparent", cursor: "pointer", fontWeight: "bold" }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
        <div style={{ background: "#1a1a1a", width: "90%", maxWidth: 800, maxHeight: "90vh", borderRadius: 12, border: "1px solid #444", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
            <div style={{ padding: 20, borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111" }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: "1.3em", color: "#e5e7eb" }}>
                        {isLabSale ? "👓 Ticket Óptico" : "🛍️ Ticket Mostrador"} 
                        <span style={{color:"#60a5fa", marginLeft:10}}>#{sale.id.slice(0,6).toUpperCase()}</span>
                    </h2>
                    <div style={{ color: "#888", fontSize: "0.9em" }}>{new Date(sale.createdAt).toLocaleString()}</div>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", borderBottom: "1px solid #333" }}>
                <TabBtn id="GENERAL" label="1. General" />
                {isLabSale && <TabBtn id="LAB" label="2. Taller" />}
                <TabBtn id="PAYMENTS" label="3. Pagos" />
            </div>

            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
                {activeTab === "GENERAL" && (
                    <div style={{ display: "grid", gap: 15 }}>
                        <div style={{background:"#222", padding:15, borderRadius:8, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                            <div>
                                <div style={{fontSize:11, color:"#aaa"}}>CLIENTE</div>
                                <div style={{fontWeight:"bold"}}>{patient?.firstName} {patient?.lastName}</div>
                            </div>
                            <div>
                                <div style={{fontSize:11, color:"#aaa"}}>VENDEDOR</div>
                                <div style={{display:"flex", gap:5}}>
                                    <input value={soldBy} onChange={e=>setSoldBy(e.target.value)} style={{background:"#111", border:"1px solid #444", color:"white", padding:4, borderRadius:4}} />
                                    <button onClick={handleSaveLogistics} style={{cursor:"pointer"}}>💾</button>
                                </div>
                            </div>
                        </div>
                        {sale.items.map((item, i) => (
                            <div key={i} style={{border:"1px solid #444", padding:10, borderRadius:6, position:"relative"}}>
                                <div style={{fontWeight:"bold"}}>{item.description} <span style={{color:"#4ade80"}}>${item.unitPrice}</span></div>
                                <div style={{fontSize:12, color:"#aaa"}}>Cant: {item.qty}</div>
                                {item.qty > 0 && <button onClick={()=>handleReturn(item)} style={{position:"absolute", top:10, right:10, fontSize:10, background:"#450a0a", color:"#f87171", border:"none", padding:"4px 8px", borderRadius:4, cursor:"pointer"}}>Devolver</button>}
                                {item.rxSnapshot && <div style={{fontSize:11, color:"#60a5fa", marginTop:5}}>Rx Adjunta</div>}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === "LAB" && isLabSale && (
                    <div style={{ display: "grid", gap: 15 }}>
                        {workOrders.map(wo => (
                            <div key={wo.id} style={{background:"#222", padding:15, borderRadius:8, borderLeft: "4px solid #60a5fa"}}>
                                <div style={{display:"flex", justifyContent:"space-between"}}>
                                    <strong>{wo.type} - {wo.labName}</strong>
                                    <div style={{color:"#aaa"}}>{wo.status}</div>
                                </div>
                                {editingWO === wo.id ? (
                                    <WorkOrderEditForm wo={wo} labs={labs} employees={employees} onSave={handleSaveWO} onCancel={()=>setEditingWO(null)} />
                                ) : (
                                    <div style={{marginTop:10, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                                        <div style={{fontSize:12, color:"#ccc"}}>Costo: ${wo.labCost} | Envía: {wo.courier||"-"}</div>
                                        <button onClick={()=>setEditingWO(wo.id)} style={{fontSize:11, border:"1px solid #666", background:"none", color:"#aaa", cursor:"pointer", borderRadius:4, padding:"2px 6px"}}>Editar</button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {workOrders.length === 0 && <p style={{opacity:0.5}}>Sin órdenes generadas.</p>}
                    </div>
                )}

                {activeTab === "PAYMENTS" && (
                    <div style={{background:"#222", padding:15, borderRadius:8}}>
                        <div style={{display:"flex", justifyContent:"space-between", marginBottom:15, fontSize:"1.2em", fontWeight:"bold"}}>
                            <span>Total: ${sale.total}</span>
                            <span style={{color: sale.balance>0 ? "#f87171" : "#4ade80"}}>Saldo: ${sale.balance}</span>
                        </div>
                        {sale.payments.map(p => (
                            <div key={p.id} style={{display:"flex", justifyContent:"space-between", borderBottom:"1px solid #444", padding:8, alignItems:"center"}}>
                                <div>{new Date(p.paidAt).toLocaleDateString()}</div>
                                {editingPaymentId === p.id ? (
                                    <select autoFocus value={tempMethod} onChange={e=>setTempMethod(e.target.value)} style={{background:"#444", color:"white"}}><option>EFECTIVO</option><option>TARJETA</option><option>TRANSFERENCIA</option></select>
                                ) : <div>{p.method}</div>}
                                <div style={{color:"#4ade80"}}>${p.amount}</div>
                                {editingPaymentId === p.id ? (
                                    <button onClick={()=>handlePaymentUpdate(p.id)}>💾</button>
                                ) : (
                                    <button onClick={()=>{setEditingPaymentId(p.id); setTempMethod(p.method)}} style={{background:"none", border:"none", cursor:"pointer"}}>✏️</button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}