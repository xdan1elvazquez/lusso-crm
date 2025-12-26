import React, { useState, useMemo } from "react";
import { formatMoney } from "@/utils/currency"; // ✅ Ahora sí existe y la usamos
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Printer, Eye, ChevronDown, ChevronUp, ShoppingBag, Glasses } from 'lucide-react';

export default function PatientSalesHistory({ sales = [], onViewSale, onPrint }) {
  const [filter, setFilter] = useState("ALL"); // ALL, LAB, SIMPLE
  const [limit, setLimit] = useState(10);
  const [expandedId, setExpandedId] = useState(null);

  // 1. Filtrado
  const filteredSales = useMemo(() => {
    if (filter === "ALL") return sales;
    if (filter === "LAB") return sales.filter(s => s.saleType === "LAB");
    if (filter === "SIMPLE") return sales.filter(s => s.saleType !== "LAB");
    return sales;
  }, [sales, filter]);

  // 2. Paginación
  const visibleSales = filteredSales.slice(0, limit);
  const hasMore = visibleSales.length < filteredSales.length;

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // Helper de estatus
  const getStatusBadge = (status, balance) => {
    if (status === "CANCELLED") return <Badge color="red">CANCELADA</Badge>;
    if (balance <= 0.01) return <Badge color="green">PAGADA</Badge>;
    return <Badge color="yellow">PENDIENTE</Badge>;
  };

  const formatDate = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("es-MX", { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
    });
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER Y FILTROS */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-border pb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
           📜 Historial de Ventas 
           <span className="text-xs bg-surfaceHighlight px-2 py-0.5 rounded-full text-textMuted">{filteredSales.length}</span>
        </h3>
        
        <div className="flex bg-surfaceHighlight p-1 rounded-lg">
            <button 
                onClick={() => setFilter("ALL")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filter==="ALL" ? "bg-primary text-white shadow" : "text-textMuted hover:text-white"}`}
            >
                Todas
            </button>
            <button 
                onClick={() => setFilter("SIMPLE")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${filter==="SIMPLE" ? "bg-primary text-white shadow" : "text-textMuted hover:text-white"}`}
            >
                <ShoppingBag size={12}/> Generales
            </button>
            <button 
                onClick={() => setFilter("LAB")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${filter==="LAB" ? "bg-primary text-white shadow" : "text-textMuted hover:text-white"}`}
            >
                <Glasses size={12}/> Lentes
            </button>
        </div>
      </div>

      {/* LISTA DE CARDS */}
      <div className="space-y-3">
        {visibleSales.length === 0 ? (
            <div className="text-center py-10 text-textMuted bg-surfaceHighlight/10 rounded-xl border border-dashed border-border">
                No hay ventas en esta categoría.
            </div>
        ) : (
            visibleSales.map((sale) => {
                const isExpanded = expandedId === sale.id;
                const isLab = sale.saleType === "LAB";
                
                // 🟢 LÓGICA FOLIO: Priorizamos el folio secuencial, si no, el ID corto
                const folioDisplay = sale.folio || sale.id.slice(0, 8).toUpperCase();

                return (
                    <div key={sale.id} className={`bg-surface border ${isExpanded ? "border-primary/50" : "border-border"} rounded-xl transition-all hover:border-border/80 overflow-hidden`}>
                        {/* RESUMEN (Siempre visible) */}
                        <div 
                            onClick={() => toggleExpand(sale.id)}
                            className="p-4 flex flex-col md:flex-row items-center gap-4 cursor-pointer bg-surfaceHighlight/20 hover:bg-surfaceHighlight/40 transition-colors"
                        >
                            {/* Icono Tipo */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isLab ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                                {isLab ? <Glasses size={20} /> : <ShoppingBag size={20} />}
                            </div>

                            {/* Info Principal */}
                            <div className="flex-1 text-center md:text-left min-w-0">
                                <div className="font-bold text-white truncate">
                                    {sale.description || (isLab ? "Venta Óptica" : "Venta Mostrador")}
                                </div>
                                <div className="text-xs text-textMuted flex flex-col md:flex-row gap-1 md:gap-3 items-center md:items-start justify-center md:justify-start mt-1">
                                    {/* 🟢 MOSTRAR FOLIO AQUÍ */}
                                    <span className="font-mono font-bold text-blue-300 bg-blue-500/10 px-1.5 rounded border border-blue-500/20">
                                        #{folioDisplay}
                                    </span>
                                    <span className="hidden md:inline">•</span>
                                    <span>📅 {formatDate(sale.createdAt)}</span>
                                    <span className="hidden md:inline">•</span>
                                    <span>👤 {sale.soldBy || "Desconocido"}</span>
                                    {sale.boxNumber && (
                                        <>
                                            <span className="hidden md:inline">•</span>
                                            <span className="text-yellow-500/80">Ref: {sale.boxNumber}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Estatus y Total */}
                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                <div className="text-right">
                                    {getStatusBadge(sale.status, sale.balance)}
                                    {sale.balance > 0.01 && sale.status !== "CANCELLED" && (
                                        <div className="text-[10px] text-red-400 font-bold mt-1">
                                            Resta: {formatMoney(sale.balance)}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right min-w-[80px]">
                                    <div className="text-lg font-bold text-white">{formatMoney(sale.total)}</div>
                                </div>
                                <div className="text-textMuted">
                                    {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                </div>
                            </div>
                        </div>

                        {/* DETALLE EXPANDIBLE */}
                        {isExpanded && (
                            <div className="p-4 border-t border-border bg-black/20 text-sm animate-fadeIn">
                                {/* Tabla Items Simplificada */}
                                <div className="mb-4">
                                    <table className="w-full text-left text-xs text-textMuted">
                                        <thead>
                                            <tr className="border-b border-border/50">
                                                <th className="py-2">Cant</th>
                                                <th className="py-2">Producto / Servicio</th>
                                                <th className="py-2 text-right">Precio</th>
                                                <th className="py-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sale.items?.map((item, idx) => (
                                                <tr key={idx} className="border-b border-border/10">
                                                    <td className="py-2">{item.qty}</td>
                                                    <td className="py-2 text-white">
                                                        {item.description}
                                                        {item.specs && (
                                                            <div className="text-[10px] text-blue-300">
                                                                {item.specs.material} • {item.specs.design}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-2 text-right">{formatMoney(item.unitPrice)}</td>
                                                    <td className="py-2 text-right font-medium text-slate-300">{formatMoney(item.qty * item.unitPrice)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {/* Resumen Pagos */}
                                <div className="flex justify-between items-end bg-surfaceHighlight/30 p-3 rounded-lg">
                                    <div className="text-xs space-y-1">
                                        <div className="font-bold text-textMuted uppercase">Historial Pagos</div>
                                        {sale.payments?.map((p, i) => (
                                            <div key={i}>• {formatDate(p.paidAt).slice(0,10)}: <span className="text-white font-medium">{formatMoney(p.amount)}</span> <span className="text-textMuted">({p.method})</span></div>
                                        ))}
                                        {(!sale.payments || sale.payments.length === 0) && <div>Sin pagos registrados</div>}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="secondary" 
                                            className="h-8 text-xs gap-2"
                                            onClick={(e) => { e.stopPropagation(); onPrint(e, sale); }}
                                        >
                                            <Printer size={14} /> Ticket
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 text-xs gap-2 text-blue-400 hover:text-blue-300"
                                            onClick={(e) => { e.stopPropagation(); onViewSale(sale); }}
                                        >
                                            <Eye size={14} /> Ver Completo
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })
        )}
      </div>

      {/* VER MÁS */}
      {hasMore && (
        <div className="flex justify-center pt-2">
            <Button variant="ghost" onClick={() => setLimit(prev => prev + 10)} className="text-textMuted hover:text-white">
                Ver más ventas anteriores
            </Button>
        </div>
      )}
    </div>
  );
}