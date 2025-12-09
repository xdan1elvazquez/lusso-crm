import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // 👈 1. Importar Auth
import { getAllWorkOrders, updateWorkOrder } from "@/services/workOrdersStorage";
import { getAllSupplierDebts, markDebtAsPaid } from "@/services/supplierDebtsStorage";
import { getSuppliers } from "@/services/suppliersStorage";
import { getPatients } from "@/services/patientsStorage";
import { createExpense } from "@/services/expensesStorage";
import LoadingState from "@/components/LoadingState";
import { useNotify, useConfirm } from "@/context/UIContext";

// UI Kit
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ModalWrapper from "@/components/ui/ModalWrapper";

export default function PayablesPage() {
  const { user } = useAuth(); // 👈 2. Obtener usuario
  const notify = useNotify();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  
  const [orders, setOrders] = useState([]);
  const [supplierDebts, setSupplierDebts] = useState([]);
  const [patients, setPatients] = useState([]);
  
  const [payTarget, setPayTarget] = useState(null);

  const refreshData = async () => {
      // Seguridad
      if (!user?.branchId) return;

      setLoading(true);
      try {
          // 👈 3. Filtrar deudas por sucursal
          // Nota: Asegúrate de que getAllSupplierDebts acepte branchId en el servicio,
          // si no lo has actualizado aún, solo ignorará el parámetro (sin romper nada).
          const [wo, deb, pat] = await Promise.all([
              getAllWorkOrders(user.branchId),
              getAllSupplierDebts(user.branchId), 
              getPatients(),
          ]);
          setOrders(wo);
          setSupplierDebts(deb);
          setPatients(pat);
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { 
      if (user?.branchId) refreshData(); 
  }, [user]);

  const patientMap = useMemo(() => patients.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}), [patients]);

  const allDebts = useMemo(() => {
    // Deudas de Laboratorio (Work Orders no pagadas)
    const labDebts = orders
        .filter(w => w.labCost > 0 && !w.isPaid && w.status !== "CANCELLED")
        .map(w => ({
          ...w, 
          uniqueId: `WO-${w.id}`, 
          source: 'WORK_ORDER', 
          title: w.labName || "Lab Externo", 
          subtitle: `Px: ${patientMap[w.patientId]?.firstName || ""} · ${w.type}`, 
          amount: w.labCost, 
          date: w.createdAt,
          typeLabel: "Laboratorio"
        }));
    
    // Deudas de Proveedores
    const supplyDebts = supplierDebts
        .filter(d => !d.isPaid)
        .map(d => ({
          ...d, 
          uniqueId: `SUP-${d.id}`, 
          source: 'SUPPLIER', 
          title: d.provider, 
          subtitle: d.concept, 
          amount: d.amount, 
          date: d.createdAt,
          typeLabel: "Proveedor"
        }));
        
    return [...labDebts, ...supplyDebts].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [orders, supplierDebts, patientMap]);

  const totalDebt = allDebts.reduce((sum, d) => sum + d.amount, 0);

  const handlePay = async (method) => {
      if (!payTarget) return;

      try {
          // 👈 4. Registrar gasto en la sucursal correcta
          await createExpense({
            description: `Pago ${payTarget.source === 'WORK_ORDER' ? 'Lab' : 'Prov'}: ${payTarget.title} (${payTarget.subtitle})`,
            amount: payTarget.amount,
            category: payTarget.category || "COSTO_VENTA",
            method: method,
            date: new Date().toISOString()
          }, user.branchId);

          if (payTarget.source === 'WORK_ORDER') await updateWorkOrder(payTarget.id, { isPaid: true });
          else await markDebtAsPaid(payTarget.id);

          setPayTarget(null);
          refreshData();
          notify.success("Pago registrado correctamente");
      } catch (error) {
          notify.error("Error al pagar: " + error.message);
      }
  };

  if (loading) return <LoadingState />;

  return (
      <div className="page-container space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Cuentas por Pagar</h1>
                <p className="text-textMuted text-sm">
                    Compromisos en <strong className="text-red-400">{user.branchId === 'lusso_main' ? 'Matriz' : 'Sucursal'}</strong>
                </p>
            </div>
            <Card noPadding className="px-6 py-3 bg-surfaceHighlight/20 border-red-500/30">
                <div className="text-xs text-textMuted uppercase font-bold tracking-wider">Total Deuda Local</div>
                <div className="text-2xl font-bold text-red-400">${totalDebt.toLocaleString()}</div>
            </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {allDebts.length === 0 && (
                 <div className="col-span-full py-20 text-center text-textMuted bg-surface rounded-xl border border-border">
                     No hay deudas pendientes en esta sucursal.
                 </div>
             )}

             {allDebts.map(d => (
                 <Card key={d.uniqueId} className="hover:border-red-500/50 transition-colors group relative" noPadding>
                    <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <Badge color={d.source === 'WORK_ORDER' ? "blue" : "purple"} className="mb-2">{d.typeLabel}</Badge>
                                <div className="font-bold text-white text-lg truncate" title={d.title}>{d.title}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-bold text-red-400">${d.amount.toLocaleString()}</div>
                            </div>
                        </div>
                        
                        <div className="bg-background rounded-lg p-2 text-xs text-textMuted mb-4 border border-border">
                            <div className="font-bold text-white mb-0.5 truncate">{d.subtitle}</div>
                            <div>{new Date(d.date).toLocaleDateString()}</div>
                        </div>
                        
                        <Button onClick={() => setPayTarget(d)} className="w-full shadow-lg shadow-red-500/10" variant="secondary">
                            Pagar Deuda
                        </Button>
                    </div>
                 </Card>
             ))}
        </div>

        {/* MODAL DE PAGO SIMPLE */}
        {payTarget && (
            <ModalWrapper title="Confirmar Pago" onClose={() => setPayTarget(null)} width="400px">
                <div className="space-y-4">
                    <div className="text-center py-4">
                        <div className="text-sm text-textMuted mb-1">Vas a pagar a <strong className="text-white">{payTarget.title}</strong></div>
                        <div className="text-3xl font-bold text-white">${payTarget.amount.toLocaleString()}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {["EFECTIVO", "TRANSFERENCIA", "TARJETA", "CHEQUE"].map(m => (
                            <Button key={m} onClick={() => handlePay(m)} variant="secondary" className="text-xs">
                                {m}
                            </Button>
                        ))}
                    </div>
                    <Button onClick={() => setPayTarget(null)} variant="ghost" className="w-full mt-2">Cancelar</Button>
                </div>
            </ModalWrapper>
        )}
      </div>
  );
}