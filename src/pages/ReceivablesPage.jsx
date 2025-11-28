import { useState, useMemo, useEffect } from "react";
import { getAllSales, addPaymentToSale } from "@/services/salesStorage";
import { getPatients } from "@/services/patientsStorage";
import { getTerminals } from "@/services/settingsStorage"; // 👈 Importamos configuración

const PAYMENT_METHODS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"];

export default function ReceivablesPage() {
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);

  const sales = useMemo(() => getAllSales(), [tick]);
  const patients = useMemo(() => getPatients(), [tick]);

  const patientMap = useMemo(() => 
    patients.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}), 
  [patients]);

  const debtors = useMemo(() => {
    return sales
      .filter(s => s.balance > 0.01)
      .map(s => ({
        ...s,
        patientName: patientMap[s.patientId] ? `${patientMap[s.patientId].firstName} ${patientMap[s.patientId].lastName}` : "Desconocido",
        phone: patientMap[s.patientId]?.phone || ""
      }))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [sales, patientMap]);

  const filtered = useMemo(() => {
    if (!query) return debtors;
    const q = query.toLowerCase();
    return debtors.filter(d => 
      d.patientName.toLowerCase().includes(q) || 
      d.description.toLowerCase().includes(q) ||
      (d.id && d.id.toLowerCase().includes(q))
    );
  }, [debtors, query]);

  const totalDebt = filtered.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Cuentas por Cobrar</h1>
        <div style={{ textAlign: "right" }}>
           <div style={{ fontSize: "0.8em", color: "#aaa" }}>TOTAL CARTERA VENCIDA</div>
           <div style={{ fontSize: "1.5em", fontWeight: "bold", color: "#f87171" }}>${totalDebt.toLocaleString()}</div>
        </div>
      </div>

      <input 
        placeholder="Buscar deudor por nombre..." 
        value={query} 
        onChange={e => setQuery(e.target.value)} 
        style={{ width: "100%", padding: 12, marginBottom: 20, background: "#1a1a1a", border: "1px solid #333", color: "white", borderRadius: 8 }}
      />

      <div style={{ display: "grid", gap: 15 }}>
        {filtered.length === 0 ? (
          <p style={{ opacity: 0.6, textAlign: "center" }}>¡Felicidades! No tienes cuentas pendientes.</p>
        ) : (
          filtered.map(sale => (
            <div key={sale.id} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, padding: 16, display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "center" }}>
               <div>
                  <div style={{ fontSize: "1.1em", fontWeight: "bold", color: "white" }}>{sale.patientName}</div>
                  <div style={{ color: "#888", fontSize: "0.9em", marginTop: 4 }}>
                     {sale.description || "Venta General"} · {new Date(sale.createdAt).toLocaleDateString()}
                  </div>
                  {sale.phone && <div style={{ color: "#60a5fa", fontSize: "0.85em", marginTop: 2 }}>📞 {sale.phone}</div>}
               </div>
               <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.8em", color: "#aaa" }}>Total: ${sale.total.toLocaleString()}</div>
                  <div style={{ fontSize: "1.4em", fontWeight: "bold", color: "#f87171", margin: "4px 0" }}>Debe: ${sale.balance.toLocaleString()}</div>
                  <button 
                    onClick={() => setSelectedSale(sale)}
                    style={{ background: "#16a34a", color: "white", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: "0.9em" }}
                  >
                    💰 Abonar
                  </button>
               </div>
            </div>
          ))
        )}
      </div>

      {selectedSale && (
         <PaymentModal 
            sale={selectedSale} 
            onClose={() => setSelectedSale(null)} 
            onSuccess={() => { setTick(t => t + 1); setSelectedSale(null); }} 
         />
      )}
    </div>
  );
}

