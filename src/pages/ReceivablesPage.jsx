import { useState, useMemo, useEffect } from "react";
import { getAllSales, addPaymentToSale } from "@/services/salesStorage";
import LoadingState from "@/components/LoadingState";
import { useNotify } from "@/context/UIContext";

// UI Kit
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ModalWrapper from "@/components/ui/ModalWrapper";

const PAYMENT_METHODS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"];

export default function ReceivablesPage() {
  const notify = useNotify();
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
        patientName: s.patientName || "Paciente (Histórico)",
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
    <div className="page-container space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Cuentas por Cobrar</h1>
            <p className="text-textMuted text-sm">Créditos y saldos pendientes de clientes</p>
        </div>
        <Card noPadding className="px-6 py-3 bg-surfaceHighlight/20 border-emerald-500/30">
            <div className="text-xs text-textMuted uppercase font-bold tracking-wider">Total Cartera Vencida</div>
            <div className="text-2xl font-bold text-emerald-400">${totalDebt.toLocaleString()}</div>
        </Card>
      </div>

      <Input 
        placeholder="🔍 Buscar deudor por nombre o folio..." 
        value={query} 
        onChange={e => setQuery(e.target.value)} 
        className="bg-surface"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center text-textMuted bg-surface rounded-xl border border-border">
             🎉 ¡Felicidades! No hay cuentas pendientes.
          </div>
        )}
        
        {filtered.map(sale => (
            <Card key={sale.id} className="hover:border-emerald-500/50 transition-colors group relative" noPadding>
               <div className="p-5">
                   <div className="flex justify-between items-start mb-2">
                       <div>
                           <div className="font-bold text-white text-lg truncate" title={sale.patientName}>{sale.patientName}</div>
                           <div className="text-xs text-textMuted mt-1">Folio #{sale.id.slice(0,6)}</div>
                       </div>
                       <div className="text-right">
                           <div className="text-xs text-textMuted">Debe</div>
                           <div className="text-xl font-bold text-red-400">${sale.balance.toLocaleString()}</div>
                       </div>
                   </div>
                   
                   <div className="bg-background rounded-lg p-2 text-xs text-textMuted mb-4 border border-border">
                       {sale.description || "Venta General"} · {new Date(sale.createdAt).toLocaleDateString()}
                   </div>
                   
                   <Button onClick={() => setSelectedSale(sale)} className="w-full shadow-lg shadow-emerald-500/10" variant="primary">
                       💰 Abonar
                   </Button>
               </div>
            </Card>
        ))}
      </div>

      {selectedSale && (
         <PaymentModal 
            sale={selectedSale} 
            onClose={() => setSelectedSale(null)} 
            onSuccess={() => { refreshData(); setSelectedSale(null); notify.success("Abono registrado exitosamente"); }} 
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
        onSuccess();
    } catch (e) { alert(e.message); }
  };

  return (
    <ModalWrapper title="Registrar Abono" onClose={onClose} width="400px">
       <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-surfaceHighlight/20 p-4 rounded-xl border border-border mb-4">
              <div className="text-xs text-textMuted uppercase mb-1">Cliente</div>
              <div className="font-bold text-white text-lg">{sale.patientName}</div>
              <div className="text-xs text-red-400 mt-1">Saldo Actual: ${sale.balance.toLocaleString()}</div>
          </div>
          
          <Input label="Monto a Abonar" type="number" autoFocus value={amount} onChange={e => setAmount(e.target.value)} />
          <Select label="Método de Pago" value={method} onChange={e => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}
          </Select>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Confirmar Abono</Button>
          </div>
       </form>
    </ModalWrapper>
  );
}