import React, { useState, useMemo } from "react";
// UI Components
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

export default function ProductSearch({ products, onAdd }) {
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    if (!query) return [];
    return products.filter(p => 
        p.brand.toLowerCase().includes(query.toLowerCase()) || 
        p.model.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  }, [products, query]);

  const handleSelect = (product) => {
    const isLabCategory = ["FRAMES", "CONTACT_LENS", "LENSES"].includes(product.category);
    
    onAdd({ 
        kind: isLabCategory ? "FRAMES" : (product.category === "MEDICATION" ? "MEDICATION" : "ACCESSORY"),
        description: `${product.brand} ${product.model}`, 
        qty: 1, 
        unitPrice: product.price,
        cost: product.cost || 0, 
        inventoryProductId: product.id, 
        taxable: product.taxable,
        requiresLab: isLabCategory 
    });
    setQuery("");
  };

  return (
    <div className="relative mb-6 z-20">
      <Input 
        label="Agregar producto rápido"
        value={query} 
        onChange={e => setQuery(e.target.value)} 
        placeholder="Escribe marca, modelo o código..." 
        className="bg-surface border-primary/30 focus:border-primary"
      />
      
      {/* Dropdown de Resultados */}
      {filteredProducts.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out]">
          {filteredProducts.map(p => (
            <div 
                key={p.id} 
                onClick={() => handleSelect(p)} 
                className="p-3 cursor-pointer border-b border-border last:border-0 hover:bg-surfaceHighlight transition-colors group flex justify-between items-center"
            >
              <div>
                  <div className="font-bold text-textMain group-hover:text-white">
                      {p.brand} <span className="font-normal text-textMuted">{p.model}</span>
                  </div>
                  <div className="mt-1">
                      <Badge color="gray" className="text-[10px]">{p.category}</Badge>
                  </div>
              </div>
              <span className="text-emerald-400 font-bold tracking-tight">
                  ${p.price.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}