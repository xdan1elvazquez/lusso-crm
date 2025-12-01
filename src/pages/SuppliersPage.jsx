import { useState, useEffect } from "react";
import { getSuppliers, createSupplier, deleteSupplier, updateSupplier } from "@/services/suppliersStorage";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", contactName: "", phone: "", email: "", creditDays: "" });

  useEffect(() => { setSuppliers(getSuppliers()); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.id) updateSupplier(form.id, form);
    else createSupplier(form);
    
    setForm({ id: null, name: "", contactName: "", phone: "", email: "", creditDays: "" });
    setIsEditing(false);
    setSuppliers(getSuppliers());
  };

  const handleEdit = (s) => {
      setForm(s);
      setIsEditing(true);
  };

  const handleDelete = (id) => {
      if(confirm("¿Eliminar proveedor?")) {
          deleteSupplier(id);
          setSuppliers(getSuppliers());
      }
  };

  return (
    <div style={{ paddingBottom: 40, width: "100%" }}>
      <h1 style={{ marginBottom: 20 }}>Directorio de Proveedores</h1>

      {/* FORMULARIO */}
      <form onSubmit={handleSubmit} style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", marginBottom: 30 }}>
         <h3 style={{margin:"0 0 15px 0", color:"#e5e7eb", fontSize:"1.1em"}}>{form.id ? "Editar Proveedor" : "Nuevo Proveedor"}</h3>
         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15, alignItems: "end" }}>
             <label><span style={{fontSize:12, color:"#aaa"}}>Empresa / Laboratorio</span><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} placeholder="Ej. Marchon" /></label>
             <label><span style={{fontSize:12, color:"#aaa"}}>Contacto (Vendedor)</span><input value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} /></label>
             <label><span style={{fontSize:12, color:"#aaa"}}>Teléfono</span><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} /></label>
             <label><span style={{fontSize:12, color:"#aaa"}}>Días Crédito</span><input type="number" value={form.creditDays} onChange={e => setForm({...form, creditDays: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} placeholder="0" /></label>
             
             <div style={{display:"flex", gap:10}}>
                 {isEditing && <button type="button" onClick={() => { setIsEditing(false); setForm({ id: null, name: "", contactName: "", phone: "", email: "", creditDays: "" }); }} style={{padding:"10px", background:"transparent", color:"#aaa", border:"1px solid #555", borderRadius:6, cursor:"pointer"}}>Cancelar</button>}
                 <button type="submit" style={{flex:1, padding:"10px", background:"#2563eb", color:"white", border:"none", borderRadius:6, cursor:"pointer", fontWeight:"bold"}}>{form.id ? "Actualizar" : "Guardar"}</button>
             </div>
         </div>
      </form>

      {/* LISTA */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 15 }}>
         {suppliers.map(s => (
             <div key={s.id} style={{ background: "#111", padding: 15, borderRadius: 10, border: "1px solid #333", position: "relative" }}>
                 <div style={{fontWeight:"bold", fontSize:"1.2em", color:"#fff"}}>{s.name}</div>
                 <div style={{color:"#888", fontSize:"0.9em", marginTop:5}}>
                     {s.contactName && <div>👤 {s.contactName}</div>}
                     {s.phone && <div>📞 {s.phone}</div>}
                     {s.creditDays > 0 && <div style={{color:"#4ade80", marginTop:4}}>✅ {s.creditDays} días de crédito</div>}
                 </div>
                 <div style={{marginTop:15, display:"flex", gap:10, justifyContent:"flex-end"}}>
                     <button onClick={() => handleEdit(s)} style={{color:"#60a5fa", background:"none", border:"none", cursor:"pointer"}}>Editar</button>
                     <button onClick={() => handleDelete(s.id)} style={{color:"#f87171", background:"none", border:"none", cursor:"pointer"}}>Eliminar</button>
                 </div>
             </div>
         ))}
         {suppliers.length === 0 && <p style={{opacity:0.5}}>No hay proveedores registrados.</p>}
      </div>
    </div>
  );
}