import { useState, useEffect } from "react";
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, ROLES } from "@/services/employeesStorage";

export default function TeamPage() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ name: "", role: "SALES", commissionPercent: "", baseSalary: "" });

  useEffect(() => { setEmployees(getEmployees()); }, []);

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name) return;
    createEmployee(form);
    setForm({ name: "", role: "SALES", commissionPercent: "", baseSalary: "" });
    setEmployees(getEmployees());
  };

  const handleUpdate = (id, field, val) => {
      updateEmployee(id, { [field]: Number(val) });
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
      <h1 style={{ marginBottom: 20 }}>Colaboradores y Configuración</h1>
      
      {/* FORMULARIO DE ALTA */}
      <form onSubmit={handleSave} style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", marginBottom: 30 }}>
         <h3 style={{margin:"0 0 15px 0", color:"#e5e7eb", fontSize:"1.1em"}}>Nuevo Integrante</h3>
         <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr auto", gap: 15, alignItems: "end" }}>
             <label>
                <div style={{fontSize:12, color:"#aaa", marginBottom:5}}>Nombre Completo</div>
                <input autoFocus value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} placeholder="Ej. Juan Pérez" />
             </label>
             <label>
                <div style={{fontSize:12, color:"#aaa", marginBottom:5}}>Rol / Puesto</div>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}}>
                    {Object.entries(ROLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
             </label>
             <label>
                <div style={{fontSize:12, color:"#4ade80", marginBottom:5}}>Sueldo Mensual ($)</div>
                <input type="number" value={form.baseSalary} onChange={e => setForm({...form, baseSalary: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} placeholder="0" />
             </label>
             <label>
                <div style={{fontSize:12, color:"#fbbf24", marginBottom:5}}>% Comisión</div>
                <input type="number" value={form.commissionPercent} onChange={e => setForm({...form, commissionPercent: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} placeholder="0%" />
             </label>
             <button type="submit" style={{padding:"10px 20px", background:"#2563eb", color:"white", border:"none", borderRadius:6, cursor:"pointer", fontWeight:"bold"}}>+ Agregar</button>
         </div>
      </form>

      {/* LISTA EDITABLE */}
      <div style={{ display: "grid", gap: 10 }}>
         {employees.map(emp => (
             <div key={emp.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#111", padding:15, borderRadius:8, border:"1px solid #333" }}>
                 <div style={{display:"flex", alignItems:"center", gap:15, flex: 1.5}}>
                     <div style={{width:40, height:40, borderRadius:"50%", background:"#333", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"bold", color:"#aaa"}}>
                         {emp.name.charAt(0).toUpperCase()}
                     </div>
                     <div>
                         <div style={{fontWeight:"bold", fontSize:"1.1em"}}>{emp.name}</div>
                         <div style={{fontSize:"0.9em", color: ROLES[emp.role] ? "#60a5fa" : "#888"}}>{ROLES[emp.role] || emp.role}</div>
                     </div>
                 </div>
                 
                 <div style={{display:"flex", gap:20, alignItems:"center", marginRight:20}}>
                     {/* EDITOR SUELDO */}
                     <label style={{display:"flex", alignItems:"center", gap:5}}>
                        <span style={{fontSize:12, color:"#aaa"}}>Mensual: $</span>
                        <input 
                            type="number" 
                            value={emp.baseSalary || 0} 
                            onChange={(e) => handleUpdate(emp.id, 'baseSalary', e.target.value)}
                            style={{width:70, padding:6, background:"#222", border:"1px solid #555", color:"#4ade80", borderRadius:4, textAlign:"right", fontWeight:"bold"}}
                        />
                     </label>

                     {/* EDITOR COMISIÓN */}
                     <label style={{display:"flex", alignItems:"center", gap:5}}>
                        <span style={{fontSize:12, color:"#aaa"}}>Comisión:</span>
                        <input 
                            type="number" 
                            value={emp.commissionPercent || 0} 
                            onChange={(e) => handleUpdate(emp.id, 'commissionPercent', e.target.value)}
                            style={{width:50, padding:6, background:"#222", border:"1px solid #555", color:"#fbbf24", borderRadius:4, textAlign:"center", fontWeight:"bold"}}
                        />
                        <span style={{color:"#fbbf24"}}>%</span>
                     </label>
                 </div>

                 <button onClick={() => handleDelete(emp.id)} style={{color:"#f87171", background:"none", border:"none", cursor:"pointer"}}>Eliminar</button>
             </div>
         ))}
         {employees.length === 0 && <p style={{opacity:0.5, textAlign:"center"}}>No hay colaboradores registrados.</p>}
      </div>
    </div>
  );
}