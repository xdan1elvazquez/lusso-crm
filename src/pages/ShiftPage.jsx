import { useState, useEffect } from "react";
import { getCurrentShift, getShiftInProcess, openShift, preCloseShift, closeShift, getAllShifts } from "@/services/shiftsStorage";
import { getSalesMetricsByShift } from "@/services/salesStorage"; 
import { getExpensesByShift } from "@/services/expensesStorage";
import { getEmployees } from "@/services/employeesStorage";
import { useNotify, useConfirm } from "@/context/UIContext";
import LoadingState from "@/components/LoadingState";

export default function ShiftPage() {
  const notify = useNotify();
  const confirm = useConfirm();
  
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState(null);
  const [auditShift, setAuditShift] = useState(null);
  const [history, setHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Modales de vista
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [viewShift, setViewShift] = useState(null);

  // Estados Formularios
  const [openForm, setOpenForm] = useState({ user: "", initialCash: "" });
  const [blindCount, setBlindCount] = useState({ cash: "", card: "", transfer: "" });
  const [auditNotes, setAuditNotes] = useState("");

  // ✅ NUEVO: Estado para guardar métricas cargadas asíncronamente
  const [metrics, setMetrics] = useState(null);

  // Función unificada para cargar todos los datos necesarios
  const refreshData = async () => {
      setLoading(true);
      try {
          const [current, process, all, emps] = await Promise.all([
              getCurrentShift(),
              getShiftInProcess(),
              getAllShifts(),
              getEmployees()
          ]);
          
          setActiveShift(current);
          setAuditShift(process);
          setHistory(all);
          setEmployees(emps);
      } catch (e) {
          console.error("Error cargando datos:", e);
          notify.error("Error al cargar estado de caja");
      } finally {
          setLoading(false);
      }
  };

  // Carga inicial
  useEffect(() => { 
      refreshData(); 
  }, []);

  // ✅ CORRECCIÓN: Carga de métricas asíncrona usando useEffect en lugar de useMemo
  useEffect(() => {
      const targetShift = auditShift || activeShift;
      
      if (!targetShift) {
          setMetrics(null);
          return;
      }

      async function loadMetrics() {
          try {
              const [sales, expenses] = await Promise.all([
                  getSalesMetricsByShift(targetShift.id),
                  getExpensesByShift(targetShift.id)
              ]);

              const expectedCash = Number(targetShift.initialCash) + (sales.incomeByMethod.EFECTIVO || 0) - (expenses.byMethod.EFECTIVO || 0);
              const expectedCard = (sales.incomeByMethod.TARJETA || 0);
              const expectedTransfer = (sales.incomeByMethod.TRANSFERENCIA || 0) - (expenses.byMethod.TRANSFERENCIA || 0);

              setMetrics({ 
                  sales, 
                  expenses, 
                  expected: { cash: expectedCash, card: expectedCard, transfer: expectedTransfer } 
              });
          } catch (error) {
              console.error("Error cargando métricas:", error);
          }
      }

      loadMetrics();
  }, [activeShift, auditShift]);

  const handleOpen = async () => {
      if (!openForm.user) return notify.error("Selecciona tu usuario");
      if (openForm.initialCash === "") return notify.error("Indica fondo de caja");
      
      try {
          await openShift({ user: openForm.user, initialCash: openForm.initialCash });
          await refreshData();
          notify.success("Turno abierto correctamente");
      } catch(e) { notify.error(e.message); }
  };

  const handlePreClose = async () => {
      const ok = await confirm({
          title: "Iniciar Arqueo",
          message: "¿Estás seguro de iniciar el corte de caja?\n\n⚠️ Se bloquearán las ventas hasta que un gerente finalice la auditoría.",
          confirmText: "Sí, Cerrar Caja",
          cancelText: "Cancelar"
      });
      
      if (!ok) return;
      
      try {
          await preCloseShift(activeShift.id, blindCount);
          setBlindCount({ cash: "", card: "", transfer: "" }); 
          await refreshData();
          notify.info("Caja cerrada. Esperando auditoría.");
      } catch (e) {
          notify.error(e.message);
      }
  };

  const handleFinalClose = async () => {
      if (!metrics || !auditShift) return;
      
      const declared = auditShift.declared; 
      const diff = {
          cash: declared.cash - metrics.expected.cash,
          card: declared.card - metrics.expected.card,
          transfer: declared.transfer - metrics.expected.transfer
      };

      const ok = await confirm({
          title: "Cierre Definitivo",
          message: "¿Confirmar cierre definitivo y registrar diferencias?",
          confirmText: "Aprobar y Cerrar"
      });

      if(!ok) return;

      try {
          await closeShift(auditShift.id, {
              expected: metrics.expected,
              declared: declared,
              difference: diff,
              notes: auditNotes
          });
          
          setAuditNotes("");
          await refreshData();
          notify.success("Turno finalizado y guardado.");
      } catch (e) {
          notify.error(e.message);
      }
  };

  if (loading && !activeShift && !auditShift) return <LoadingState />;

  return (
    <div style={{ paddingBottom: 40, width: "100%" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h1 style={{ margin: 0 }}>Control de Turnos</h1>
            <button 
                onClick={() => setShowHistoryModal(true)} 
                style={{ background: "#333", border: "1px solid #aaa", color: "white", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}
            >
                📜 Historial de Cortes
            </button>
        </div>

        {showHistoryModal && (
            <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", zIndex:200, display:"flex", justifyContent:"center", alignItems:"center" }}>
                <div style={{ background: "#1a1a1a", width: "90%", maxWidth: 600, maxHeight: "80vh", borderRadius: 12, border: "1px solid #444", display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: 20, borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0 }}>Historial de Cortes de Caja</h3>
                        <button onClick={() => setShowHistoryModal(false)} style={{ background: "none", border: "none", color: "#aaa", fontSize: 20, cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ padding: 20, overflowY: "auto" }}>
                        {history.map(h => (
                            <div 
                                key={h.id} 
                                onClick={() => setViewShift(h)}
                                style={{ padding: 15, borderBottom: "1px solid #333", cursor: "pointer", background: h.status==="CLOSED" ? "transparent" : "rgba(250, 204, 21, 0.1)" }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                    <strong style={{ color: "white" }}>{new Date(h.openedAt).toLocaleDateString()} · {h.user}</strong>
                                    <span style={{ fontSize: "0.8em", padding: "2px 6px", borderRadius: 4, background: h.status==="CLOSED" ? "#064e3b" : "#451a03", color: h.status==="CLOSED" ? "#4ade80" : "#fbbf24" }}>
                                        {h.status}
                                    </span>
                                </div>
                                <div style={{ fontSize: "0.9em", color: "#888", display: "flex", justifyContent: "space-between" }}>
                                    <span>Apertura: {new Date(h.openedAt).toLocaleTimeString()}</span>
                                    {h.difference && (
                                        <span style={{ color: (h.difference.cash + h.difference.card + h.difference.transfer) === 0 ? "#4ade80" : "#f87171" }}>
                                            Dif: ${(h.difference.cash + h.difference.card + h.difference.transfer).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {viewShift && (
            <ShiftDetailModal shift={viewShift} onClose={() => setViewShift(null)} />
        )}

        {!activeShift && !auditShift && (
            <div style={{ padding: 40, maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
                <div style={{ background: "#1a1a1a", padding: 30, borderRadius: 12, border: "1px solid #333", display:"grid", gap:20, textAlign:"left" }}>
                    <h2 style={{marginTop:0, color:"#e5e7eb", textAlign:"center"}}>🔐 Apertura de Caja</h2>
                    <label>
                        <div style={{fontSize:12, color:"#aaa", marginBottom:5}}>Usuario</div>
                        <select value={openForm.user} onChange={e => setOpenForm({...openForm, user: e.target.value})} style={{ width: "100%", padding: 10, background: "#222", color: "white", border: "1px solid #444", borderRadius: 6 }}>
                            <option value="">-- ¿Quién eres? --</option>
                            {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                        </select>
                    </label>
                    <label>
                        <div style={{fontSize:12, color:"#aaa", marginBottom:5}}>Fondo de Caja (Efectivo Inicial)</div>
                        <input type="number" value={openForm.initialCash} onChange={e => setOpenForm({...openForm, initialCash: e.target.value})} placeholder="0.00" style={{ width: "100%", padding: 10, background: "#222", color: "white", border: "1px solid #4ade80", borderRadius: 6, fontSize: "1.2em", fontWeight: "bold" }} />
                    </label>
                    <button onClick={handleOpen} style={{ padding: 12, background: "#2563eb", color: "white", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: "1.1em" }}>
                        Iniciar Turno
                    </button>
                </div>
                <div style={{marginTop:40, textAlign:"left"}}>
                    <h4 style={{color:"#666", borderBottom:"1px solid #333", paddingBottom:10}}>Últimos Cierres (Click para ver)</h4>
                    {history.slice(0,3).map(h => (
                        <div key={h.id} onClick={() => setViewShift(h)} style={{padding:12, borderBottom:"1px solid #333", fontSize:"0.9em", color:"#888", display:"flex", justifyContent:"space-between", cursor:"pointer"}}>
                            <span>{new Date(h.openedAt).toLocaleDateString()} - {h.user}</span>
                            <span style={{color: h.status==="CLOSED"?"#4ade80":"#facc15"}}>{h.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeShift && (
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:30, marginTop:10}}>
                <div style={{background:"#1a1a1a", padding:20, borderRadius:12, border:"1px solid #333"}}>
                    <h3 style={{marginTop:0, color:"#4ade80"}}>🟢 Turno Activo</h3>
                    <p style={{color:"#ccc"}}>Caja abierta para ventas.</p>
                    <div style={{fontSize:"0.9em", color:"#888", marginBottom:20}}>
                        Usuario: <strong style={{color:"white"}}>{activeShift.user}</strong><br/>
                        Abierto: {new Date(activeShift.openedAt).toLocaleString()}
                    </div>
                    <div style={{padding:15, background:"rgba(37, 99, 235, 0.1)", borderRadius:8, borderLeft:"4px solid #2563eb"}}>
                        <div style={{fontSize:12, color:"#aaa"}}>FONDO INICIAL</div>
                        <div style={{fontSize:"1.5em", fontWeight:"bold", color:"white"}}>${activeShift.initialCash.toLocaleString()}</div>
                    </div>
                </div>

                <div style={{background:"#1a1a1a", padding:25, borderRadius:12, border:"1px solid #f87171"}}>
                    <h2 style={{marginTop:0, color:"#f87171"}}>Realizar Arqueo</h2>
                    <p style={{fontSize:"0.9em", color:"#888", marginBottom:20}}>
                        Cuenta el dinero físico. Al confirmar, <strong>se bloquearán las ventas</strong>.
                    </p>
                    <div style={{display:"grid", gap:15, marginBottom:20}}>
                        <label><div style={{fontSize:12, color:"#aaa"}}>Efectivo</div><input type="number" value={blindCount.cash} onChange={e => setBlindCount({...blindCount, cash: e.target.value})} style={inputBlindStyle} placeholder="$0.00" /></label>
                        <label><div style={{fontSize:12, color:"#aaa"}}>Vouchers</div><input type="number" value={blindCount.card} onChange={e => setBlindCount({...blindCount, card: e.target.value})} style={inputBlindStyle} placeholder="$0.00" /></label>
                        <label><div style={{fontSize:12, color:"#aaa"}}>Transferencias</div><input type="number" value={blindCount.transfer} onChange={e => setBlindCount({...blindCount, transfer: e.target.value})} style={inputBlindStyle} placeholder="$0.00" /></label>
                    </div>
                    <button onClick={handlePreClose} style={{width:"100%", padding:15, background:"#f87171", color:"white", border:"none", borderRadius:6, fontWeight:"bold", fontSize:"1.1em", cursor:"pointer"}}>🔒 CERRAR CAJA</button>
                </div>
            </div>
        )}

        {auditShift && metrics && (
            <div>
                <div style={{marginBottom:30, background:"#291c0a", padding:20, borderRadius:8, border:"1px solid #facc15"}}>
                    <h3 style={{margin:0, color:"#facc15"}}>⚠️ Modo Gerente: Auditoría de Caja</h3>
                    <p style={{margin:"5px 0 0 0", color:"#e5e7eb", fontSize:"0.9em"}}>Verifica las diferencias antes de cerrar definitivamente.</p>
                </div>

                <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:30}}>
                    <div style={{background:"#1a1a1a", borderRadius:12, border:"1px solid #333", overflow:"hidden"}}>
                        <table style={{width:"100%", borderCollapse:"collapse", fontSize:"0.95em"}}>
                            <thead>
                                <tr style={{background:"#111", borderBottom:"1px solid #444", color:"#aaa"}}>
                                    <th style={{padding:15, textAlign:"left"}}>Método</th>
                                    <th style={{padding:15, textAlign:"right"}}>Sistema (Esperado)</th>
                                    <th style={{padding:15, textAlign:"right", color:"#60a5fa"}}>Cajero (Declarado)</th>
                                    <th style={{padding:15, textAlign:"right"}}>Diferencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AuditRow label="Efectivo" expected={metrics.expected.cash} declared={auditShift.declared.cash} />
                                <AuditRow label="Tarjeta" expected={metrics.expected.card} declared={auditShift.declared.card} />
                                <AuditRow label="Transferencia" expected={metrics.expected.transfer} declared={auditShift.declared.transfer} />
                                <tr style={{borderTop:"2px solid #444", fontWeight:"bold", fontSize:"1.1em"}}>
                                    <td style={{padding:15}}>TOTAL DIFERENCIA</td>
                                    <td colSpan={3} style={{padding:15, textAlign:"right", color: calculateTotalDiff(metrics, auditShift) === 0 ? "#4ade80" : "#f87171"}}>
                                        {calculateTotalDiff(metrics, auditShift) > 0 ? "+" : ""}{calculateTotalDiff(metrics, auditShift).toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{background:"#1a1a1a", padding:25, borderRadius:12, border:"1px solid #333"}}>
                        <h3 style={{marginTop:0, color:"#fff"}}>Finalizar Turno</h3>
                        <textarea placeholder="Notas de auditoría..." value={auditNotes} onChange={e => setAuditNotes(e.target.value)} style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6, marginBottom:20}} rows={3} />
                        <button onClick={handleFinalClose} style={{width:"100%", padding:15, background:"#facc15", color:"black", border:"none", borderRadius:6, fontWeight:"bold", fontSize:"1.1em", cursor:"pointer"}}>✅ APROBAR Y CERRAR</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

const inputBlindStyle = { width: "100%", padding: 10, background: "#222", border: "1px solid #555", color: "white", borderRadius: 6, fontSize: "1.1em", fontWeight: "bold" };

const calculateTotalDiff = (metrics, shift) => {
    return (shift.declared.cash - metrics.expected.cash) + 
           (shift.declared.card - metrics.expected.card) + 
           (shift.declared.transfer - metrics.expected.transfer);
};

const AuditRow = ({ label, expected, declared }) => {
    const diff = declared - expected;
    return (
        <tr style={{borderBottom:"1px solid #222"}}>
            <td style={{padding:15}}>{label}</td>
            <td style={{padding:15, textAlign:"right"}}>${expected.toLocaleString()}</td>
            <td style={{padding:15, textAlign:"right", color:"#60a5fa", fontWeight:"bold"}}>${declared.toLocaleString()}</td>
            <td style={{padding:15, textAlign:"right", color: Math.abs(diff)<1?"#666":diff>0?"#4ade80":"#f87171", fontWeight:"bold"}}>{diff>0?"+":""}{diff.toLocaleString()}</td>
        </tr>
    );
};

const ShiftDetailModal = ({ shift, onClose }) => {
    const expected = shift.expected || { cash:0, card:0, transfer:0 };
    const declared = shift.declared || { cash:0, card:0, transfer:0 };
    const diff = shift.difference || { cash:0, card:0, transfer:0 };
    const totalDiff = (diff.cash + diff.card + diff.transfer);

    return (
        <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.85)", zIndex:210, display:"flex", justifyContent:"center", alignItems:"center" }}>
            <div style={{ background: "#1a1a1a", width: "90%", maxWidth: 700, borderRadius: 12, border: "1px solid #444", padding: 25, maxHeight: "90vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h2 style={{ margin: 0, color: "#e5e7eb" }}>Detalle de Corte</h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", fontSize: 24, cursor: "pointer" }}>×</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20, fontSize: "0.9em", color: "#ccc" }}>
                    <div>
                        <strong>Responsable:</strong> {shift.user}<br/>
                        <strong>Apertura:</strong> {new Date(shift.openedAt).toLocaleString()}<br/>
                        <strong>Cierre:</strong> {shift.closedAt ? new Date(shift.closedAt).toLocaleString() : "En curso"}
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.2em", color: "#4ade80", fontWeight: "bold" }}>Fondo: ${shift.initialCash.toLocaleString()}</div>
                        <div style={{ marginTop: 5 }}>Estado: {shift.status}</div>
                    </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #444", color: "#888", textAlign: "right" }}>
                            <th style={{ textAlign: "left", padding: 8 }}>Método</th>
                            <th style={{ padding: 8 }}>Sistema</th>
                            <th style={{ padding: 8 }}>Declarado</th>
                            <th style={{ padding: 8 }}>Diferencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        <DetailRow label="Efectivo" sys={expected.cash} dec={declared.cash} diff={diff.cash} />
                        <DetailRow label="Tarjeta" sys={expected.card} dec={declared.card} diff={diff.card} />
                        <DetailRow label="Transferencia" sys={expected.transfer} dec={declared.transfer} diff={diff.transfer} />
                    </tbody>
                    <tfoot>
                        <tr style={{ borderTop: "2px solid #444", fontWeight: "bold", fontSize: "1.1em" }}>
                            <td style={{ padding: 10, textAlign: "left" }}>TOTAL DIFERENCIA</td>
                            <td colSpan={3} style={{ padding: 10, textAlign: "right", color: totalDiff === 0 ? "#4ade80" : "#f87171" }}>
                                {totalDiff > 0 ? "+" : ""}{totalDiff.toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div style={{ background: "#222", padding: 15, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 5 }}>NOTAS / OBSERVACIONES</div>
                    <div style={{ color: "#fff", fontStyle: "italic" }}>{shift.notes || "Sin notas."}</div>
                </div>
            </div>
        </div>
    );
};

const DetailRow = ({ label, sys, dec, diff }) => (
    <tr style={{ borderBottom: "1px solid #222" }}>
        <td style={{ padding: 8, textAlign: "left", color: "#ddd" }}>{label}</td>
        <td style={{ padding: 8, textAlign: "right", color: "#aaa" }}>${sys.toLocaleString()}</td>
        <td style={{ padding: 8, textAlign: "right", color: "#fff", fontWeight: "bold" }}>${dec.toLocaleString()}</td>
        <td style={{ padding: 8, textAlign: "right", color: diff === 0 ? "#666" : diff > 0 ? "#4ade80" : "#f87171" }}>
            {diff > 0 ? "+" : ""}{diff.toLocaleString()}
        </td>
    </tr>
);