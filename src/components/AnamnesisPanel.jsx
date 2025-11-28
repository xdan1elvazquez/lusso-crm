import React, { useMemo, useState, useEffect } from "react";
import { 
  createAnamnesis, 
  deleteAnamnesis, 
  getAnamnesisByPatientId, 
  getLastAnamnesis 
} from "@/services/anamnesisStorage";

// --- TUS LISTAS DE PADECIMIENTOS (PERSONALIZABLES) ---
const SYSTEMIC_LIST = [
  "Diabetes", "Hipertensión", "Artritis", "Tiroides", 
  "Cáncer", "Enf. Autoinmune", "Renal", "Cardiovascular", "Embarazo"
];

const OCULAR_LIST = [
  "Glaucoma", "Catarata", "Cirugía Ocular", "Trauma Ocular", 
  "Uso de Lentes de Contacto", "Ojo Seco", "Infecciones Recurrentes", 
  "Desprendimiento Retina"
];

const FAMILY_LIST = [
  "Diabetes (Fam)", "Hipertensión (Fam)", "Glaucoma (Fam)", 
  "Queratocono (Fam)", "Ceguera (Fam)", "Catarata (Fam)"
];

export default function AnamnesisPanel({ patientId }) {
  const [tick, setTick] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  
  // ESTADOS DEL FORMULARIO
  const [systemic, setSystemic] = useState({});
  const [ocular, setOcular] = useState({});
  const [family, setFamily] = useState({});
  const [extras, setExtras] = useState({ allergies: "", medications: "", observations: "" });

  const historyList = useMemo(() => getAnamnesisByPatientId(patientId), [patientId, tick]);

  // Función para alternar un padecimiento
  const toggleCondition = (group, setGroup, key) => {
    setGroup(prev => {
      const current = prev[key] || { active: false, notes: "" };
      // Si está activo, lo desactivamos. Si no, lo activamos.
      if (current.active) {
        const next = { ...prev };
        delete next[key]; // Lo quitamos para limpiar
        return next;
      } else {
        return { ...prev, [key]: { active: true, notes: "" } };
      }
    });
  };

  // Función para escribir detalles (tiempo/control)
  const updateNotes = (setGroup, key, text) => {
    setGroup(prev => ({
      ...prev,
      [key]: { ...prev[key], active: true, notes: text }
    }));
  };

  // CLONAR ÚLTIMA HISTORIA (VELOCIDAD ⚡)
  const handleCloneLast = () => {
    const last = getLastAnamnesis(patientId);
    if (!last) return alert("No hay historial previo para copiar.");
    
    setSystemic(last.systemic || {});
    setOcular(last.ocular || {});
    setFamily(last.family || {});
    setExtras({
      allergies: last.allergies || "",
      medications: last.medications || "",
      observations: last.observations || ""
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setSystemic({}); setOcular({}); setFamily({});
    setExtras({ allergies: "", medications: "", observations: "" });
  };

  const handleCreate = () => {
    setIsCreating(true);
    resetForm();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    createAnamnesis({ patientId, systemic, ocular, family, ...extras });
    resetForm();
    setIsCreating(false);
    setTick(t => t + 1);
  };

  const onDelete = (id) => {
    if(confirm("¿Borrar registro?")) { deleteAnamnesis(id); setTick(t => t + 1); }
  };

  // SUBCOMPONENTE: FILA DE PADECIMIENTO
  const ConditionRow = ({ label, dataGroup, setGroup }) => {
    const item = dataGroup[label] || { active: false, notes: "" };
    
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #333" }}>
        {/* Toggle Switch Simulado */}
        <div 
          onClick={() => toggleCondition(dataGroup, setGroup, label)}
          style={{ 
            cursor: "pointer", width: 40, height: 20, borderRadius: 10, position: "relative",
            background: item.active ? "#4ade80" : "#444", transition: "all 0.2s"
          }}
        >
          <div style={{ 
            width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 2, 
            left: item.active ? 22 : 2, transition: "all 0.2s" 
          }} />
        </div>
        
        <div style={{ flex: 1, fontSize: 13, color: item.active ? "white" : "#888", fontWeight: item.active ? "bold" : "normal" }}>
          {label}
        </div>

        {/* Input de detalles solo si está activo */}
        {item.active && (
          <input 
            placeholder="Tiempo / Control..." 
            value={item.notes} 
            onChange={e => updateNotes(setGroup, label, e.target.value)}
            style={{ width: "50%", background: "transparent", border: "none", borderBottom: "1px solid #60a5fa", color: "#60a5fa", fontSize: 12, padding: 2 }}
            autoFocus
          />
        )}
      </div>
    );
  };

  return (
    <section style={{ marginTop: 28, display: "grid", gap: 14, background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.2em", color: "#e5e7eb" }}>Anamnesis (Antecedentes)</h2>
        <div style={{display:"flex", gap:10}}>
           {historyList.length > 0 && !isCreating && (
              <button onClick={handleCloneLast} style={{ fontSize: "0.9em", background: "#1e3a8a", color: "#bfdbfe", border: "1px solid #60a5fa", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
                 ⚡ Copiar Anterior
              </button>
           )}
           <button onClick={() => isCreating ? setIsCreating(false) : handleCreate()} style={{ fontSize: "0.9em", background: isCreating ? "#333" : "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
             {isCreating ? "Cancelar" : "+ Nuevo Registro"}
           </button>
        </div>
      </div>

      {isCreating && (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 20, background: "#111", padding: 20, borderRadius: 10, border: "1px dashed #555" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 30 }}>
            {/* COLUMNA 1: PATOLÓGICOS */}
            <div>
               <h4 style={{ color: "#f87171", borderBottom: "1px solid #f87171", paddingBottom: 5, marginTop: 0 }}>1. Personales Patológicos</h4>
               {SYSTEMIC_LIST.map(label => <ConditionRow key={label} label={label} dataGroup={systemic} setGroup={setSystemic} />)}
            </div>

            {/* COLUMNA 2: OCULARES */}
            <div>
               <h4 style={{ color: "#60a5fa", borderBottom: "1px solid #60a5fa", paddingBottom: 5, marginTop: 0 }}>2. Oculares</h4>
               {OCULAR_LIST.map(label => <ConditionRow key={label} label={label} dataGroup={ocular} setGroup={setOcular} />)}
            </div>

            {/* COLUMNA 3: HEREDOFAMILIARES */}
            <div>
               <h4 style={{ color: "#fbbf24", borderBottom: "1px solid #fbbf24", paddingBottom: 5, marginTop: 0 }}>3. Heredofamiliares</h4>
               {FAMILY_LIST.map(label => <ConditionRow key={label} label={label} dataGroup={family} setGroup={setFamily} />)}
            </div>
          </div>

          {/* CAMPOS LIBRES */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
             <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#aaa" }}>Alergias</span>
                <input value={extras.allergies} onChange={e => setExtras({...extras, allergies: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
             </label>
             <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#aaa" }}>Tratamiento Médico Actual (Medicamentos)</span>
                <input value={extras.medications} onChange={e => setExtras({...extras, medications: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} placeholder="Nombre, dosis..." />
             </label>
          </div>

          <label style={{ display: "grid", gap: 4 }}>
             <span style={{ fontSize: 12, color: "#aaa" }}>Observaciones Generales</span>
             <textarea rows={2} value={extras.observations} onChange={e => setExtras({...extras, observations: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
          </label>

          <button type="submit" style={{ background: "#4ade80", color: "black", border: "none", padding: "12px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: "1em" }}>
             Guardar Anamnesis
          </button>
        </form>
      )}

      {/* HISTORIAL VISUAL */}
      <div style={{ display: "grid", gap: 10 }}>
        {historyList.length === 0 && !isCreating && <p style={{ opacity: 0.6, fontSize: 13 }}>No hay historial médico.</p>}
        
        {historyList.map((entry) => {
           // Helpers para renderizar resumen
           const hasSystemic = Object.keys(entry.systemic || {}).length > 0;
           const hasOcular = Object.keys(entry.ocular || {}).length > 0;
           
           return (
            <div key={entry.id} style={{ border: "1px solid #333", borderRadius: 8, padding: 15, background: "#111" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, borderBottom: "1px solid #222", paddingBottom: 5 }}>
                <strong style={{color:"#ddd"}}>{new Date(entry.createdAt).toLocaleDateString()}</strong>
                <button onClick={() => onDelete(entry.id)} style={{ fontSize: 11, background: "none", border: "none", color: "#666", cursor: "pointer" }}>Eliminar</button>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15, fontSize: "0.9em" }}>
                 {/* Resumen Patológico */}
                 {hasSystemic && (
                    <div>
                       <span style={{color: "#f87171", fontSize:11, fontWeight:"bold"}}>SISTÉMICOS:</span>
                       <ul style={{margin:"4px 0 0 15px", padding:0, color:"#ccc"}}>
                          {Object.entries(entry.systemic).map(([k, v]) => <li key={k}>{k} {v.notes && <span style={{color:"#888"}}>({v.notes})</span>}</li>)}
                       </ul>
                    </div>
                 )}
                 
                 {/* Resumen Ocular */}
                 {hasOcular && (
                    <div>
                       <span style={{color: "#60a5fa", fontSize:11, fontWeight:"bold"}}>OCULARES:</span>
                       <ul style={{margin:"4px 0 0 15px", padding:0, color:"#ccc"}}>
                          {Object.entries(entry.ocular).map(([k, v]) => <li key={k}>{k} {v.notes && <span style={{color:"#888"}}>({v.notes})</span>}</li>)}
                       </ul>
                    </div>
                 )}
                 
                 {/* Resumen Otros */}
                 <div>
                    {(entry.allergies || entry.medications) && (
                        <>
                           <span style={{color: "#fbbf24", fontSize:11, fontWeight:"bold"}}>OTROS:</span>
                           <div style={{marginTop:4, color:"#aaa"}}>
                              {entry.allergies && <div>Alergias: {entry.allergies}</div>}
                              {entry.medications && <div>Meds: {entry.medications}</div>}
                           </div>
                        </>
                    )}
                    {(!hasSystemic && !hasOcular && !entry.allergies && !entry.medications) && <span style={{color:"#4ade80", fontStyle:"italic"}}>Paciente Sano (Negó antecedentes)</span>}
                 </div>
              </div>
            </div>
           )
        })}
      </div>
    </section>
  );
}