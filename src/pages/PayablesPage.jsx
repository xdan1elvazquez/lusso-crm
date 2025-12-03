import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllWorkOrders, updateWorkOrder } from "@/services/workOrdersStorage";
import { getAllSupplierDebts, createSupplierDebt, markDebtAsPaid, deleteSupplierDebt } from "@/services/supplierDebtsStorage";
import { getSuppliers } from "@/services/suppliersStorage";
import { getPatients } from "@/services/patientsStorage";
import { createExpense } from "@/services/expensesStorage";
import LoadingState from "@/components/LoadingState";

export default function PayablesPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [supplierDebts, setSupplierDebts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  const [payModal, setPayModal] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const refreshData = async () => {
      setLoading(true);
      try {
          const [wo, deb, pat, sup] = await Promise.all([
              getAllWorkOrders(),
              getAllSupplierDebts(),
              getPatients(),
              getSuppliers()
          ]);
          setOrders(wo);
          setSupplierDebts(deb);
          setPatients(pat);
          setSuppliers(sup);
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { refreshData(); }, []);

  const patientMap = useMemo(() => patients.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}), [patients]);

  const allDebts = useMemo(() => {
    const labDebts = orders.filter(w => w.labCost > 0 && !w.isPaid && w.status !== "CANCELLED").map(w => ({
          ...w, uniqueId: `WO-${w.id}`, source: 'WORK_ORDER', title: w.labName || "Lab Externo", subtitle: `Px: ${patientMap[w.patientId]?.firstName || ""} · ${w.type}`, amount: w.labCost, date: w.createdAt
      }));
    const supplyDebts = supplierDebts.filter(d => !d.isPaid).map(d => ({
          ...d, uniqueId: `SUP-${d.id}`, source: 'SUPPLIER', title: d.provider, subtitle: d.concept, amount: d.amount, date: d.createdAt
      }));
    return [...labDebts, ...supplyDebts].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [orders, supplierDebts, patientMap]);

  const totalDebt = allDebts.reduce((sum, d) => sum + d.amount, 0);

  const handlePay = async (debt, method) => {
      await createExpense({
        description: `Pago ${debt.source === 'WORK_ORDER' ? 'Lab' : 'Prov'}: ${debt.title} (${debt.subtitle})`,
        amount: debt.amount,
        category: debt.category || "COSTO_VENTA",
        method: method,
        date: new Date().toISOString()
      });

      if (debt.source === 'WORK_ORDER') await updateWorkOrder(debt.id, { isPaid: true });
      else await markDebtAsPaid(debt.id);

      setPayModal(null);
      refreshData();
  };

  // ... (Resto de handlers y renderizado igual que la versión anterior) ...
  
  if (loading) return <LoadingState />;

  return (
      // ... (JSX igual que versión anterior, usando allDebts) ...
      // Te ahorro el JSX repetitivo, es el mismo que tenías.
      <div style={{ width: "100%", paddingBottom: 40 }}>
        <h1>Cuentas por Pagar</h1>
        {/* ... */}
        <div style={{ display: "grid", gap: 10 }}>
             {allDebts.map(d => (
                 <div key={d.uniqueId} style={{background:"#1a1a1a", padding:15, border:"1px solid #333", borderRadius:10}}>
                    <div style={{display:"flex", justifyContent:"space-between"}}>
                        <strong>{d.title}</strong>
                        <span>${d.amount.toLocaleString()}</span>
                    </div>
                    <button onClick={() => setPayModal(d)} style={{marginTop:10}}>Pagar</button>
                 </div>
             ))}
        </div>
      </div>
  );
}