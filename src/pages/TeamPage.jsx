import { useState, useEffect } from "react";
import { getEmployees, createEmployee, deleteEmployee, ROLES } from "@/services/employeesStorage";

export default function TeamPage() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ name: "", role: "SALES" });

  useEffect(() => { setEmployees(getEmployees()); }, []);

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name) return;
    createEmployee(form);
    setForm({ name: "", role: "SALES" });
    setEmployees(getEmployees());
  };

  const handleDelete = (id) => {
    if(confirm("¿Eliminar colaborador?")) {
      deleteEmployee(id);
      setEmployees(getEmployees());
    }
  };

  return (
    <div style={{ paddingBottom: 40, width: "100%" }}>
      <h1 style={{ marginBottom: 20 }}>Colaboradores y Equipo</h1>
      
      {/* FORMULARIO DE ALTA */}
      <form onSubmit={handleSave} style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", display: "flex", gap: 15, alignItems: "end", marginBottom: 30 }}>
         <label style={{flex: 1}}>
            <div style={{fontSize:12, color:"#aaa", marginBottom:5}}>Nombre Completo</div>
            <input autoFocus value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} placeholder="Ej. Juan Pérez" />
         </label>
         <label style={{width: 200}}>
            <div style={{fontSize:12, color:"#aaa", marginBottom:5}}>Rol / Puesto</div>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}}>
                {Object.entries(ROLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
         </label>
         <button type="submit" style={{padding:"10px 20px", background:"#2563eb", color:"white", border:"none", borderRadius:6, cursor:"pointer", fontWeight:"bold"}}>+ Agregar</button>
      </form>

      {/* LISTA */}
      <div style={{ display: "grid", gap: 10 }}>
         {employees.map(emp => (
             <div key={emp.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#111", padding:15, borderRadius:8, border:"1px solid #333" }}>
                 <div style={{display:"flex", alignItems:"center", gap:15}}>
                     <div style={{width:40, height:40, borderRadius:"50%", background:"#333", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"bold", color:"#aaa"}}>
                         {emp.name.charAt(0).toUpperCase()}
                     </div>
                     <div>
                         <div style={{fontWeight:"bold", fontSize:"1.1em"}}>{emp.name}</div>
                         <div style={{fontSize:"0.9em", color: ROLES[emp.role] ? "#60a5fa" : "#888"}}>{ROLES[emp.role] || emp.role}</div>
                     </div>
                 </div>
                 <button onClick={() => handleDelete(emp.id)} style={{color:"#f87171", background:"none", border:"none", cursor:"pointer"}}>Eliminar</button>
             </div>
         ))}
         {employees.length === 0 && <p style={{opacity:0.5, textAlign:"center"}}>No hay colaboradores registrados.</p>}
      </div>
    </div>
  );
}