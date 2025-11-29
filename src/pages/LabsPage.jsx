import { useState, useEffect } from "react";
import { getLabs, createLab, updateLab, deleteLab } from "@/services/labStorage";

const LENS_DESIGNS = ["Monofocal", "Bifocal Flat Top", "Bifocal Invisible", "Progresivo", "Ocupacional"];
const LENS_MATERIALS = ["CR-39", "Policarbonato", "Hi-Index 1.56", "Hi-Index 1.60", "Hi-Index 1.67", "Hi-Index 1.74", "Trivex", "Cristal"];
const LENS_TREATMENTS = ["Blanco", "Antireflejante (AR)", "Blue Ray / Blue Free", "Fotocromático (Grey)", "Fotocromático (Brown)", "Polarizado", "Espejeado", "Transitions"];

export default function LabsPage() {
  const [labs, setLabs] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estado del Laboratorio
  const [form, setForm] = useState({ id: null, name: "", services: [], lensCatalog: [] });
  
  // Estado de UI interna
  const [activeTab, setActiveTab] = useState("SERVICES"); // SERVICES | LENSES
  const [tempService, setTempService] = useState({ name: "", price: "" });
  
  // Estado para editar una MICA específica dentro del catálogo
  const [editingLens, setEditingLens] = useState(null); // Objeto lens o null
  const [tempRange, setTempRange] = useState({ sphMin: -20, sphMax: 20, cylMin: 0, cylMax: -6, cost: 0 });

  useEffect(() => { setLabs(getLabs()); }, [isEditing]);

  // --- LOGICA GENERAL ---
  const handleSaveLab = () => {
    // Si estábamos editando una mica, guardarla en el catálogo antes de salir
    if (editingLens) {
        saveLensToCatalog();
    }
    
    if (form.id) updateLab(form.id, form);
    else createLab(form);
    
    setIsEditing(false);
    setEditingLens(null);
    setForm({ id: null, name: "", services: [], lensCatalog: [] });
  };

  const handleDeleteLab = (id) => {
    if(confirm("¿Borrar laboratorio y todas sus listas de precios?")) { deleteLab(id); setLabs(getLabs()); }
  };

  // --- LOGICA DE SERVICIOS BASICOS ---
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

  // --- LOGICA DE MATRIZ DE MICAS (LO CHIDO) ---
  const handleNewLens = () => {
      setEditingLens({
          id: crypto.randomUUID(),
          name: "", // Ej. "Poly Blue Ray"
          design: "Monofocal",
          material: "Policarbonato",
          treatment: "Blue Ray / Blue Free",
          ranges: [] // Aquí van los costos por graduación
      });
  };

  const saveLensToCatalog = () => {
      if (!editingLens || !editingLens.name) return;
      
      let newCatalog = [...(form.lensCatalog || [])];
      const index = newCatalog.findIndex(l => l.id === editingLens.id);
      
      if (index >= 0) newCatalog[index] = editingLens;
      else newCatalog.push(editingLens);
      
      setForm(f => ({ ...f, lensCatalog: newCatalog }));
      setEditingLens(null); // Volver a la lista
  };

  const addRangeToLens = () => {
      if (!editingLens) return;
      setEditingLens(prev => ({
          ...prev,
          ranges: [...prev.ranges, { ...tempRange, id: crypto.randomUUID() }]
      }));
      // No reseteamos tempRange completo para facilitar captura masiva, solo el costo tal vez?
  };

  const removeRange = (idx) => {
      setEditingLens(prev => ({ ...prev, ranges: prev.ranges.filter((_, i) => i !== idx) }));
  };

  const removeLensFromCatalog = (idx) => {
      if(confirm("¿Borrar esta mica?")) {
          const newCatalog = form.lensCatalog.filter((_, i) => i !== idx);
          setForm(f => ({ ...f, lensCatalog: newCatalog }));
      }
  };

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>Laboratorios y Listas de Costos</h1>
        <button onClick={() => { setIsEditing(true); setForm({ id: null, name: "", services: [], lensCatalog: [] }); }} style={{ background: "#2563eb", color: "white", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer" }}>+ Nuevo Lab</button>
      </div>

      {isEditing && (
        <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", marginBottom: 20 }}>
           
           {/* ENCABEZADO DEL LABORATORIO */}
           <div style={{ marginBottom: 20, borderBottom: "1px solid #333", paddingBottom: 15 }}>
              <h3 style={{ marginTop: 0, color:"#e5e7eb" }}>{form.id ? "Editar" : "Registrar"} Proveedor</h3>
              <label style={{ display: "block", fontSize: 12, color: "#aaa" }}>Nombre del Laboratorio</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ width: "100%", padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "1.2em" }} placeholder="Ej. Laboratorio Augu" />
           </div>

           {/* TABS */}
           <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
               <button onClick={() => setActiveTab("SERVICES")} style={{ padding: "8px 16px", borderRadius: 20, border: activeTab==="SERVICES" ? "1px solid #4ade80" : "1px solid #444", background: activeTab==="SERVICES" ? "rgba(74, 222, 128, 0.1)" : "transparent", color: activeTab==="SERVICES" ? "white" : "#888", cursor: "pointer" }}>🛠️ Servicios Extra</button>
               <button onClick={() => setActiveTab("LENSES")} style={{ padding: "8px 16px", borderRadius: 20, border: activeTab==="LENSES" ? "1px solid #60a5fa" : "1px solid #444", background: activeTab==="LENSES" ? "rgba(96, 165, 250, 0.1)" : "transparent", color: activeTab==="LENSES" ? "white" : "#888", cursor: "pointer" }}>👓 Catálogo de Micas</button>
           </div>
           
           {/* --- TAB 1: SERVICIOS BASICOS --- */}
           {activeTab === "SERVICES" && (
               <div style={{ background: "#111", padding: 15, borderRadius: 8 }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9em", color: "#4ade80" }}>Lista de Precios (Servicios, Bisel, Soldadura)</h4>
                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                     <input placeholder="Servicio (ej. Bisel Ranurado)" value={tempService.name} onChange={e => setTempService({...tempService, name: e.target.value})} style={{ flex: 1, padding: 6, background: "#222", border: "1px solid #444", color: "white" }} />
                     <input type="number" placeholder="$ Costo" value={tempService.price} onChange={e => setTempService({...tempService, price: e.target.value})} style={{ width: 80, padding: 6, background: "#222", border: "1px solid #444", color: "white" }} />
                     <button onClick={handleAddService} style={{ background: "#4ade80", border: "none", cursor: "pointer", borderRadius: 4, padding: "0 12px", fontWeight:"bold" }}>+</button>
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
           )}

           {/* --- TAB 2: CATÁLOGO DE MICAS (MATRIZ) --- */}
           {activeTab === "LENSES" && (
               <div style={{ background: "#111", padding: 15, borderRadius: 8, border: "1px solid #60a5fa" }}>
                  
                  {!editingLens ? (
                      // VISTA: LISTA DE MICAS
                      <>
                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 10}}>
                            <h4 style={{ margin: 0, color: "#60a5fa" }}>Micas Configuradas</h4>
                            <button onClick={handleNewLens} style={{ background: "#60a5fa", color: "black", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>+ Nueva Mica</button>
                        </div>
                        <div style={{display:"grid", gap:10}}>
                            {(!form.lensCatalog || form.lensCatalog.length === 0) && <p style={{color:"#666", fontStyle:"italic"}}>No hay micas registradas.</p>}
                            {form.lensCatalog?.map((lens, idx) => (
                                <div key={lens.id} style={{background:"#222", padding:10, borderRadius:6, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                                    <div>
                                        <div style={{fontWeight:"bold", color:"white"}}>{lens.name}</div>
                                        <div style={{fontSize:"0.8em", color:"#aaa"}}>{lens.design} · {lens.material} · {lens.treatment}</div>
                                        <div style={{fontSize:"0.8em", color:"#4ade80"}}>{lens.ranges?.length || 0} rangos de precio definidos</div>
                                    </div>
                                    <div style={{display:"flex", gap:10}}>
                                        <button onClick={() => setEditingLens(lens)} style={{background:"none", border:"1px solid #666", color:"#aaa", cursor:"pointer", borderRadius:4, fontSize:12, padding:"2px 6px"}}>Editar</button>
                                        <button onClick={() => removeLensFromCatalog(idx)} style={{background:"none", border:"none", color:"#f87171", cursor:"pointer"}}>×</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                      </>
                  ) : (
                      // VISTA: EDITOR DE UNA MICA
                      <div style={{animation: "fadeIn 0.2s"}}>
                          <div style={{display:"flex", justifyContent:"space-between", marginBottom:15}}>
                              <h4 style={{margin:0, color:"#fbbf24"}}>Configurando Mica</h4>
                              <button onClick={saveLensToCatalog} style={{background:"#fbbf24", color:"black", border:"none", padding:"4px 12px", borderRadius:4, fontWeight:"bold", cursor:"pointer"}}>Guardar Mica</button>
                          </div>
                          
                          {/* Atributos de la Mica */}
                          <div style={{display:"grid", gap:10, marginBottom:20, background:"#222", padding:10, borderRadius:8}}>
                              <label style={{fontSize:12, color:"#aaa"}}>Nombre Interno <input value={editingLens.name} onChange={e=>setEditingLens({...editingLens, name:e.target.value})} placeholder="Ej. Poly AR Green" style={{width:"100%", padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4}} /></label>
                              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10}}>
                                  <label style={{fontSize:12, color:"#aaa"}}>Diseño <select value={editingLens.design} onChange={e=>setEditingLens({...editingLens, design:e.target.value})} style={{width:"100%", padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4}}>{LENS_DESIGNS.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
                                  <label style={{fontSize:12, color:"#aaa"}}>Material <select value={editingLens.material} onChange={e=>setEditingLens({...editingLens, material:e.target.value})} style={{width:"100%", padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4}}>{LENS_MATERIALS.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
                                  <label style={{fontSize:12, color:"#aaa"}}>Tratamiento <select value={editingLens.treatment} onChange={e=>setEditingLens({...editingLens, treatment:e.target.value})} style={{width:"100%", padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4}}>{LENS_TREATMENTS.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
                              </div>
                          </div>

                          {/* Matriz de Rangos */}
                          <h5 style={{margin:"0 0 10px 0", color:"#aaa"}}>Tabla de Costos (Rangos)</h5>
                          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr auto", gap:5, alignItems:"end", marginBottom:10, background:"#222", padding:10, borderRadius:6}}>
                              <label style={{fontSize:10, color:"#aaa"}}>Esfera Min<input type="number" step="0.25" value={tempRange.sphMin} onChange={e=>setTempRange({...tempRange, sphMin:e.target.value})} style={{width:"100%", padding:4, background:"#333", border:"1px solid #555", color:"white"}} /></label>
                              <label style={{fontSize:10, color:"#aaa"}}>Esfera Max<input type="number" step="0.25" value={tempRange.sphMax} onChange={e=>setTempRange({...tempRange, sphMax:e.target.value})} style={{width:"100%", padding:4, background:"#333", border:"1px solid #555", color:"white"}} /></label>
                              <label style={{fontSize:10, color:"#aaa"}}>Cil Min<input type="number" step="0.25" value={tempRange.cylMin} onChange={e=>setTempRange({...tempRange, cylMin:e.target.value})} style={{width:"100%", padding:4, background:"#333", border:"1px solid #555", color:"white"}} /></label>
                              <label style={{fontSize:10, color:"#aaa"}}>Cil Max<input type="number" step="0.25" value={tempRange.cylMax} onChange={e=>setTempRange({...tempRange, cylMax:e.target.value})} style={{width:"100%", padding:4, background:"#333", border:"1px solid #555", color:"white"}} /></label>
                              <label style={{fontSize:10, color:"#4ade80", fontWeight:"bold"}}>COSTO $<input type="number" value={tempRange.cost} onChange={e=>setTempRange({...tempRange, cost:e.target.value})} style={{width:"100%", padding:4, background:"#064e3b", border:"1px solid #4ade80", color:"white", fontWeight:"bold"}} /></label>
                              <button onClick={addRangeToLens} style={{background:"#fbbf24", color:"black", border:"none", padding:"6px 10px", borderRadius:4, cursor:"pointer", height:30, alignSelf:"end"}}>✚</button>
                          </div>

                          {/* Lista de Rangos */}
                          <div style={{maxHeight:200, overflowY:"auto"}}>
                              <table style={{width:"100%", fontSize:"0.85em", color:"#ccc", borderCollapse:"collapse"}}>
                                  <thead><tr style={{background:"#333", textAlign:"left"}}><th style={{padding:4}}>Esfera</th><th style={{padding:4}}>Cilindro</th><th style={{padding:4, color:"#4ade80"}}>Costo</th><th style={{padding:4}}></th></tr></thead>
                                  <tbody>
                                      {editingLens.ranges.map((r, i) => (
                                          <tr key={i} style={{borderBottom:"1px solid #333"}}>
                                              <td style={{padding:4}}>{r.sphMin} a {r.sphMax}</td>
                                              <td style={{padding:4}}>{r.cylMin} a {r.cylMax}</td>
                                              <td style={{padding:4, color:"#4ade80", fontWeight:"bold"}}>${r.cost}</td>
                                              <td style={{padding:4}}><button onClick={() => removeRange(i)} style={{color:"#f87171", background:"none", border:"none", cursor:"pointer"}}>x</button></td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}
               </div>
           )}

           <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent:"flex-end", borderTop:"1px solid #333", paddingTop:15 }}>
              <button onClick={() => { setIsEditing(false); setEditingLens(null); }} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleSaveLab} style={{ background: "#16a34a", color: "white", border: "none", padding: "10px 30px", borderRadius: 6, cursor: "pointer", fontWeight:"bold" }}>GUARDAR LABORATORIO</button>
           </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 15 }}>
         {labs.map(l => (
            <div key={l.id} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: 15 }}>
               <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{l.name}</strong>
                  <button onClick={() => handleDeleteLab(l.id)} style={{ color: "#666", background: "none", border: "none", cursor: "pointer" }}>🗑️</button>
               </div>
               <div style={{ marginTop: 10, fontSize: "0.85em", color: "#aaa" }}>
                  <div>🛠️ {l.services?.length || 0} servicios base</div>
                  <div>👓 {l.lensCatalog?.length || 0} tipos de micas</div>
               </div>
               <button onClick={() => { setForm(l); setIsEditing(true); }} style={{ marginTop: 10, width: "100%", padding: 6, background: "#333", border: "none", color: "white", borderRadius: 4, cursor: "pointer" }}>Administrar Precios</button>
            </div>
         ))}
      </div>
    </div>
  );
}