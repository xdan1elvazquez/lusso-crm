import React from "react";

export default function CartList({ cart, onRemove }) {
  return (
    <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 20 }}>
        {cart.map((item, i) => (
            <div key={i} style={{ background: "#222", padding: 8, borderRadius: 4, marginBottom: 5, borderLeft: item.specs?.design ? "3px solid #60a5fa" : "3px solid transparent" }}>
                <div style={{display:"flex", justifyContent:"space-between", fontSize:13}}>
                    <span>{item.description}</span>
                    <button onClick={() => onRemove(item._tempId)} style={{color:"red", background:"none", border:"none", cursor:"pointer"}}>✕</button>
                </div>
                
                {/* Costo interno (visible solo para admin/demo) */}
                {item.cost > 0 && <div style={{fontSize:10, color:"#f87171"}}>Costo Lab: ${item.cost}</div>}
                
                {/* Detalles de servicios */}
                {item.specs && (item.specs.requiresBisel || item.specs.requiresTallado) && (
                    <div style={{fontSize:10, color:"#bfdbfe", marginTop:2}}>
                        Servicios: {item.specs.requiresBisel && "🛠️ Bisel "} {item.specs.requiresTallado && "⚙️ Tallado"}
                    </div>
                )}

                <div style={{textAlign:"right", fontWeight:"bold"}}>${item.unitPrice.toLocaleString()}</div>
            </div>
        ))}
        {cart.length === 0 && <div style={{color:"#666", textAlign:"center", padding:10, fontStyle:"italic"}}>Carrito vacío</div>}
    </div>
  );
}