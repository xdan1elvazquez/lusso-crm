import { useState, useEffect, useMemo } from "react";
import { getCurrentShift, getShiftInProcess, openShift, preCloseShift, closeShift, getAllShifts } from "@/services/shiftsStorage";
import { getSalesMetricsByShift } from "@/services/salesStorage";
import { getExpensesByShift } from "@/services/expensesStorage";
import { getEmployees } from "@/services/employeesStorage";

export default function ShiftPage() {
  const [tick, setTick] = useState(0);
  const [activeShift, setActiveShift] = useState(null); // Turno OPEN
  const [auditShift, setAuditShift] = useState(null);   // Turno PRE_CLOSE
  const [history, setHistory] = useState([]);
  
  const employees = useMemo(() => getEmployees(), []);

  // Estados Formularios
  const [openForm, setOpenForm] = useState({ user: "", initialCash: "" });
  const [blindCount, setBlindCount] = useState({ cash: "", card: "", transfer: "" }); // Conteo ciego
  const [auditNotes, setAuditNotes] = useState("");

  useEffect(() => {
      setActiveShift(getCurrentShift());
      setAuditShift(getShiftInProcess()); // Verificar si hay uno en auditoría
      setHistory(getAllShifts());
  }, [tick]);

  // --- LÓGICA DE APERTURA ---
  const handleOpen = () => {
      if (!openForm.user) return alert("Selecciona tu usuario");
      if (openForm.initialCash === "") return alert("Indica fondo de caja");
      
      try {
          openShift({ user: openForm.user, initialCash: openForm.initialCash });
          setTick(t => t + 1);
      } catch(e) { alert(e.message); }
  };

  // --- LÓGICA PRE-CIERRE (CAJERO) ---
  const handlePreClose = () => {
      if (!confirm("¿Estás seguro de iniciar el corte de caja?\n\n⚠️ Se bloquearán las ventas hasta que un gerente finalice la auditoría.")) return;
      
      preCloseShift(activeShift.id, blindCount);
      setBlindCount({ cash: "", card: "", transfer: "" }); // Limpiar formulario
      setTick(t => t + 1);
  };

  // --- LÓGICA CIERRE FINAL (GERENTE) ---
  // Calculamos métricas solo si estamos en auditoría o hay turno activo (para debug interno)
  const metrics = useMemo(() => {
      const targetShift = auditShift || activeShift;
      if (!targetShift) return null;

      const sales = getSalesMetricsByShift(targetShift.id);
      const expenses = getExpensesByShift(targetShift.id);
      
      const expectedCash = Number(targetShift.initialCash) + (sales.incomeByMethod.EFECTIVO || 0) - (expenses.byMethod.EFECTIVO || 0);
      const expectedCard = (sales.incomeByMethod.TARJETA || 0);
      const expectedTransfer = (sales.incomeByMethod.TRANSFERENCIA || 0) - (expenses.byMethod.TRANSFERENCIA || 0);

      return { 
          sales, 
          expenses, 
          expected: { cash: expectedCash, card: expectedCard, transfer: expectedTransfer } 
      };
  }, [activeShift, auditShift, tick]);

  const handleFinalClose = () => {
      if (!metrics || !auditShift) return;
      
      // Diferencias: Declarado (Guardado en pre-cierre) - Esperado (Calculado ahorita)
      const declared = auditShift.declared; 
      const diff = {
          cash: declared.cash - metrics.expected.cash,
          card: declared.card - metrics.expected.card,
          transfer: declared.transfer - metrics.expected.transfer
      };

      if(!confirm("¿Confirmar cierre definitivo y diferencias?")) return;

      closeShift(auditShift.id, {
          expected: metrics.expected,
          declared: declared, // Se confirma lo que declaró el cajero
          difference: diff,
          notes: auditNotes
      });
      
      setAuditNotes("");
      setTick(t => t + 1);
  };

  // ------------------------------------------------------------------
  // VISTA 1: NO HAY TURNO NI PROCESO (ABRIR)
  // ------------------------------------------------------------------
  if (!activeShift && !auditShift) {
      return (
          <div style={{ padding: 40, maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
              <h1>🔐 Apertura de Turno</h1>
              <div style={{ background: "#1a1a1a", padding: 30, borderRadius: 12, border: "1px solid #333", display:"grid", gap:20, textAlign:"left" }}>
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
              <LastShifts history={history} />
          </div>
      );
  }

  // ------------------------------------------------------------------
  // VISTA 2: TURNO ABIERTO (CAJERO TRABAJANDO O PRE-CIERRE)
  // ------------------------------------------------------------------
  if (activeShift) {
      return (
        <div style={{ paddingBottom: 40, width: "100%" }}>
            <Header shift={activeShift} statusLabel="🟢 Turno Activo" statusColor="#4ade80" />
            
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:30, marginTop:30}}>
                {/* IZQUIERDA: AVISO */}
                <div style={{background:"#1a1a1a", padding:20, borderRadius:12, border:"1px solid #333"}}>
                    <h3 style={{marginTop:0, color:"#60a5fa"}}>Operación en Curso</h3>
                    <p style={{color:"#ccc"}}>La caja está abierta para ventas y cobros.</p>
                    <div style={{marginTop:20, padding:15, background:"rgba(37, 99, 235, 0.1)", borderRadius:8, borderLeft:"4px solid #2563eb"}}>
                        <strong>Fondo Inicial:</strong> ${activeShift.initialCash.toLocaleString()}
                    </div>
                </div>

                {/* DERECHA: CONTEO CIEGO */}
                <div style={{background:"#1a1a1a", padding:25, borderRadius:12, border:"1px solid #f87171"}}>
                    <h2 style={{marginTop:0, color:"#f87171"}}>Realizar Arqueo (Corte)</h2>
                    <p style={{fontSize:"0.9em", color:"#888", marginBottom:20}}>
                        Ingresa lo que tienes físicamente en caja. Al confirmar, <strong>se bloquearán las ventas</strong> hasta la auditoría.
                    </p>
                    
                    <div style={{display:"grid", gap:15, marginBottom:20}}>
                        <label>
                            <div style={{fontSize:12, color:"#aaa"}}>Efectivo (Monedas + Billetes)</div>
                            <input type="number" value={blindCount.cash} onChange={e => setBlindCount({...blindCount, cash: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #555", color:"white", borderRadius:6, fontSize:"1.2em", fontWeight:"bold"}} placeholder="$0.00" />
                        </label>
                        <label>
                            <div style={{fontSize:12, color:"#aaa"}}>Vouchers (Terminal)</div>
                            <input type="number" value={blindCount.card} onChange={e => setBlindCount({...blindCount, card: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #555", color:"white", borderRadius:6}} placeholder="$0.00" />
                        </label>
                        <label>
                            <div style={{fontSize:12, color:"#aaa"}}>Transferencias (App)</div>
                            <input type="number" value={blindCount.transfer} onChange={e => setBlindCount({...blindCount, transfer: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #555", color:"white", borderRadius:6}} placeholder="$0.00" />
                        </label>
                    </div>

                    <button onClick={handlePreClose} style={{width:"100%", padding:15, background:"#f87171", color:"white", border:"none", borderRadius:6, fontWeight:"bold", fontSize:"1.1em", cursor:"pointer"}}>
                        🔒 CERRAR CAJA (PRE-CIERRE)
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // ------------------------------------------------------------------
  // VISTA 3: AUDITORÍA (GERENTE)
  // ------------------------------------------------------------------
  if (auditShift && metrics) {
      const diffCash = auditShift.declared.cash - metrics.expected.cash;
      const diffCard = auditShift.declared.card - metrics.expected.card;
      const totalDiff = diffCash + diffCard + (auditShift.declared.transfer - metrics.expected.transfer);

      return (
        <div style={{ paddingBottom: 40, width: "100%" }}>
            <Header shift={auditShift} statusLabel="⚠️ En Auditoría (Caja Bloqueada)" statusColor="#facc15" />
            
            <div style={{marginTop:30, background:"#291c0a", padding:20, borderRadius:8, border:"1px solid #facc15", marginBottom:30}}>
                <h3 style={{margin:0, color:"#facc15"}}>Modo Gerente: Revisión de Corte</h3>
                <p style={{margin:"5px 0 0 0", color:"#e5e7eb", fontSize:"0.9em"}}>
                    El cajero ya contó el dinero. Verifica las diferencias antes de cerrar definitivamente.
                </p>
            </div>

            <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:30}}>
                {/* TABLA COMPARATIVA */}
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
                                <td colSpan={3} style={{padding:15, textAlign:"right", color: Math.abs(totalDiff)<1 ? "#4ade80" : "#f87171"}}>
                                    {totalDiff > 0 ? "+" : ""}{totalDiff.toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* FORMULARIO CIERRE FINAL */}
                <div style={{background:"#1a1a1a", padding:25, borderRadius:12, border:"1px solid #333"}}>
                    <h3 style={{marginTop:0, color:"#fff"}}>Finalizar Turno</h3>
                    <div style={{marginBottom:15}}>
                        <div style={{fontSize:12, color:"#aaa"}}>Ventas Totales del Turno</div>
                        <div style={{fontSize:"1.4em", fontWeight:"bold", color:"#4ade80"}}>${metrics.sales.totalIncome.toLocaleString()}</div>
                    </div>
                    <textarea 
                        placeholder="Notas de auditoría (ej. Sobrante se dejó para fondo...)" 
                        value={auditNotes} 
                        onChange={e => setAuditNotes(e.target.value)} 
                        style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6, marginBottom:20}} 
                        rows={3} 
                    />
                    <button onClick={handleFinalClose} style={{width:"100%", padding:15, background:"#facc15", color:"black", border:"none", borderRadius:6, fontWeight:"bold", fontSize:"1.1em", cursor:"pointer"}}>
                        ✅ APROBAR Y CERRAR
                    </button>
                </div>
            </div>
        </div>
      );
  }
  
  return null;
}

// --- SUBCOMPONENTES ---
const Header = ({ shift, statusLabel, statusColor }) => (
    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #333", paddingBottom:20}}>
        <div>
            <h1 style={{margin:0}}>Control de Turno</h1>
            <div style={{color: statusColor, marginTop:5, fontWeight:"bold"}}>{statusLabel}</div>
        </div>
        <div style={{textAlign:"right"}}>
            <div style={{fontSize:12, color:"#aaa"}}>USUARIO / APERTURA</div>
            <div style={{fontSize:"1.1em", fontWeight:"bold"}}>{shift.user} · {new Date(shift.openedAt).toLocaleTimeString()}</div>
        </div>
    </div>
);

const AuditRow = ({ label, expected, declared }) => {
    const diff = declared - expected;
    const diffColor = Math.abs(diff) < 1 ? "#666" : diff > 0 ? "#4ade80" : "#f87171";
    return (
        <tr style={{borderBottom:"1px solid #222"}}>
            <td style={{padding:15}}>{label}</td>
            <td style={{padding:15, textAlign:"right"}}>${expected.toLocaleString()}</td>
            <td style={{padding:15, textAlign:"right", color:"#60a5fa", fontWeight:"bold"}}>${declared.toLocaleString()}</td>
            <td style={{padding:15, textAlign:"right", color: diffColor, fontWeight:"bold"}}>
                {diff > 0 ? "+" : ""}{diff.toLocaleString()}
            </td>
        </tr>
    );
};

const LastShifts = ({ history }) => (
    <div style={{marginTop:40, textAlign:"left"}}>
        <h3 style={{color:"#666"}}>Últimos Cierres</h3>
        {history.slice(0,3).map(h => (
            <div key={h.id} style={{padding:10, borderBottom:"1px solid #333", fontSize:"0.9em", color:"#888", display:"flex", justifyContent:"space-between"}}>
                <span>{new Date(h.openedAt).toLocaleDateString()} - {h.user}</span>
                <span style={{color: h.status==="CLOSED"?"#4ade80":"#facc15"}}>{h.status}</span>
            </div>
        ))}
    </div>
);