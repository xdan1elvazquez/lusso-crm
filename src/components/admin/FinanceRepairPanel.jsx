import React, { useState } from "react";
import { repairSalesBalances, cleanDuplicateWorkOrders } from "@/services/financeRepairService";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function FinanceRepairPanel() {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);

    const runRepair = async () => {
        if (!confirm("⚠️ ¿Estás seguro? Esto modificará saldos y borrará duplicados permanentemente.")) return;
        
        setLoading(true);
        setLogs(["Iniciando diagnóstico..."]);
        
        try {
            // 1. Saldos
            setLogs(prev => [...prev, "Analizando saldos de ventas..."]);
            const balanceResult = await repairSalesBalances();
            setLogs(prev => [...prev, ...balanceResult.logs]);
            setLogs(prev => [...prev, `✅ Se corrigieron ${balanceResult.count} ventas.`]);

            // 2. Duplicados
            setLogs(prev => [...prev, "Buscando órdenes duplicadas..."]);
            const woResult = await cleanDuplicateWorkOrders();
            setLogs(prev => [...prev, ...woResult.logs]);
            setLogs(prev => [...prev, `✅ Se eliminaron ${woResult.count} órdenes duplicadas.`]);

            setLogs(prev => [...prev, "✨ Mantenimiento finalizado con éxito."]);

        } catch (error) {
            console.error(error);
            setLogs(prev => [...prev, `❌ Error crítico: ${error.message}`]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-l-4 border-l-red-500 bg-red-900/10 mb-8">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-red-400">🔧 Herramienta de Reparación Financiera</h3>
                    <p className="text-sm text-textMuted mt-1">
                        Utiliza esto para corregir "Saldos Fantasma" y eliminar "Trabajos Duplicados" creados por el error anterior.
                    </p>
                </div>
                <Button onClick={runRepair} disabled={loading} variant="danger" className="shadow-lg shadow-red-900/20">
                    {loading ? "Reparando..." : "Ejecutar Limpieza"}
                </Button>
            </div>
            
            {logs.length > 0 && (
                <div className="mt-4 p-4 bg-black/40 rounded-xl border border-red-500/20 max-h-40 overflow-y-auto custom-scrollbar font-mono text-xs">
                    {logs.map((l, i) => (
                        <div key={i} className={l.includes("✅") ? "text-emerald-400" : l.includes("❌") ? "text-red-400" : "text-gray-400"}>
                            {l}
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}