import React from "react";
import Badge from "@/components/ui/Badge";

export default function CartList({ cart, onRemove }) {
  if (cart.length === 0) {
      return (
          <div className="flex-1 flex flex-col items-center justify-center text-textMuted py-10 opacity-50">
              <span className="text-4xl mb-2">🛒</span>
              <span className="text-sm">El carrito está vacío</span>
          </div>
      );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 mb-4">
        {cart.map((item, i) => (
            <div key={i} className="group bg-surface border border-border rounded-xl p-3 flex justify-between items-start hover:border-primary/30 transition-colors relative">
                
                {/* Contenido */}
                <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">{item.description}</span>
                        {item.specs?.design && <Badge color="blue" className="text-[10px] py-0">{item.specs.design}</Badge>}
                    </div>
                    
                    {/* Detalles técnicos */}
                    <div className="text-xs text-textMuted space-y-0.5">
                        {item.requiresLab && (
                            <div className="flex gap-2">
                                <span className="text-amber-400">Lab: {item.labName || "Interno"}</span>
                                {item.cost > 0 && <span className="text-red-400/70 opacity-0 group-hover:opacity-100 transition-opacity">Costo: ${item.cost}</span>}
                            </div>
                        )}
                        {item.specs && (item.specs.requiresBisel || item.specs.requiresTallado) && (
                            <div className="text-purple-300/80">
                                {item.specs.requiresBisel && "🛠️ Bisel "}{item.specs.requiresTallado && "⚙️ Tallado"}
                            </div>
                        )}
                    </div>
                </div>

                {/* Precio y Acciones */}
                <div className="text-right">
                    <div className="font-bold text-white">${item.unitPrice.toLocaleString()}</div>
                    <div className="text-xs text-textMuted mb-1">x{item.qty}</div>
                    <button 
                        onClick={() => onRemove(item._tempId)} 
                        className="text-red-400 hover:text-red-300 text-xs font-medium hover:underline p-1 -mr-1"
                    >
                        Quitar
                    </button>
                </div>
            </div>
        ))}
    </div>
  );
}