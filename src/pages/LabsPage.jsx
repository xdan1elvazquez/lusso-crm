import { useState, useEffect } from "react";
import { getLabs, createLab, updateLab, deleteLab } from "@/services/labStorage";

export default function LabsPage() {
  const [labs, setLabs] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", services: [] });
  const [tempService, setTempService] = useState({ name: "", price: "" });

  useEffect(() => { setLabs(getLabs()); }, [isEditing]);

  const handleAddService = () => {
    if(!tempService.name || !tempService.price) return;
    setForm(prev => ({
      ...prev,
      services: [...prev.services, { id: crypto.randomUUID(), name: tempService.name, price: Number(tempService.price) }]
    }));
    setTempService({ name: "", price: "" });
  };

  const removeService = (idx) => {
    setForm(prev => ({ ...prev, services: prev.services.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    if (form.id) updateLab(form.id, form);
    else createLab(form);
    setIsEditing(false);
    setForm({ id: null, name: "", services: [] });
  };

  const handleDelete = (id) => {
    if(confirm("¿Borrar laboratorio?")) { deleteLab(id); setLabs(getLabs()); }
  };

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{margin:0}}>Laboratorios</h1>
        <button onClick={() => setIsEditing(true)} style={{ background: "#2563eb", color: "white", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer" }}>+ Nuevo Lab</button>
      </div>

      {isEditing && (
        <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", marginBottom: 20 }}>
           <h3 style={{ marginTop: 0, color:"#e5e7eb" }}>{form.id ? "Editar" : "Registrar"} Laboratorio</h3>
           <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", fontSize: 12, color: "#aaa" }}>Nombre del Laboratorio</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ width: "100%", padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
           </div>
           
           <div style={{ background: "#111", padding: 10, borderRadius: 8 }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9em", color: "#60a5fa" }}>Lista de Precios Estándar</h4>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                 <input placeholder="Servicio (ej. Bicel)" value={tempService.name} onChange={e => setTempService({...tempService, name: e.target.value})} style={{ flex: 1, padding: 6, background: "#222", border: "1px solid #444", color: "white" }} />
                 <input type="number" placeholder="$ Costo" value={tempService.price} onChange={e => setTempService({...tempService, price: e.target.value})} style={{ width: 80, padding: 6, background: "#222", border: "1px solid #444", color: "white" }} />
                 <button onClick={handleAddService} style={{ background: "#4ade80", border: "none", cursor: "pointer", borderRadius: 4 }}>➕</button>
              </div>
              <div style={{ display: "grid", gap: 5 }}>
                 {form.services.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9em", borderBottom: "1px solid #333", padding: 4 }}>
                       <span>{s.name}</span>
                       <span>${s.price} <span onClick={() => removeService(i)} style={{ color: "red", cursor: "pointer", marginLeft: 8 }}>x</span></span>
                    </div>
                 ))}
              </div>
           </div>

           <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
              <button onClick={handleSave} style={{ background: "#16a34a", color: "white", border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}>Guardar</button>
              <button onClick={() => setIsEditing(false)} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
           </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 15 }}>
         {labs.map(l => (
            <div key={l.id} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: 15 }}>
               <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{l.name}</strong>
                  <button onClick={() => handleDelete(l.id)} style={{ color: "#666", background: "none", border: "none", cursor: "pointer" }}>🗑️</button>
               </div>
               <div style={{ marginTop: 10, fontSize: "0.85em", color: "#aaa" }}>{l.services.length} servicios registrados</div>
               <button onClick={() => { setForm(l); setIsEditing(true); }} style={{ marginTop: 10, width: "100%", padding: 6, background: "#333", border: "none", color: "white", borderRadius: 4, cursor: "pointer" }}>Editar Precios</button>
            </div>
         ))}
      </div>
    </div>
  );
}