import { useState, useMemo, useEffect } from "react";
import { getAllSales, addPaymentToSale } from "@/services/salesStorage";
// Ya no importamos getPatients ni getTerminals para esta vista optimizada
import LoadingState from "@/components/LoadingState";

const PAYMENT_METHODS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"];

export default function ReceivablesPage() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);

  const refreshData = async () => {
      setLoading(true);
      try {
          const sData = await getAllSales();
          setSales(sData);
      } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { refreshData(); }, []);

  const debtors = useMemo(() => {
    return sales
      .filter(s => s.balance > 0.01)
      .map(s => ({
        ...s,
        // ⚡ OPTIMIZACIÓN: Usar nombre denormalizado
        patientName: s.patientName || "Paciente (Histórico)",
        // Si no guardamos teléfono en la venta, lo dejamos vacío o genérico para no romper el rendimiento
        phone: "" 
      }))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [sales]);

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

  if (loading) return <LoadingState />;

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
            onSuccess={() => { refreshData(); setSelectedSale(null); }} 
         />
      )}
    </div>
  );
}

function PaymentModal({ sale, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("EFECTIVO");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Number(amount) <= 0 || Number(amount) > sale.balance) return alert("Monto inválido");
    try {
        await addPaymentToSale(sale.id, { amount: Number(amount), method, paidAt: new Date().toISOString() });
        alert("Abono registrado");
        onSuccess();
    } catch (e) { alert(e.message); }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
       <form onSubmit={handleSubmit} style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333", width: "100%", maxWidth: 400 }}>
          <h3>Registrar Abono</h3>
          <p style={{color:"#aaa", fontSize:"0.9em", marginBottom:15}}>Cliente: {sale.patientName}</p>
          <input type="number" autoFocus value={amount} onChange={e => setAmount(e.target.value)} style={{width:"100%", padding:10, marginBottom:10}} placeholder="Monto" />
          <select value={method} onChange={e => setMethod(e.target.value)} style={{width:"100%", padding:10, marginBottom:10}}>{PAYMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select>
          <div style={{display:"flex", gap:10, justifyContent:"flex-end"}}><button type="button" onClick={onClose} style={{cursor:"pointer"}}>Cancelar</button><button type="submit" style={{cursor:"pointer", fontWeight:"bold"}}>Confirmar</button></div>
       </form>
    </div>
  );
}