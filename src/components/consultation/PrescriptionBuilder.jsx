import React, { useState, useEffect, useMemo } from "react";
import { getAllProducts } from "@/services/inventoryStorage";
import { buildPrescriptionInstruction } from "@/utils/prescriptionHelper"; // 🟢 Nuevo import

// UI Kit
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export default function PrescriptionBuilder({ onAdd }) {
  const [query, setQuery] = useState(""); 
  const [selectedMed, setSelectedMed] = useState(null); 
  const [manualName, setManualName] = useState("");
  
  const [type, setType] = useState("DROPS"); 
  const [dose, setDose] = useState("1"); 
  const [freq, setFreq] = useState("8"); 
  const [duration, setDuration] = useState("7"); 
  const [eye, setEye] = useState("AO"); 
  
  const [products, setProducts] = useState([]);

  useEffect(() => {
      getAllProducts().then(setProducts).catch(console.error);
  }, []);

  const filteredMeds = useMemo(() => { 
      if (!query) return []; 
      const q = query.toLowerCase(); 
      return products.filter(p => p.category === "MEDICATION" && (p.brand.toLowerCase().includes(q) || p.model.toLowerCase().includes(q))).slice(0, 5); 
  }, [products, query]);
  
  const handleSelectMed = (prod) => { 
      setSelectedMed(prod); 
      setManualName(`${prod.brand} ${prod.model}`); 
      setQuery(""); 
      if (prod.tags?.presentation) setType(prod.tags.presentation); 
  };

  const generateLine = () => {
    const productName = selectedMed ? `${selectedMed.brand} ${selectedMed.model}` : manualName; 
    
    // 🟢 REFACTOR: Usamos el helper
    const result = buildPrescriptionInstruction({
        productName, type, dose, eye, freq, duration
    });
    
    if (!result) return;
    
    onAdd(result.fullText, selectedMed ? { 
        productId: selectedMed.id, 
        productName: result.fullText.split(":")[0].replace("• ", ""), 
        qty: 1, 
        price: selectedMed.price, 
        instructions: result.instructionOnly 
    } : null);
    
    setManualName(""); 
    setSelectedMed(null);
  };

  return (
    <div className="bg-surfaceHighlight/20 border border-border rounded-xl p-4 mb-4">
      <div className="text-xs font-bold text-blue-400 uppercase mb-3 flex items-center gap-2">
          <span>⚡</span> Agregar Medicamento Rápido
      </div>
      
      <div className="relative mb-4">
        <Input 
            placeholder="Buscar en farmacia o escribir nombre..." 
            value={selectedMed ? `${selectedMed.brand} ${selectedMed.model}` : manualName || query} 
            onChange={e => { setQuery(e.target.value); setManualName(e.target.value); setSelectedMed(null); }} 
        />
        
        {selectedMed && (
            <span className={`absolute right-3 top-2.5 text-xs font-bold ${Number(selectedMed.stock) > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {Number(selectedMed.stock) > 0 ? `✅ Stock: ${selectedMed.stock}` : `⚠️ Stock: 0`}
            </span>
        )}

        {query && filteredMeds.length > 0 && !selectedMed && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-xl z-20 overflow-hidden">
                {filteredMeds.map(p => (
                    <div 
                        key={p.id} 
                        onClick={() => handleSelectMed(p)} 
                        className="p-3 border-b border-border last:border-0 hover:bg-surfaceHighlight cursor-pointer flex justify-between items-center group"
                    >
                        <div className="text-sm text-white group-hover:text-primary">{p.brand} {p.model}</div>
                        <div className={`text-xs font-bold ${Number(p.stock) > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            Stock: {p.stock}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
         <div className="col-span-1">
             <Select label="Tipo" value={type} onChange={e => setType(e.target.value)} className="!py-1.5 !text-xs">
                 <option value="DROPS">Gotas</option>
                 <option value="OINTMENT">Ungüento</option>
                 <option value="ORAL">Oral</option>
                 <option value="OTHER">Otro</option>
             </Select>
         </div>
         
         {(type === "DROPS" || type === "OINTMENT") && (
             <div className="col-span-1">
                 <Select label="Ojo" value={eye} onChange={e => setEye(e.target.value)} className="!py-1.5 !text-xs">
                     <option value="AO">AO</option>
                     <option value="OD">OD</option>
                     <option value="OI">OI</option>
                 </Select>
             </div>
         )}
         
         <Input label="Cant" value={dose} onChange={e => setDose(e.target.value)} className="!py-1.5 !text-xs text-center" />
         <Input label="Hrs" value={freq} onChange={e => setFreq(e.target.value)} className="!py-1.5 !text-xs text-center" />
         <Input label="Días" value={duration} onChange={e => setDuration(e.target.value)} className="!py-1.5 !text-xs text-center" />
         
         <div className="col-span-1 md:col-span-1">
             <Button 
                onClick={(e) => { e.preventDefault(); generateLine(); }} 
                variant="secondary" 
                className="w-full text-xs h-[34px] bg-purple-600 hover:bg-purple-700 text-white border-none"
            >
                + Agregar
             </Button>
         </div>
      </div>
    </div>
  );
}