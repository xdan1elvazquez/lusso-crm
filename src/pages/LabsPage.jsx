import { useState, useEffect, useMemo } from "react";
import { getLabs, createLab, updateLab, deleteLab } from "@/services/labStorage";
import { getLensMaterials, updateLensMaterials } from "@/services/settingsStorage"; // Ahora Async
import { parseDiopter } from "@/utils/rxUtils";
import LoadingState from "@/components/LoadingState";

const LENS_DESIGNS = ["Monofocal", "Bifocal Flat Top", "Bifocal Invisible", "Progresivo", "Ocupacional"];
const LENS_TREATMENTS = ["Blanco", "Antireflejante (AR)", "Blue Ray / Blue Free", "Fotocromático (Grey)", "Fotocromático (Brown)", "Polarizado", "Espejeado", "Transitions"];
const SERVICE_TYPES = [{ id: "GENERIC", label: "Genérico" }, { id: "BISEL", label: "Bisel / Montaje" }, { id: "TALLADO", label: "Tallado Digital" }];

// --- GESTOR DE MATERIALES (Async) ---
const MaterialsManager = ({ onClose }) => {
    const [materials, setMaterials] = useState([]);

    useEffect(() => {
        getLensMaterials().then(setMaterials);
    }, []);

    const [newName, setNewName] = useState("");

    const handleAdd = async () => {
        if (!newName.trim()) return;
        const id = newName.toLowerCase().replace(/[^a-z0-9]/g, '_') + "_" + Date.now().toString().slice(-4);
        const next = [...materials, { id, name: newName.trim(), active: true }];
        await updateLensMaterials(next);
        setMaterials(next);
        setNewName("");
    };

    const toggleActive = async (id) => {
        const next = materials.map(m => m.id === id ? { ...m, active: !m.active } : m);
        await updateLensMaterials(next);
        setMaterials(next);
    };

    const handleUpdateName = async (id, val) => {
        const next = materials.map(m => m.id === id ? { ...m, name: val } : m);
        // Para optimizar, aquí no guardamos en cada tecla, solo en UI.
        // En una app real usaríamos debounce o botón de guardar. 
        // Para demo, actualizamos el estado local y el usuario debe "cerrar" para guardar o usamos un evento onBlur.
        // Simplificaremos guardando directo (puede ser lento).
        setMaterials(next);
        await updateLensMaterials(next);
    };

    return (
        <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
            <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 10, width: 450, border: "1px solid #60a5fa", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:15}}>
                    <h3 style={{ margin: 0, color: "#60a5fa" }}>Configurar Materiales</h3>
                    <button onClick={onClose} style={{background:"none", border:"none", color:"#aaa", fontSize:20, cursor:"pointer"}}>×</button>
                </div>
                <div style={{display:"flex", gap:10, marginBottom:15}}>
                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nuevo material..." style={{flex:1, padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} />
                    <button onClick={handleAdd} style={{background:"#2563eb", color:"white", border:"none", padding:"0 15px", borderRadius:4, fontWeight:"bold", cursor:"pointer"}}>+</button>
                </div>
                <div style={{flex:1, overflowY:"auto", display:"grid", gap:8, paddingRight:5}}>
                    {materials.map(m => (
                        <div key={m.id} style={{display:"flex", alignItems:"center", gap:10, background:"#222", padding:8, borderRadius:4, opacity: m.active ? 1 : 0.5}}>
                            <input type="checkbox" checked={m.active} onChange={() => toggleActive(m.id)} style={{cursor:"pointer", width:16, height:16}} />
                            <input value={m.name} onChange={(e) => handleUpdateName(m.id, e.target.value)} style={{flex:1, background:"transparent", border:"none", color: m.active ? "white" : "#888", fontSize:14}} />
                            <span style={{fontSize:10, color: m.active ? "#4ade80" : "#f87171"}}>{m.active ? "ACTIVO" : "INACTIVO"}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default function LabsPage() {
  const [loading, setLoading] = useState(true);
  const [labs, setLabs] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", services: [], lensCatalog: [] });
  const [activeTab, setActiveTab] = useState("SERVICES");
  const [tempService, setTempService] = useState({ name: "", price: "", type: "GENERIC" });
  const [editingLens, setEditingLens] = useState(null);
  const [tempRange, setTempRange] = useState({ sphMin: -20, sphMax: 20, cylMin: -6, cylMax: 0, cost: 0, price: 0 });
  const [materials, setMaterials] = useState([]);

  const refreshData = async () => {
      setLoading(true);
      try {
          const [labsData, matsData] = await Promise.all([getLabs(), getLensMaterials()]);
          setLabs(labsData);
          setMaterials(matsData);
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { refreshData(); }, [showConfig]); 

  const handleSaveLab = async () => {
    if (editingLens) saveLensToCatalog();
    if (form.id) await updateLab(form.id, form); else await createLab(form);
    setIsEditing(false); setEditingLens(null); setForm({ id: null, name: "", services: [], lensCatalog: [] });
    refreshData();
  };

  const handleDeleteLab = async (id) => { if(confirm("¿Borrar?")) { await deleteLab(id); refreshData(); } };
  const handleAddService = () => { if(!tempService.name || !tempService.price) return; setForm(prev => ({ ...prev, services: [...prev.services, { id: crypto.randomUUID(), name: tempService.name, price: Number(tempService.price), type: tempService.type || "GENERIC" }] })); setTempService({ name: "", price: "", type: "GENERIC" }); };
  const removeService = (idx) => { setForm(prev => ({ ...prev, services: prev.services.filter((_, i) => i !== idx) })); };
  const handleNewLens = () => { const defaultMat = materials.find(m => m.active)?.name || "CR-39"; setEditingLens({ id: crypto.randomUUID(), name: "", design: "Monofocal", material: defaultMat, treatment: "Antireflejante (AR)", ranges: [] }); };
  const saveLensToCatalog = () => { if (!editingLens || !editingLens.name) return; let newCatalog = [...(form.lensCatalog || [])]; const index = newCatalog.findIndex(l => l.id === editingLens.id); if (index >= 0) newCatalog[index] = editingLens; else newCatalog.push(editingLens); setForm(f => ({ ...f, lensCatalog: newCatalog })); setEditingLens(null); };
  const handleRangeChange = (field, value) => { setTempRange(prev => ({ ...prev, [field]: value })); };
  const handleRangeBlur = (field) => { if (field === 'cost' || field === 'price') setTempRange(prev => ({ ...prev, [field]: Number(prev[field]) || 0 })); else setTempRange(prev => ({ ...prev, [field]: parseDiopter(prev[field]) })); };
  const addRangeToLens = () => { if (!editingLens) return; if (Number(tempRange.sphMin) > Number(tempRange.sphMax)) return alert("Esfera Min > Max"); if (Number(tempRange.cylMin) > Number(tempRange.cylMax)) return alert("Cilindro Min > Max"); setEditingLens(prev => ({ ...prev, ranges: [...prev.ranges, { ...tempRange, id: crypto.randomUUID() }] })); };
  const removeRange = (idx) => { setEditingLens(prev => ({ ...prev, ranges: prev.ranges.filter((_, i) => i !== idx) })); };
  const editRange = (range, idx) => { setTempRange({ sphMin: range.sphMin, sphMax: range.sphMax, cylMin: range.cylMin, cylMax: range.cylMax, cost: range.cost, price: range.price || 0 }); removeRange(idx); };
  const removeLensFromCatalog = (idx) => { if(confirm("¿Borrar mica?")) { const newCatalog = form.lensCatalog.filter((_, i) => i !== idx); setForm(f => ({ ...f, lensCatalog: newCatalog })); } };
  const currentUtility = (Number(tempRange.price) || 0) - (Number(tempRange.cost) || 0);
  const utilityColor = currentUtility > 0 ? "#4ade80" : currentUtility < 0 ? "#f87171" : "#aaa";

  const materialOptions = useMemo(() => {
      if (!editingLens) return [];
      const currentVal = editingLens.material;
      const activeMats = materials.filter(m => m.active);
      const currentExists = activeMats.find(m => m.name === currentVal);
      if (currentVal && !currentExists) return [...activeMats, { id: 'legacy', name: currentVal, active: false }];
      return activeMats;
  }, [materials, editingLens]);

  if (loading) return <LoadingState />;

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>Laboratorios</h1>
        <div style={{display:"flex", gap:10}}>
            <button onClick={() => setShowConfig(true)} style={{ background: "#333", color: "#ddd", border: "1px solid #555", padding: "10px 15px", borderRadius: 6, cursor: "pointer" }}>⚙️ Materiales</button>
            <button onClick={() => { setIsEditing(true); setForm({ id: null, name: "", services: [], lensCatalog: [] }); }} style={{ background: "#2563eb", color: "white", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer" }}>+ Nuevo Lab</button>
        </div>
      </div>

      {showConfig && <MaterialsManager onClose={() => setShowConfig(false)} />}

      {/* ... (Resto del renderizado idéntico a tu versión anterior, formularios, tablas, etc.) ... */}
      {/* Se omite para ahorrar espacio pero copia y pega la parte de {isEditing && ...} y el listado de labs */}
      {isEditing && (
        <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", marginBottom: 20 }}>
           <div style={{ marginBottom: 20, borderBottom: "1px solid #333", paddingBottom: 15 }}>
              <h3 style={{ marginTop: 0, color:"#e5e7eb" }}>{form.id ? "Editar" : "Registrar"} Proveedor</h3>
              <label style={{ display: "block", fontSize: 12, color: "#aaa" }}>Nombre del Laboratorio</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ width: "100%", padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "1.2em" }} placeholder="Ej. Laboratorio Augu" />
           </div>
           <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
               <button onClick={() => setActiveTab("SERVICES")} style={{ padding: "8px 16px", borderRadius: 20, border: activeTab==="SERVICES" ? "1px solid #4ade80" : "1px solid #444", background: activeTab==="SERVICES" ? "rgba(74, 222, 128, 0.1)" : "transparent", color: activeTab==="SERVICES" ? "white" : "#888", cursor: "pointer" }}>🛠️ Servicios Extra</button>
               <button onClick={() => setActiveTab("LENSES")} style={{ padding: "8px 16px", borderRadius: 20, border: activeTab==="LENSES" ? "1px solid #60a5fa" : "1px solid #444", background: activeTab==="LENSES" ? "rgba(96, 165, 250, 0.1)" : "transparent", color: activeTab==="LENSES" ? "white" : "#888", cursor: "pointer" }}>👓 Catálogo de Micas</button>
           </div>
           
           {activeTab === "SERVICES" && (
               <div style={{ background: "#111", padding: 15, borderRadius: 8 }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                     <input placeholder="Servicio" value={tempService.name} onChange={e => setTempService({...tempService, name: e.target.value})} style={{ flex: 2, padding: 6, background: "#222", border: "1px solid #444", color: "white" }} />
                     <select value={tempService.type} onChange={e => setTempService({...tempService, type: e.target.value})} style={{ flex: 1, padding: 6, background: "#222", border: "1px solid #444", color: "white" }}>{SERVICE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
                     <input type="number" placeholder="$ Costo" value={tempService.price} onChange={e => setTempService({...tempService, price: e.target.value})} style={{ width: 80, padding: 6, background: "#222", border: "1px solid #444", color: "white" }} />
                     <button onClick={handleAddService} style={{ background: "#4ade80", border: "none", cursor: "pointer", borderRadius: 4, padding: "0 12px", fontWeight:"bold" }}>+</button>
                  </div>
                  <div style={{ display: "grid", gap: 5 }}>{form.services.map((s, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9em", borderBottom: "1px solid #333", padding: 4 }}><span>{s.name}</span><span>${s.price} <span onClick={() => removeService(i)} style={{ color: "red", cursor: "pointer", marginLeft: 8 }}>x</span></span></div>))}</div>
               </div>
           )}

           {activeTab === "LENSES" && (
               <div style={{ background: "#111", padding: 15, borderRadius: 8, border: "1px solid #60a5fa" }}>
                  {!editingLens ? (
                      <>
                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 10}}>
                            <h4 style={{ margin: 0, color: "#60a5fa" }}>Micas Configuradas</h4>
                            <button onClick={handleNewLens} style={{ background: "#60a5fa", color: "black", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>+ Nueva Mica</button>
                        </div>
                        <div style={{display:"grid", gap:10}}>
                            {form.lensCatalog?.map((lens, idx) => (
                                <div key={lens.id} style={{background:"#222", padding:10, borderRadius:6, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                                    <div><div style={{fontWeight:"bold", color:"white"}}>{lens.name}</div><div style={{fontSize:"0.8em", color:"#aaa"}}>{lens.design} · {lens.material} · {lens.treatment}</div></div>
                                    <div style={{display:"flex", gap:10}}><button onClick={() => setEditingLens(lens)} style={{background:"none", border:"1px solid #666", color:"#aaa", cursor:"pointer", borderRadius:4, fontSize:12, padding:"2px 6px"}}>Editar</button><button onClick={() => removeLensFromCatalog(idx)} style={{background:"none", border:"none", color:"#f87171", cursor:"pointer"}}>×</button></div>
                                </div>
                            ))}
                        </div>
                      </>
                  ) : (
                      <div>
                          {/* ... FORMULARIO MICA (Selectores de material usando materialOptions) ... */}
                          <div style={{display:"flex", justifyContent:"space-between", marginBottom:15}}>
                              <h4 style={{margin:0, color:"#fbbf24"}}>Configurando Mica</h4>
                              <button onClick={saveLensToCatalog} style={{background:"#fbbf24", color:"black", border:"none", padding:"4px 12px", borderRadius:4, fontWeight:"bold", cursor:"pointer"}}>Guardar Mica</button>
                          </div>
                          <div style={{display:"grid", gap:10, marginBottom:20, background:"#222", padding:10, borderRadius:8}}>
                              <label style={{fontSize:12, color:"#aaa"}}>Nombre <input value={editingLens.name} onChange={e=>setEditingLens({...editingLens, name:e.target.value})} style={{width:"100%", padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4}} /></label>
                              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10}}>
                                  <label style={{fontSize:12, color:"#aaa"}}>Diseño <select value={editingLens.design} onChange={e=>setEditingLens({...editingLens, design:e.target.value})} style={{width:"100%", padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4}}>{LENS_DESIGNS.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
                                  <label style={{fontSize:12, color:"#aaa"}}>Material <select value={editingLens.material} onChange={e=>setEditingLens({...editingLens, material:e.target.value})} style={{width:"100%", padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4}}>{materialOptions.map(m => (<option key={m.id || m.name} value={m.name}>{m.name} {!m.active && "(Inactivo)"}</option>))}</select></label>
                                  <label style={{fontSize:12, color:"#aaa"}}>Tratamiento <select value={editingLens.treatment} onChange={e=>setEditingLens({...editingLens, treatment:e.target.value})} style={{width:"100%", padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4}}>{LENS_TREATMENTS.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
                              </div>
                          </div>
                          {/* ... MATRIZ ... */}
                          <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr) 80px 80px auto", gap:5, alignItems:"end", marginBottom:5, background:"#222", padding:10, borderRadius:6}}>
                              <label style={{fontSize:10, color:"#aaa"}}>Esf Min<input type="number" step="0.25" value={tempRange.sphMin} onChange={e=>handleRangeChange('sphMin', e.target.value)} onBlur={()=>handleRangeBlur('sphMin')} style={{width:"100%", padding:4, background:"#333", border:"1px solid #555", color:"white"}} /></label>
                              <label style={{fontSize:10, color:"#aaa"}}>Esf Max<input type="number" step="0.25" value={tempRange.sphMax} onChange={e=>handleRangeChange('sphMax', e.target.value)} onBlur={()=>handleRangeBlur('sphMax')} style={{width:"100%", padding:4, background:"#333", border:"1px solid #555", color:"white"}} /></label>
                              <label style={{fontSize:10, color:"#aaa"}}>Cil Min<input type="number" step="0.25" value={tempRange.cylMin} onChange={e=>handleRangeChange('cylMin', e.target.value)} onBlur={()=>handleRangeBlur('cylMin')} style={{width:"100%", padding:4, background:"#333", border:"1px solid #555", color:"white"}} /></label>
                              <label style={{fontSize:10, color:"#aaa"}}>Cil Max<input type="number" step="0.25" value={tempRange.cylMax} onChange={e=>handleRangeChange('cylMax', e.target.value)} onBlur={()=>handleRangeBlur('cylMax')} style={{width:"100%", padding:4, background:"#333", border:"1px solid #555", color:"white"}} /></label>
                              <label style={{fontSize:10, color:"#f87171", fontWeight:"bold"}}>COSTO<input type="number" value={tempRange.cost} onChange={e=>handleRangeChange('cost', e.target.value)} onBlur={()=>handleRangeBlur('cost')} style={{width:"100%", padding:4, background:"#450a0a", border:"1px solid #f87171", color:"white", fontWeight:"bold"}} /></label>
                              <label style={{fontSize:10, color:"#4ade80", fontWeight:"bold"}}>VENTA<input type="number" value={tempRange.price} onChange={e=>handleRangeChange('price', e.target.value)} onBlur={()=>handleRangeBlur('price')} style={{width:"100%", padding:4, background:"#064e3b", border:"1px solid #4ade80", color:"white", fontWeight:"bold"}} /></label>
                              <button onClick={addRangeToLens} style={{background:"#fbbf24", color:"black", border:"none", padding:"6px 10px", borderRadius:4, cursor:"pointer", height:30, alignSelf:"end"}}>✚</button>
                          </div>
                          <div style={{maxHeight:200, overflowY:"auto"}}>
                              <table style={{width:"100%", fontSize:"0.85em", color:"#ccc", borderCollapse:"collapse"}}>
                                  <thead><tr style={{background:"#333", textAlign:"left"}}><th style={{padding:4}}>Esfera</th><th style={{padding:4}}>Cilindro</th><th style={{padding:4, color:"#f87171"}}>Costo</th><th style={{padding:4, color:"#4ade80"}}>Precio</th><th style={{padding:4}}></th></tr></thead>
                                  <tbody>
                                      {editingLens.ranges.map((r, i) => (
                                        <tr key={i} style={{borderBottom:"1px solid #333"}}>
                                            <td style={{padding:4}}>{r.sphMin} a {r.sphMax}</td>
                                            <td style={{padding:4}}>{r.cylMin} a {r.cylMax}</td>
                                            <td style={{padding:4, color:"#f87171"}}>${r.cost}</td>
                                            <td style={{padding:4, color:"#4ade80", fontWeight:"bold"}}>${r.price}</td>
                                            <td style={{padding:4}}><button onClick={() => removeRange(i)} style={{color:"#f87171", background:"none", border:"none", cursor:"pointer"}}>✕</button></td>
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
              <button onClick={handleSaveLab} style={{ background: "#16a34a", color: "white", border: "none", padding: "10px 30px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>GUARDAR LABORATORIO</button>
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
               <button onClick={() => { setForm(l); setIsEditing(true); }} style={{ marginTop: 10, width: "100%", padding: 6, background: "#333", border: "none", color: "white", borderRadius: 4, cursor: "pointer" }}>Administrar Precios</button>
            </div>
         ))}
      </div>
    </div>
  );
}