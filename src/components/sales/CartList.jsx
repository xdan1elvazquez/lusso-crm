import React, { useState } from "react";
import Badge from "@/components/ui/Badge";

// Subcomponente de Fila para manejar el estado de edición individualmente
const CartItemRow = ({ item, onRemove, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editPrice, setEditPrice] = useState(item.unitPrice);
    const [reason, setReason] = useState(item.overrideReason || "");

    const handleSave = () => {
        const numPrice = parseFloat(editPrice);
        if (isNaN(numPrice) || numPrice < 0) return;
        
        onUpdate(item.id, { 
            unitPrice: numPrice, 
            overrideReason: reason || "Ajuste manual" 
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditPrice(item.unitPrice);
        setReason(item.overrideReason || "");
        setIsEditing(false);
    };

    const hasOverride = item.isPriceOverridden; // Flag calculado en usePOS

    return (
        <div className="group bg-surface border border-border rounded-xl p-3 flex justify-between items-start hover:border-primary/30 transition-colors relative">
            {/* Contenido */}
            <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">{item.description}</span>
                    {item.specs?.design && <Badge color="blue" className="text-[10px] py-0">{item.specs.design}</Badge>}
                    {hasOverride && <Badge color="yellow" className="text-[10px] py-0">Precio Editado</Badge>}
                </div>
                
                {/* Detalles técnicos */}
                <div className="text-xs text-textMuted space-y-0.5">
                    {item.requiresLab && (
                        <div className="flex gap-2">
                            <span className="text-amber-400">Lab: {item.labName || "Interno"}</span>
                            {/* Mostrar precio original si hubo cambio */}
                            {hasOverride && (
                                <span className="text-textMuted line-through decoration-red-400">
                                    Base: ${item.originalPrice?.toLocaleString()}
                                </span>
                            )}
                        </div>
                    )}
                    {item.specs && (item.specs.requiresBisel || item.specs.requiresTallado) && (
                        <div className="text-purple-300/80">
                            {item.specs.requiresBisel && "🛠️ Bisel "}{item.specs.requiresTallado && "⚙️ Tallado"}
                        </div>
                    )}
                    {hasOverride && item.overrideReason && (
                        <div className="text-yellow-400/70 italic">Nota: {item.overrideReason}</div>
                    )}
                </div>
            </div>

            {/* Precio y Acciones */}
            <div className="text-right flex flex-col items-end">
                {isEditing ? (
                    <div className="flex flex-col gap-1 items-end bg-black/20 p-2 rounded border border-primary/30 z-10">
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-textMuted">$</span>
                            <input 
                                type="number" 
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-20 bg-surface border border-border rounded px-1 py-0.5 text-sm text-right focus:border-primary outline-none"
                            />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Razón..." 
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-24 bg-surface border border-border rounded px-1 py-0.5 text-[10px] text-right focus:border-primary outline-none mb-1"
                        />
                        <div className="flex gap-2">
                            <button onClick={handleCancel} className="text-xs text-red-400 hover:text-white">✕</button>
                            <button onClick={handleSave} className="text-xs text-emerald-400 hover:text-white font-bold">✓</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div 
                            className={`font-bold text-sm cursor-pointer hover:text-primary flex items-center gap-1 ${hasOverride ? "text-yellow-400" : "text-white"}`}
                            onClick={() => setIsEditing(true)}
                            title="Click para editar precio"
                        >
                            ${item.unitPrice.toLocaleString()}
                            <span className="text-[10px] opacity-0 group-hover:opacity-50">✎</span>
                        </div>
                        <div className="text-xs text-textMuted mb-1">x{item.qty}</div>
                        <button 
                            onClick={() => onRemove(item.id)} 
                            className="text-red-400 hover:text-red-300 text-xs font-medium hover:underline p-1 -mr-1"
                        >
                            Quitar
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default function CartList({ cart, onRemove, onUpdate }) {
  // onUpdate ahora debe ser pasado desde el componente padre (SalesPanel -> usePOS)
  
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
        {cart.map((item) => (
            <CartItemRow 
                key={item.id || item._tempId} 
                item={item} 
                onRemove={onRemove} 
                onUpdate={onUpdate}
            />
        ))}
    </div>
  );
}