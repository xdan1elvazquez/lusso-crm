import React, { useState, useEffect, useMemo } from "react";
import { getInventoryAnalysis } from "@/services/inventoryAnalysisService"; // 👈 Asegúrate de haber creado este servicio antes
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import LoadingState from "@/components/LoadingState";
import { 
  ShoppingCart, 
  AlertTriangle, 
  TrendingDown, 
  PackageMinus, 
  Download, 
  RefreshCw 
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function PurchasingPage() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [daysWindow, setDaysWindow] = useState(90); // Analizar últimos 90 días
  const [activeTab, setActiveTab] = useState("critical"); // critical | dead

  useEffect(() => {
    loadData();
  }, [daysWindow]);

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await getInventoryAnalysis(daysWindow);
        setAnalysis(data);
    } catch (error) {
        console.error(error);
        alert("Error cargando inteligencia de inventario.");
    } finally {
        setLoading(false);
    }
  };

  // 💰 KPI: Dinero Estancado (Costo de productos muertos)
  const deadMoney = useMemo(() => {
    if (!analysis) return 0;
    return analysis.deadItems.reduce((sum, item) => sum + ((Number(item.cost) || 0) * Number(item.stock)), 0);
  }, [analysis]);

  // 📄 Generar PDF de Pedido
  const handleExportOrder = () => {
    if (!analysis) return;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Sugerencia de Re-Abastecimiento", 14, 20);
    doc.setFontSize(10);
    doc.text(`Basado en ventas de los últimos ${daysWindow} días`, 14, 26);

    const rows = analysis.criticalItems.map(item => [
        item.description,
        item.stats.dailyVelocity + " / día",
        item.stock,
        item.analysis.suggestion.replace("URGENTE: Comprar ", "") // Solo la cantidad
    ]);

    autoTable(doc, {
        startY: 35,
        head: [['Producto', 'Velocidad Venta', 'Stock Actual', 'Sugerido Comprar']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38] } // Rojo urgente
    });

    doc.save(`Pedido_Sugerido_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="h-full flex flex-col space-y-6 animate-fadeIn">
      
      {/* HEADER & CONTROLES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="text-blue-400" /> Centro de Compras
            </h1>
            <p className="text-slate-400 text-sm">Inteligencia Artificial aplicada a tu stock.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-800 p-1 rounded-lg border border-slate-700">
            {[30, 60, 90, 180].map(d => (
                <button
                    key={d}
                    onClick={() => setDaysWindow(d)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${daysWindow === d ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    {d} Días
                </button>
            ))}
        </div>
      </div>

      {/* KPIS SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* KPI 1: ALERTA CRÍTICA */}
          <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-slate-800 to-slate-900">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-400 text-xs uppercase font-bold mb-1">Stock Crítico</p>
                      <h3 className="text-3xl font-bold text-white">{analysis?.criticalItems.length}</h3>
                      <p className="text-xs text-red-400 mt-1">Productos por agotarse</p>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-lg text-red-500"><AlertTriangle /></div>
              </div>
          </Card>

          {/* KPI 2: DINERO MUERTO */}
          <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-slate-800 to-slate-900">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-400 text-xs uppercase font-bold mb-1">Dinero Estancado</p>
                      <h3 className="text-3xl font-bold text-white">${deadMoney.toLocaleString()}</h3>
                      <p className="text-xs text-amber-400 mt-1">En {analysis?.deadItems.length} productos "Hueso"</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500"><PackageMinus /></div>
              </div>
          </Card>

          {/* KPI 3: SALUD */}
          <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-slate-800 to-slate-900">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-400 text-xs uppercase font-bold mb-1">Inventario Sano</p>
                      <h3 className="text-3xl font-bold text-white">{analysis?.healthyItems.length}</h3>
                      <p className="text-xs text-emerald-400 mt-1">Rotación adecuada</p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500"><RefreshCw /></div>
              </div>
          </Card>
      </div>

      {/* ZONA DE ANÁLISIS */}
      <Card className="flex-1 flex flex-col overflow-hidden">
          {/* TABS INTERNOS */}
          <div className="flex border-b border-slate-700">
              <button 
                onClick={() => setActiveTab("critical")}
                className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === "critical" ? "border-red-500 text-red-400 bg-red-500/5" : "border-transparent text-slate-500 hover:text-white"}`}
              >
                  🚨 Sugerencias de Compra ({analysis?.criticalItems.length})
              </button>
              <button 
                onClick={() => setActiveTab("dead")}
                className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === "dead" ? "border-amber-500 text-amber-400 bg-amber-500/5" : "border-transparent text-slate-500 hover:text-white"}`}
              >
                  💀 Liquidación / Huesos ({analysis?.deadItems.length})
              </button>
          </div>

          <div className="flex-1 overflow-auto p-0 custom-scrollbar">
              
              {/* TABLA: CRITICOS (COMPRAR) */}
              {activeTab === "critical" && (
                  <div>
                      <div className="p-4 bg-red-900/10 border-b border-red-900/20 flex justify-between items-center">
                          <p className="text-xs text-red-200">
                              ⚠️ Estos productos se venden rápido y tienen poco stock. Pídelos ya para no perder ventas.
                          </p>
                          <Button onClick={handleExportOrder} className="bg-red-600 hover:bg-red-500 text-xs h-8">
                              <Download size={14} className="mr-2" /> Descargar PDF Pedido
                          </Button>
                      </div>
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-800 text-slate-400 text-xs uppercase sticky top-0 z-10">
                              <tr>
                                  <th className="p-4">Producto</th>
                                  <th className="p-4 text-center">Stock</th>
                                  <th className="p-4 text-center">Ventas ({daysWindow}d)</th>
                                  <th className="p-4 text-center">Velocidad</th>
                                  <th className="p-4 text-center">Días Restantes</th>
                                  <th className="p-4 text-right">Acción</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-sm">
                              {analysis?.criticalItems.map(item => (
                                  <tr key={item.id} className="hover:bg-slate-800/50">
                                      <td className="p-4 font-medium text-white">{item.description}</td>
                                      <td className="p-4 text-center font-mono text-red-400 font-bold">{item.stock}</td>
                                      <td className="p-4 text-center text-slate-300">{item.stats.soldInPeriod}</td>
                                      <td className="p-4 text-center text-slate-400 text-xs">
                                          {item.stats.dailyVelocity} / día
                                      </td>
                                      <td className="p-4 text-center">
                                          <Badge color="red">{item.stats.daysOfInventory} Días</Badge>
                                      </td>
                                      <td className="p-4 text-right font-bold text-red-300">
                                          {item.analysis.suggestion}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}

              {/* TABLA: HUESOS (LIQUIDAR) */}
              {activeTab === "dead" && (
                  <div>
                      <div className="p-4 bg-amber-900/10 border-b border-amber-900/20">
                          <p className="text-xs text-amber-200">
                              💀 Estos productos tienen stock pero 0 ventas en el periodo. Considera ofertas 2x1 o remates.
                          </p>
                      </div>
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-800 text-slate-400 text-xs uppercase sticky top-0 z-10">
                              <tr>
                                  <th className="p-4">Producto</th>
                                  <th className="p-4 text-center">Stock Parado</th>
                                  <th className="p-4 text-center">Costo Unit.</th>
                                  <th className="p-4 text-center">Dinero Estancado</th>
                                  <th className="p-4 text-center">Días sin Venta</th>
                                  <th className="p-4 text-right">Sugerencia</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-sm">
                              {analysis?.deadItems.map(item => (
                                  <tr key={item.id} className="hover:bg-slate-800/50">
                                      <td className="p-4 font-medium text-white">{item.description}</td>
                                      <td className="p-4 text-center font-mono text-slate-300">{item.stock}</td>
                                      <td className="p-4 text-center text-slate-400">${item.cost || 0}</td>
                                      <td className="p-4 text-center font-bold text-amber-400">
                                          ${((item.cost||0) * item.stock).toLocaleString()}
                                      </td>
                                      <td className="p-4 text-center text-slate-500">
                                          {item.stats.daysSinceLastSale > 900 ? "Nunca" : item.stats.daysSinceLastSale}
                                      </td>
                                      <td className="p-4 text-right">
                                          <Badge color="yellow">Rematar</Badge>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
      </Card>
    </div>
  );
}