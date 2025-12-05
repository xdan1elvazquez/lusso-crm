import React, { useState, useEffect, useMemo } from "react";
import { getAllProducts } from "@/services/inventoryStorage";

export default function PrescriptionBuilder({ onAdd }) {
  const [query, setQuery] = useState(""); const [selectedMed, setSelectedMed] = useState(null); const [manualName, setManualName] = useState("");
  const [type, setType] = useState("DROPS"); const [dose, setDose] = useState("1"); const [freq, setFreq] = useState("8"); const [duration, setDuration] = useState("7"); const [eye, setEye] = useState("AO"); 
  const [products, setProducts] = useState([]);

  useEffect(() => {
      getAllProducts().then(setProducts).catch(console.error);
  }, []);

  const filteredMeds = useMemo(() => { if (!query) return []; const q = query.toLowerCase(); return products.filter(p => p.category === "MEDICATION" && (p.brand.toLowerCase().includes(q) || p.model.toLowerCase().includes(q))).slice(0, 5); }, [products, query]);
  
  const handleSelectMed = (prod) => { setSelectedMed(prod); setManualName(`${prod.brand} ${prod.model}`); setQuery(""); if (prod.tags?.presentation) setType(prod.tags.presentation); };
  const generateLine = () => {
    const name = selectedMed ? `${selectedMed.brand} ${selectedMed.model}` : manualName; if (!name) return;
    let instruction = ""; if (type === "DROPS") instruction = `Aplicar ${dose} gota(s) en ${eye} cada ${freq} hrs por ${duration} días.`; else if (type === "OINTMENT") instruction = `Aplicar ${dose} cm en fondo de saco ${eye} cada ${freq} hrs por ${duration} días.`; else if (type === "ORAL") instruction = `Tomar ${dose} (tab/cap) cada ${freq} hrs por ${duration} días.`; else instruction = `Aplicar cada ${freq} hrs por ${duration} días.`;
    onAdd(`• ${name}: ${instruction}`, selectedMed ? { productId: selectedMed.id, productName: `${selectedMed.brand} ${selectedMed.model}`, qty: 1, price: selectedMed.price, instructions: instruction } : null);
    setManualName(""); setSelectedMed(null);
  };
  return (
    <div style={{ background: "#222", border: "1px solid #444", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: "bold", marginBottom: 8 }}>⚡ Agregar Medicamento Rápido</div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input placeholder="Buscar en farmacia o escribir nombre..." value={selectedMed ? `${selectedMed.brand} ${selectedMed.model}` : manualName || query} onChange={e => { setQuery(e.target.value); setManualName(e.target.value); setSelectedMed(null); }} style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #555", background: "#333", color: "white" }} />
        {selectedMed && <span style={{ position: "absolute", right: 10, top: 8, fontSize: 11, color: Number(selectedMed.stock) > 0 ? "#4ade80" : "#f87171", fontWeight: "bold" }}>{Number(selectedMed.stock) > 0 ? `✅ Stock: ${selectedMed.stock}` : `⚠️ Stock: 0`}</span>}
        {query && filteredMeds.length > 0 && !selectedMed && (<div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#333", border: "1px solid #555", zIndex: 10, maxHeight: 150, overflowY: "auto" }}>{filteredMeds.map(p => (<div key={p.id} onClick={() => handleSelectMed(p)} style={{ padding: 8, borderBottom: "1px solid #444", cursor: "pointer", fontSize: 13, display: "flex", justifyContent: "space-between" }}><div>{p.brand} {p.model}</div><div style={{ fontSize: 11, color: Number(p.stock) > 0 ? "#4ade80" : "#f87171", fontWeight: "bold" }}>{Number(p.stock) > 0 ? `Stock: ${p.stock}` : "Agotado"}</div></div>))}</div>)}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
         <label style={{fontSize:11, color:"#aaa"}}>Tipo<select value={type} onChange={e => setType(e.target.value)} style={{display:"block", padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}}><option value="DROPS">Gotas</option><option value="OINTMENT">Ungüento</option><option value="ORAL">Oral</option><option value="OTHER">Otro</option></select></label>
         {(type === "DROPS" || type === "OINTMENT") && <label style={{fontSize:11, color:"#aaa"}}>Ojo<select value={eye} onChange={e => setEye(e.target.value)} style={{display:"block", padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}}><option value="AO">AO</option><option value="OD">OD</option><option value="OI">OI</option></select></label>}
         <input value={dose} onChange={e => setDose(e.target.value)} style={{display:"block", width:40, padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}} placeholder="Cant" />
         <input value={freq} onChange={e => setFreq(e.target.value)} style={{display:"block", width:40, padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}} placeholder="Hrs" />
         <input value={duration} onChange={e => setDuration(e.target.value)} style={{display:"block", width:40, padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}} placeholder="Días" />
         <button onClick={(e) => { e.preventDefault(); generateLine(); }} style={{ marginBottom: 1, padding: "6px 12px", background: "#a78bfa", color: "#000", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>+ Agregar</button>
      </div>
    </div>
  );
}