// --- MODAL DE ABONO INTELIGENTE ---
function PaymentModal({ sale, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("EFECTIVO");
  
  // Estados extra para tarjeta
  const [terminals, setTerminals] = useState([]);
  const [terminalId, setTerminalId] = useState("");
  const [cardType, setCardType] = useState("TDD");
  const [installments, setInstallments] = useState("1");
  const [feePercent, setFeePercent] = useState(0);

  useEffect(() => {
    const terms = getTerminals();
    setTerminals(terms);
  }, []);

  // Resetear terminal si cambia método
  useEffect(() => {
    if (method === "TARJETA" && terminals.length > 0 && !terminalId) {
        setTerminalId(terminals[0].id);
        setFeePercent(terminals[0].fee);
    }
  }, [method, terminals]);

  // Lógica de cálculo de comisión (Igual que en SalesPanel)
  const updateFee = (tId, months) => {
    const term = terminals.find(t => t.id === tId);
    if (!term) return 0;
    if (months === "1") return Number(term.fee) || 0;
    return Number(term.rates?.[months]) || Number(term.fee) || 0;
  };

  const handleTerminalChange = (e) => {
    const tId = e.target.value;
    const newFee = updateFee(tId, installments);
    setTerminalId(tId);
    setFeePercent(newFee);
  };

  const handleInstallmentsChange = (e) => {
    const months = e.target.value;
    const newFee = updateFee(terminalId, months);
    setInstallments(months);
    setFeePercent(newFee);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = Number(amount);
    if (val <= 0 || val > sale.balance) return alert("Monto inválido");

    let paymentData = {
        amount: val,
        method: method,
        paidAt: new Date().toISOString()
    };

    // Agregar datos de tarjeta si aplica
    if (method === "TARJETA") {
        if (!terminalId && terminals.length > 0) return alert("Selecciona una terminal");
        
        const term = terminals.find(t => t.id === terminalId);
        const feeAmount = (val * feePercent) / 100;

        paymentData = {
            ...paymentData,
            terminal: term ? term.name : "Desconocida",
            cardType,
            installments,
            feeAmount
        };
    }

    addPaymentToSale(sale.id, paymentData);
    alert("Abono registrado exitosamente");
    onSuccess();
  };

  const calculatedFee = (Number(amount) * feePercent) / 100;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
       <form onSubmit={handleSubmit} style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333", width: "100%", maxWidth: 400 }}>
          <h3 style={{ marginTop: 0, color: "#4ade80" }}>Registrar Abono</h3>
          <p style={{ fontSize: 14, color: "#ccc", marginBottom: 20 }}>
             Cliente: <strong>{sale.patientName}</strong><br/>
             Deuda Actual: <strong style={{color:"#f87171"}}>${sale.balance.toLocaleString()}</strong>
          </p>

          <div style={{ display: "grid", gap: 15, marginBottom: 20 }}>
             <label style={{ display: "block" }}>
                <span style={{ fontSize: 12, color: "#aaa" }}>Monto a abonar ($)</span>
                <input 
                   type="number" 
                   autoFocus
                   value={amount} 
                   onChange={e => setAmount(e.target.value)} 
                   max={sale.balance}
                   style={{ width: "100%", padding: 10, background: "#222", border: "1px solid #4ade80", color: "white", borderRadius: 6, fontSize: "1.2em", fontWeight: "bold" }} 
                />
             </label>
             
             <label style={{ display: "block" }}>
                <span style={{ fontSize: 12, color: "#aaa" }}>Método de Pago</span>
                <select 
                   value={method} 
                   onChange={e => setMethod(e.target.value)}
                   style={{ width: "100%", padding: 10, background: "#222", border: "1px solid #444", color: "white", borderRadius: 6 }} 
                >
                   {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </label>

             {/* OPCIONES DE TARJETA (CONDICIONAL) */}
             {method === "TARJETA" && (
                <div style={{ background: "#0f172a", padding: 10, borderRadius: 6, border: "1px solid #334155", display: "grid", gap: 10 }}>
                   <label style={{ fontSize: 12, color: "#94a3b8" }}>Terminal
                      <select value={terminalId} onChange={handleTerminalChange} style={{ width: "100%", padding: 6, borderRadius: 4, background: "#1e293b", color: "white", border: "1px solid #334155" }}>
                         <option value="">-- Seleccionar --</option>
                         {terminals.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                   </label>
                   
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <label style={{ fontSize: 12, color: "#94a3b8" }}>Tipo
                         <select value={cardType} onChange={e => setCardType(e.target.value)} style={{ width: "100%", padding: 6, borderRadius: 4, background: "#1e293b", color: "white", border: "1px solid #334155" }}>
                            <option value="TDD">Débito</option>
                            <option value="TDC">Crédito</option>
                         </select>
                      </label>
                      <label style={{ fontSize: 12, color: "#94a3b8" }}>Plazo
                         <select value={installments} onChange={handleInstallmentsChange} style={{ width: "100%", padding: 6, borderRadius: 4, background: "#1e293b", color: "white", border: "1px solid #334155" }}>
                            <option value="1">Contado</option>
                            <option value="3">3 Meses</option>
                            <option value="6">6 Meses</option>
                            <option value="9">9 Meses</option>
                            <option value="12">12 Meses</option>
                         </select>
                      </label>
                   </div>
                   <div style={{ fontSize: 11, color: "#f87171", textAlign: "right" }}>
                      Comisión: <strong>${calculatedFee.toLocaleString("es-MX", {minimumFractionDigits:2})}</strong> ({feePercent}%)
                   </div>
                </div>
             )}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
             <button type="button" onClick={onClose} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
             <button type="submit" style={{ background: "#16a34a", color: "white", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>Confirmar Pago</button>
          </div>
       </form>
    </div>
  );
}