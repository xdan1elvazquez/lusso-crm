import { useState, useMemo } from "react";
import { getAllExpenses, createExpense, deleteExpense } from "@/services/expensesStorage";
// 👇 IMPORTAR HANDLERS
import { preventNegativeKey, sanitizeMoney, formatMoneyBlur } from "@/utils/inputHandlers";

const CATEGORIES = ["INVENTARIO", "OPERATIVO", "NOMINA", "MARKETING", "MANTENIMIENTO", "OTROS"];
const METHODS = ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "CHEQUE"];

export default function ExpensesPage() {
  const [tick, setTick] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  
  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "OPERATIVO",
    method: "EFECTIVO",
    date: new Date().toISOString().slice(0, 10)
  });

  const expenses = useMemo(() => getAllExpenses(), [tick]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || !form.description) return;
    createExpense(form);
    setForm({ description: "", amount: "", category: "OPERATIVO", method: "EFECTIVO", date: new Date().toISOString().slice(0, 10) });
    setIsCreating(false);
    setTick(t => t + 1);
  };

  const handleDelete = (id) => {
    if(confirm("¿Eliminar registro de gasto?")) {
      deleteExpense(id);
      setTick(t => t + 1);
    }
  };

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Gastos y Compras</h1>
        <button onClick={() => setIsCreating(!isCreating)} style={{ background: "#f87171", color: "white", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>
          - Registrar Gasto
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", marginBottom: 20, display: "grid", gap: 15 }}>
           <h3 style={{ margin: 0, color: "#fca5a5" }}>Nuevo Egreso</h3>
           
           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15 }}>
              <label style={{ display: "grid", gap: 5 }}>
                 <span style={{fontSize:12, color:"#aaa"}}>Concepto</span>
                 <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ej. Pago de Luz" style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
              </label>
              
              {/* 👇 MONTO ACTUALIZADO */}
              <label style={{ display: "grid", gap: 5 }}>
                 <span style={{fontSize:12, color:"#aaa"}}>Monto ($)</span>
                 <input 
                    type="number" 
                    min="0"
                    value={form.amount} 
                    onKeyDown={preventNegativeKey}
                    onChange={e => setForm({...form, amount: sanitizeMoney(e.target.value)})} 
                    onBlur={e => setForm(f => ({...f, amount: formatMoneyBlur(f.amount)}))}
                    placeholder="0.00" 
                    style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} 
                 />
              </label>
           </div>

           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15 }}>
              <label style={{ display: "grid", gap: 5 }}>
                 <span style={{fontSize:12, color:"#aaa"}}>Categoría</span>
                 <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </label>
              <label style={{ display: "grid", gap: 5 }}>
                 <span style={{fontSize:12, color:"#aaa"}}>Método de Pago</span>
                 <select value={form.method} onChange={e => setForm({...form, method: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }}>
                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                 </select>
              </label>
              <label style={{ display: "grid", gap: 5 }}>
                 <span style={{fontSize:12, color:"#aaa"}}>Fecha</span>
                 <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
              </label>
           </div>

           <button type="submit" style={{ padding: 10, background: "#dc2626", color: "white", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer", marginTop: 10 }}>
              Registrar Salida
           </button>
        </form>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {expenses.map(e => (
           <div key={e.id} style={{ background: "#111", border: "1px solid #333", borderRadius: 10, padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                 <div style={{ fontWeight: "bold", fontSize: "1.1em" }}>{e.description}</div>
                 <div style={{ fontSize: "0.9em", color: "#888" }}>
                    {new Date(e.date).toLocaleDateString()} · <span style={{ color: "#fca5a5", background: "#450a0a", padding: "2px 6px", borderRadius: 4, fontSize: "0.9em" }}>{e.category}</span> · {e.method}
                 </div>
              </div>
              <div style={{ textAlign: "right" }}>
                 <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#f87171" }}>- ${Number(e.amount).toLocaleString()}</div>
                 <button onClick={() => handleDelete(e.id)} style={{ background: "none", border: "none", color: "#666", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Eliminar</button>
              </div>
           </div>
        ))}
        {expenses.length === 0 && <p style={{ opacity: 0.5, textAlign: "center" }}>No hay gastos registrados.</p>}
      </div>
    </div>
  );
}