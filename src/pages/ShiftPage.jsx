import { useState, useEffect, useMemo } from "react";
import { getCurrentShift, openShift, closeShift, getAllShifts } from "@/services/shiftsStorage";
import { getSalesMetricsByShift } from "@/services/salesStorage";
import { getExpensesByShift } from "@/services/expensesStorage";
import { getEmployees } from "@/services/employeesStorage";

export default function ShiftPage() {
  const [tick, setTick] = useState(0);
  const [currentShift, setCurrentShift] = useState(null);
  const [history, setHistory] = useState([]);
  
  // Estados para abrir turno
  const [initialCash, setInitialCash] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  
  // Estados para cerrar turno (conteo ciego)
  const [declared, setDeclared] = useState({ cash: "", card: "", transfer: "" });
  const [closingNotes, setClosingNotes] = useState("");

  const employees = useMemo(() => getEmployees(), []);

  useEffect(() => {
      setCurrentShift(getCurrentShift());
      setHistory(getAllShifts());
  }, [tick]);

  // Si hay turno abierto, calculamos métricas en tiempo real
  const metrics = useMemo(() => {
      if (!currentShift) return null;
      const sales = getSalesMetricsByShift(currentShift.id);
      const expenses = getExpensesByShift(currentShift.id);
      
      const expectedCash = currentShift.initialCash + (sales.incomeByMethod.EFECTIVO || 0) - (expenses.byMethod.EFECTIVO || 0);
      const expectedCard = (sales.incomeByMethod.TARJETA || 0);
      const expectedTransfer = (sales.incomeByMethod.TRANSFERENCIA || 0) - (expenses.byMethod.TRANSFERENCIA || 0);

      return { sales, expenses, expected: { cash: expectedCash, card: expectedCard, transfer: expectedTransfer } };
  }, [currentShift, tick]);

  const handleOpen = () => {
      if (!selectedUser) return alert("Selecciona tu usuario");
      if (initialCash === "") return alert("Indica fondo de caja (pon 0 si está vacía)");
      
      openShift({ user: selectedUser, initialCash });
      setTick(t => t + 1);
  };

  const handleClose = () => {
      if (!metrics) return;
      
      const diffCash = (Number(declared.cash)||0) - metrics.expected.cash;
      const diffCard = (Number(declared.card)||0) - metrics.expected.card;
      const diffTransfer = (Number(declared.transfer)||0) - metrics.expected.transfer;
      
      const confirmMsg = `¿Cerrar turno?\n\nDiferencia Efectivo: $${diffCash}\nDiferencia Tarjeta: $${diffCard}`;
      if (!confirm(confirmMsg)) return;

      closeShift(currentShift.id, {
          expected: metrics.expected,
          declared: { 
              cash: Number(declared.cash)||0, 
              card: Number(declared.card)||0, 
              transfer: Number(declared.transfer)||0 
          },
          difference: { cash: diffCash, card: diffCard, transfer: diffTransfer },
          notes: closingNotes
      });
      
      setInitialCash("");
      setDeclared({ cash: "", card: "", transfer: "" });
      setClosingNotes("");
      setTick(t => t + 1);
  };

  if (!currentShift) {
      // VISTA: ABRIR TURNO
      return (
          <div style={{ padding: 40, maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
              <h1>🔐 Apertura de Turno</h1>
              <div style={{ background: "#1a1a1a", padding: 30, borderRadius: 12, border: "1px solid #333", display:"grid", gap:20, textAlign:"left" }}>
                  <label>
                      <div style={{fontSize:12, color:"#aaa", marginBottom:5}}>Usuario</div>
                      <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ width: "100%", padding: 10, background: "#222", color: "white", border: "1px solid #444", borderRadius: 6 }}>
                          <option value="">-- ¿Quién eres? --</option>
                          {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                      </select>
                  </label>
                  <label>
                      <div style={{fontSize:12, color:"#aaa", marginBottom:5}}>Fondo de Caja (Efectivo Inicial)</div>
                      <input type="number" value={initialCash} onChange={e => setInitialCash(e.target.value)} placeholder="0.00" style={{ width: "100%", padding: 10, background: "#222", color: "white", border: "1px solid #4ade80", borderRadius: 6, fontSize: "1.2em", fontWeight: "bold" }} />
                  </label>
                  <button onClick={handleOpen} style={{ padding: 12, background: "#2563eb", color: "white", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: "1.1em" }}>
                      Iniciar Turno
                  </button>
              </div>
              
              <div style={{marginTop:40, textAlign:"left"}}>
                  <h3 style={{color:"#666"}}>Últimos Turnos</h3>
                  {history.slice(0,3).map(h => (
                      <div key={h.id} style={{padding:10, borderBottom:"1px solid #333", fontSize:"0.9em", color:"#888"}}>
                          {new Date(h.openedAt).toLocaleString()} - {h.user}
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  // VISTA: TURNO ACTIVO
  return (
    <div style={{ paddingBottom: 40, width: "100%" }}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
            <div>
                <h1 style={{margin:0}}>Turno Activo</h1>
                <div style={{color:"#4ade80", marginTop:5}}>🟢 Abierto por: {currentShift.user} · {new Date(currentShift.openedAt).toLocaleTimeString()}</div>
            </div>
            <div style={{textAlign:"right"}}>
                <div style={{fontSize:12, color:"#aaa"}}>FONDO INICIAL</div>
                <div style={{fontSize:"1.5em", fontWeight:"bold"}}>${currentShift.initialCash.toLocaleString()}</div>
            </div>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:30}}>
            
            {/* IZQUIERDA: RESUMEN TIEMPO REAL */}
            <div style={{display:"grid", gap:20, alignContent:"start"}}>
                <div style={{background:"#1a1a1a", padding:20, borderRadius:12, border:"1px solid #333"}}>
                    <h3 style={{marginTop:0, color:"#60a5fa"}}>Resumen Actual</h3>
                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:10}}>
                        <span>Ventas Totales (Cobrado):</span>
                        <span style={{fontWeight:"bold", color:"#4ade80"}}>${metrics.sales.totalIncome.toLocaleString()}</span>
                    </div>
                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:10}}>
                        <span>Gastos/Salidas:</span>
                        <span style={{fontWeight:"bold", color:"#f87171"}}>-${metrics.expenses.totalExpense.toLocaleString()}</span>
                    </div>
                    <div style={{borderTop:"1px solid #444", paddingTop:10, marginTop:10}}>
                        <div style={{fontSize:12, color:"#aaa", marginBottom:5}}>DEBERÍA HABER EN CAJA (TEÓRICO)</div>
                        <div style={{fontSize:"2em", fontWeight:"bold", color:"white"}}>${metrics.expected.cash.toLocaleString()}</div>
                        <div style={{fontSize:11, color:"#666"}}>Fondo {currentShift.initialCash} + Ventas Efvo - Gastos Efvo</div>
                    </div>
                </div>
                
                <div style={{background:"#111", padding:15, borderRadius:8}}>
                    <h4 style={{marginTop:0, color:"#aaa"}}>Desglose Ventas</h4>
                    {Object.entries(metrics.sales.incomeByMethod).map(([m, v]) => (
                        <div key={m} style={{display:"flex", justifyContent:"space-between", fontSize:"0.9em", marginBottom:5}}>
                            <span>{m}</span><span>${v.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* DERECHA: FORMULARIO DE CIERRE */}
            <div style={{background:"#1a1a1a", padding:25, borderRadius:12, border:"1px solid #f87171"}}>
                <h2 style={{marginTop:0, color:"#f87171"}}>Cerrar Turno</h2>
                <p style={{fontSize:"0.9em", color:"#ccc", marginBottom:20}}>Cuenta el dinero físico y los vouchers antes de cerrar.</p>
                
                <div style={{display:"grid", gap:15, marginBottom:20}}>
                    <label>
                        <div style={{fontSize:12, color:"#aaa"}}>Efectivo (Monedas + Billetes)</div>
                        <input type="number" value={declared.cash} onChange={e => setDeclared({...declared, cash: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #555", color:"white", borderRadius:6, fontSize:"1.1em"}} placeholder="$0.00" />
                    </label>
                    <label>
                        <div style={{fontSize:12, color:"#aaa"}}>Total Vouchers (Terminal)</div>
                        <input type="number" value={declared.card} onChange={e => setDeclared({...declared, card: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #555", color:"white", borderRadius:6}} placeholder="$0.00" />
                    </label>
                    <label>
                        <div style={{fontSize:12, color:"#aaa"}}>Transferencias (App Banco)</div>
                        <input type="number" value={declared.transfer} onChange={e => setDeclared({...declared, transfer: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #555", color:"white", borderRadius:6}} placeholder="$0.00" />
                    </label>
                </div>

                <textarea placeholder="Notas / Incidencias del turno..." value={closingNotes} onChange={e => setClosingNotes(e.target.value)} style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6, marginBottom:20}} rows={2} />

                <button onClick={handleClose} style={{width:"100%", padding:15, background:"#f87171", color:"white", border:"none", borderRadius:6, fontWeight:"bold", fontSize:"1.1em", cursor:"pointer"}}>
                    FINALIZAR TURNO
                </button>
            </div>
        </div>
    </div>
  );
}