import React, { useState, useEffect } from "react";

export default function WorkOrderEditForm({ wo, labs, employees, onSave, onCancel }) {
  const [form, setForm] = useState({
      courier: "", receivedBy: "", jobMadeBy: "", talladoBy: "", baseCost: 0, labCost: 0
  });

  // Helpers de precio
  const getPrice = (labId, type) => {
      if (!labId || labId === "INTERNAL") return 0;
      const lab = labs.find(l => l.id === labId || l.name === labId);
      const svc = lab?.services?.find(s => s.type === type);
      return svc ? Number(svc.price) : 0;
  };

  useEffect(() => {
      const currentTotal = Number(wo.labCost) || 0;
      const bisel = getPrice(wo.jobMadeBy, "BISEL");
      const tallado = getPrice(wo.talladoBy, "TALLADO");
      setForm({
          courier: wo.courier || "",
          receivedBy: wo.receivedBy || "",
          jobMadeBy: wo.jobMadeBy || "",
          talladoBy: wo.talladoBy || "",
          baseCost: Math.max(0, currentTotal - bisel - tallado),
          labCost: currentTotal
      });
  }, [wo]);

  const handleChange = (field, val) => {
      setForm(prev => {
          const next = { ...prev, [field]: val };
          if (["baseCost", "jobMadeBy", "talladoBy"].includes(field)) {
              const b = Number(next.baseCost) || 0;
              const bi = getPrice(next.jobMadeBy, "BISEL");
              const ta = getPrice(next.talladoBy, "TALLADO");
              next.labCost = b + bi + ta;
          }
          return next;
      });
  };

  const handleSubmit = () => {
      // Resolvemos nombres
      const resolveName = (id) => labs.find(l => l.id === id)?.name || (id === "INTERNAL" ? "Taller Interno" : id);
      const mainLabId = (form.talladoBy && form.talladoBy !== "INTERNAL") ? form.talladoBy : 
                        (form.jobMadeBy && form.jobMadeBy !== "INTERNAL") ? form.jobMadeBy : "";
      
      onSave({
          ...form,
          jobMadeBy: resolveName(form.jobMadeBy),
          talladoBy: resolveName(form.talladoBy),
          labId: mainLabId,
          labName: resolveName(mainLabId) || "Taller Interno"
      });
  };

  const inputStyle = { width: "100%", padding: 8, background: "#111", border: "1px solid #444", color: "white", borderRadius: 4 };

  return (
    <div style={{background:"#2a2a2a", padding:15, borderRadius:8, marginTop:10, animation:"fadeIn 0.2s"}}>
        <h4 style={{marginTop:0, color:"#60a5fa"}}>Editar Orden de Trabajo</h4>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}>
            <label style={{fontSize:11, color:"#aaa"}}>Mensajería <input value={form.courier} onChange={e=>handleChange("courier",e.target.value)} style={inputStyle}/></label>
            <label style={{fontSize:11, color:"#aaa"}}>Recibe (Sucursal) <select value={form.receivedBy} onChange={e=>handleChange("receivedBy",e.target.value)} style={inputStyle}><option value="">--</option>{employees.map(e=><option key={e.id} value={e.name}>{e.name}</option>)}</select></label>
            
            <label style={{fontSize:11, color:"#aaa"}}>Bisel <select value={form.jobMadeBy} onChange={e=>handleChange("jobMadeBy",e.target.value)} style={inputStyle}><option value="">--</option><option value="INTERNAL">Interno ($0)</option>{labs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
            <label style={{fontSize:11, color:"#aaa"}}>Tallado <select value={form.talladoBy} onChange={e=>handleChange("talladoBy",e.target.value)} style={inputStyle}><option value="">--</option><option value="INTERNAL">Interno ($0)</option>{labs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
        </div>
        
        <div style={{borderTop:"1px dashed #555", paddingTop:10, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <label style={{fontSize:11, color:"#aaa"}}>Costo Base Material: <input type="number" value={form.baseCost} onChange={e=>handleChange("baseCost",e.target.value)} style={{width:80, padding:4, background:"#111", border:"1px solid #555", color:"white"}}/></label>
            <div style={{color:"#f87171", fontWeight:"bold"}}>Total Costo: ${form.labCost}</div>
        </div>

        <div style={{marginTop:15, display:"flex", gap:10, justifyContent:"flex-end"}}>
            <button onClick={onCancel} style={{background:"transparent", color:"#aaa", border:"none", cursor:"pointer"}}>Cancelar</button>
            <button onClick={handleSubmit} style={{background:"#60a5fa", color:"black", border:"none", borderRadius:4, padding:"6px 12px", fontWeight:"bold", cursor:"pointer"}}>Guardar</button>
        </div>
    </div>
  );
}