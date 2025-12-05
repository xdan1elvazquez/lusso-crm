import React, { useState, useMemo } from "react";

export default function ProductSearch({ products, onAdd }) {
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    if (!query) return [];
    return products.filter(p => p.brand.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  }, [products, query]);

  const handleSelect = (product) => {
    // Clasificación
    const isLabCategory = ["FRAMES", "CONTACT_LENS", "LENSES"].includes(product.category);
    
    onAdd({ 
        kind: isLabCategory ? "FRAMES" : (product.category === "MEDICATION" ? "MEDICATION" : "ACCESSORY"),
        description: `${product.brand} ${product.model}`, 
        qty: 1, 
        unitPrice: product.price,
        cost: product.cost || 0, // 👈 IMPORTANTE: Pasamos el costo para reportes financieros
        inventoryProductId: product.id, 
        taxable: product.taxable,
        requiresLab: isLabCategory 
    });
    setQuery("");
  };

  return (
    <div style={{ position: "relative", marginBottom: 15 }}>
      <label style={{ fontSize: 12, color: "#aaa", display:"block", marginBottom:5 }}>Agregar otro producto</label>
      <input 
        value={query} 
        onChange={e => setQuery(e.target.value)} 
        placeholder="Escribe marca, modelo o categoría..." 
        style={{ width: "100%", padding: 10, background: "#222", color: "white", border: "1px solid #444", borderRadius: 6 }} 
      />
      {filteredProducts.length > 0 && (
        <div style={{ position: "absolute", zIndex: 50, background: "#333", border: "1px solid #555", width: "100%", borderRadius: 6, marginTop: 4, overflow: "hidden", maxHeight: 200, overflowY: "auto" }}>
          {filteredProducts.map(p => (
            <div 
                key={p.id} 
                onClick={() => handleSelect(p)} 
                style={{ padding: 10, cursor: "pointer", borderBottom: "1px solid #444", display:"flex", justifyContent:"space-between" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#444"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div>
                  <div>{p.brand} {p.model}</div>
                  <div style={{fontSize:10, color:"#888"}}>{p.category}</div>
              </div>
              <span style={{ color: "#4ade80" }}>${p.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}