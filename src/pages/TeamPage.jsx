import { useState, useEffect } from "react";
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, ROLES } from "@/services/employeesStorage";
import LoadingState from "@/components/LoadingState";

export default function TeamPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    name: "", 
    email: "", // 👈 Nuevo campo
    role: "SALES", 
    commissionPercent: "", 
    baseSalary: "" 
  });

  // Función para recargar datos
  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    await createEmployee(form);
    // Reiniciar form
    setForm({ name: "", email: "", role: "SALES", commissionPercent: "", baseSalary: "" });
    refresh();
  };

  const handleUpdate = async (id, field, val) => {
      // Actualización optimista local para mejor UX
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, [field]: Number(val) } : e));
      await updateEmployee(id, { [field]: Number(val) });
  };

  const handleDelete = async (id) => {
    if(confirm("¿Eliminar colaborador?")) {
      await deleteEmployee(id);
      refresh();
    }
  };

  if (loading && employees.length === 0) return <LoadingState />;

  return (
    <div style={{ paddingBottom: 40, width: "100%" }}>
      <h1 style={{ marginBottom: 20 }}>Colaboradores y Permisos</h1>
      
      {/* FORMULARIO DE ALTA */}
      <form onSubmit={handleSave} style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", marginBottom: 30 }}>
         <h3 style={{margin:"0 0 15px 0", color:"#e5e7eb", fontSize:"1.1em"}}>Nuevo Integrante</h3>
         
         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 15 }}>
             <label>
                <div style={{fontSize:12, color:"#aaa", marginBottom:5}}>Nombre Completo</div>
                <input autoFocus value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} placeholder="Ej. Juan Pérez" />
             </label>
             <label>
                <div style={{fontSize:12, color:"#60a5fa", marginBottom:5}}>Email de Acceso (Firebase)</div>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{width:"100%", padding:10, background:"#222", border:"1px solid #60a5fa", color:"white", borderRadius:6}} placeholder="juan@lusso.mx" />
             </label>
         </div>

         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15, alignItems: "end" }}>
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

      {/* LISTA */}
      <div style={{ display: "grid", gap: 10 }}>
         {employees.map(emp => (
             <div key={emp.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#111", padding:15, borderRadius:8, border:"1px solid #333" }}>
                 <div style={{display:"flex", alignItems:"center", gap:15, flex: 1.5}}>
                     <div style={{width:40, height:40, borderRadius:"50%", background:"#333", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"bold", color:"#aaa"}}>
                         {emp.name.charAt(0).toUpperCase()}
                     </div>
                     <div>
                         <div style={{fontWeight:"bold", fontSize:"1.1em"}}>{emp.name}</div>
                         <div style={{fontSize:"0.8em", color: ROLES[emp.role] ? "#60a5fa" : "#888"}}>
                             {ROLES[emp.role] || emp.role}
                             {emp.email && <span style={{marginLeft:8, color:"#666"}}>({emp.email})</span>}
                         </div>
                     </div>
                 </div>
                 <div style={{display:"flex", gap:20, alignItems:"center", marginRight:20}}>
                     <label style={{display:"flex", alignItems:"center", gap:5}}>
                        <span style={{fontSize:12, color:"#aaa"}}>Mensual: $</span>
                        <input type="number" value={emp.baseSalary || 0} onChange={(e) => handleUpdate(emp.id, 'baseSalary', e.target.value)} style={{width:70, padding:6, background:"#222", border:"1px solid #555", color:"#4ade80", borderRadius:4, textAlign:"right", fontWeight:"bold"}} />
                     </label>
                     <label style={{display:"flex", alignItems:"center", gap:5}}>
                        <span style={{fontSize:12, color:"#aaa"}}>Comisión:</span>
                        <input type="number" value={emp.commissionPercent || 0} onChange={(e) => handleUpdate(emp.id, 'commissionPercent', e.target.value)} style={{width:50, padding:6, background:"#222", border:"1px solid #555", color:"#fbbf24", borderRadius:4, textAlign:"center", fontWeight:"bold"}} />
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