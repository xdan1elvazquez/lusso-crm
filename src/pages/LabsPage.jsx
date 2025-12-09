import { useState, useEffect, useMemo } from "react";
import { getLabs, createLab, updateLab, deleteLab } from "@/services/labStorage";
import { 
    getLensMaterials, updateLensMaterials,
    getLensTreatments, updateLensTreatments
} from "@/services/settingsStorage";
import { parseDiopter } from "@/utils/rxUtils";
import LoadingState from "@/components/LoadingState";

// UI Kit
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ModalWrapper from "@/components/ui/ModalWrapper";
import Badge from "@/components/ui/Badge";

const LENS_DESIGNS = ["Monofocal", "Bifocal Flat Top", "Bifocal Invisible", "Progresivo", "Ocupacional"];
const SERVICE_TYPES = [{ id: "GENERIC", label: "Genérico" }, { id: "BISEL", label: "Bisel / Montaje" }, { id: "TALLADO", label: "Tallado Digital" }];

// --- GESTOR DE MATERIALES ---
const MaterialsManager = ({ onClose }) => {
    const [materials, setMaterials] = useState([]);
    const [newName, setNewName] = useState("");

    useEffect(() => { getLensMaterials().then(setMaterials); }, []);

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
        setMaterials(next);
        await updateLensMaterials(next);
    };

    return (
        <ModalWrapper title="Configurar Materiales" onClose={onClose} width="500px">
            <div className="flex gap-3 mb-6">
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nuevo material (ej. Hi-Index 1.74)" autoFocus />
                <Button onClick={handleAdd} className="h-auto py-2">Agregar</Button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {materials.map(m => (
                    <div key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${m.active ? "bg-surface border-border" : "bg-transparent border-transparent opacity-50"}`}>
                        <input type="checkbox" checked={m.active} onChange={() => toggleActive(m.id)} className="accent-primary w-4 h-4 cursor-pointer" />
                        <input 
                            value={m.name} 
                            onChange={(e) => handleUpdateName(m.id, e.target.value)} 
                            className="flex-1 bg-transparent border-none text-white focus:ring-0 outline-none text-sm font-medium"
                        />
                        <Badge color={m.active ? "green" : "gray"}>{m.active ? "ACTIVO" : "INACTIVO"}</Badge>
                    </div>
                ))}
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={onClose} variant="ghost">Cerrar</Button>
            </div>
        </ModalWrapper>
    );
};

// --- GESTOR DE TRATAMIENTOS ---
const TreatmentsManager = ({ onClose }) => {
    const [treatments, setTreatments] = useState([]);
    const [newName, setNewName] = useState("");

    useEffect(() => { getLensTreatments().then(setTreatments); }, []);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        const id = newName.toLowerCase().replace(/[^a-z0-9]/g, '_') + "_" + Date.now().toString().slice(-4);
        const next = [...treatments, { id, name: newName.trim(), active: true }];
        await updateLensTreatments(next);
        setTreatments(next);
        setNewName("");
    };

    const toggleActive = async (id) => {
        const next = treatments.map(t => t.id === id ? { ...t, active: !t.active } : t);
        await updateLensTreatments(next);
        setTreatments(next);
    };

    const handleUpdateName = async (id, val) => {
        const next = treatments.map(t => t.id === id ? { ...t, name: val } : t);
        setTreatments(next);
        await updateLensTreatments(next);
    };

    return (
        <ModalWrapper title="Configurar Tratamientos" onClose={onClose} width="500px">
            <div className="flex gap-3 mb-6">
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nuevo tratamiento (ej. Crizal)" autoFocus />
                <Button onClick={handleAdd} className="h-auto py-2">Agregar</Button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {treatments.map(t => (
                    <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${t.active ? "bg-surface border-border" : "bg-transparent border-transparent opacity-50"}`}>
                        <input type="checkbox" checked={t.active} onChange={() => toggleActive(t.id)} className="accent-primary w-4 h-4 cursor-pointer" />
                        <input 
                            value={t.name} 
                            onChange={(e) => handleUpdateName(t.id, e.target.value)} 
                            className="flex-1 bg-transparent border-none text-white focus:ring-0 outline-none text-sm font-medium"
                        />
                        <Badge color={t.active ? "green" : "gray"}>{t.active ? "ACTIVO" : "INACTIVO"}</Badge>
                    </div>
                ))}
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={onClose} variant="ghost">Cerrar</Button>
            </div>
        </ModalWrapper>
    );
};

export default function LabsPage() {
  const [loading, setLoading] = useState(true);
  const [labs, setLabs] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showTreatmentsConfig, setShowTreatmentsConfig] = useState(false);
  
  const [form, setForm] = useState({ id: null, name: "", services: [], lensCatalog: [] });
  const [activeTab, setActiveTab] = useState("SERVICES");
  const [tempService, setTempService] = useState({ name: "", price: "", type: "GENERIC" });
  
  const [editingLens, setEditingLens] = useState(null);
  const [tempRange, setTempRange] = useState({ sphMin: -20, sphMax: 20, cylMin: -6, cylMax: 0, cost: 0, price: 0 });
  
  const [materials, setMaterials] = useState([]);
  const [treatments, setTreatments] = useState([]);

  const refreshData = async () => {
      setLoading(true);
      try {
          const [labsData, matsData, treatsData] = await Promise.all([
              getLabs(), 
              getLensMaterials(),
              getLensTreatments()
          ]);
          setLabs(labsData);
          setMaterials(matsData);
          setTreatments(treatsData);
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { refreshData(); }, [showConfig, showTreatmentsConfig]); 

  const handleSaveLab = async () => {
    if (editingLens) saveLensToCatalog();
    if (form.id) await updateLab(form.id, form); else await createLab(form);
    setIsEditing(false); setEditingLens(null); setForm({ id: null, name: "", services: [], lensCatalog: [] });
    refreshData();
  };

  const handleDeleteLab = async (id) => { if(confirm("¿Borrar laboratorio y sus tarifas?")) { await deleteLab(id); refreshData(); } };
  
  const handleAddService = () => { 
      if(!tempService.name || !tempService.price) return; 
      setForm(prev => ({ ...prev, services: [...prev.services, { id: crypto.randomUUID(), name: tempService.name, price: Number(tempService.price), type: tempService.type || "GENERIC" }] })); 
      setTempService({ name: "", price: "", type: "GENERIC" }); 
  };
  const removeService = (idx) => { setForm(prev => ({ ...prev, services: prev.services.filter((_, i) => i !== idx) })); };

  const handleNewLens = () => { 
      const defaultMat = materials.find(m => m.active)?.name || "CR-39";
      const defaultTreat = treatments.find(t => t.active)?.name || "Blanco";
      setEditingLens({ id: crypto.randomUUID(), name: "", design: "Monofocal", material: defaultMat, treatment: defaultTreat, ranges: [] }); 
  };

  const saveLensToCatalog = () => { 
      if (!editingLens || !editingLens.name) return; 
      let newCatalog = [...(form.lensCatalog || [])]; 
      const index = newCatalog.findIndex(l => l.id === editingLens.id); 
      if (index >= 0) newCatalog[index] = editingLens; else newCatalog.push(editingLens); 
      setForm(f => ({ ...f, lensCatalog: newCatalog })); 
      setEditingLens(null); 
  };
  
  const handleRangeChange = (field, value) => { setTempRange(prev => ({ ...prev, [field]: value })); };
  const handleRangeBlur = (field) => { if (field === 'cost' || field === 'price') setTempRange(prev => ({ ...prev, [field]: Number(prev[field]) || 0 })); else setTempRange(prev => ({ ...prev, [field]: parseDiopter(prev[field]) })); };
  
  const addRangeToLens = () => { 
      if (!editingLens) return; 
      if (Number(tempRange.sphMin) > Number(tempRange.sphMax)) return alert("Esfera Min > Max"); 
      if (Number(tempRange.cylMin) > Number(tempRange.cylMax)) return alert("Cilindro Min > Max"); 
      setEditingLens(prev => ({ ...prev, ranges: [...prev.ranges, { ...tempRange, id: crypto.randomUUID() }] })); 
  };
  
  const removeRange = (idx) => { setEditingLens(prev => ({ ...prev, ranges: prev.ranges.filter((_, i) => i !== idx) })); };
  const removeLensFromCatalog = (idx) => { if(confirm("¿Borrar mica?")) { const newCatalog = form.lensCatalog.filter((_, i) => i !== idx); setForm(f => ({ ...f, lensCatalog: newCatalog })); } };

  const materialOptions = useMemo(() => {
      if (!editingLens) return [];
      const currentVal = editingLens.material;
      const activeMats = materials.filter(m => m.active);
      const currentExists = activeMats.find(m => m.name === currentVal);
      if (currentVal && !currentExists) return [...activeMats, { id: 'legacy_mat', name: currentVal, active: false }];
      return activeMats;
  }, [materials, editingLens]);

  const treatmentOptions = useMemo(() => {
      if (!editingLens) return [];
      const currentVal = editingLens.treatment;
      const activeTreats = treatments.filter(t => t.active);
      const currentExists = activeTreats.find(t => t.name === currentVal);
      if (currentVal && !currentExists) return [...activeTreats, { id: 'legacy_treat', name: currentVal, active: false }];
      return activeTreats;
  }, [treatments, editingLens]);

  if (loading) return <LoadingState />;

  return (
    <div className="page-container space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Laboratorios</h1>
            <p className="text-textMuted text-sm">Gestión de proveedores ópticos y listas de precios</p>
        </div>
        <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowConfig(true)}>⚙️ Materiales</Button>
            <Button variant="secondary" onClick={() => setShowTreatmentsConfig(true)}>⚙️ Tratamientos</Button>
            <Button onClick={() => { setIsEditing(true); setForm({ id: null, name: "", services: [], lensCatalog: [] }); }}>+ Nuevo Lab</Button>
        </div>
      </div>

      {showConfig && <MaterialsManager onClose={() => setShowConfig(false)} />}
      {showTreatmentsConfig && <TreatmentsManager onClose={() => setShowTreatmentsConfig(false)} />}

      {isEditing && (
        <Card className="border-t-4 border-t-primary shadow-glow animate-[fadeIn_0.3s_ease-out]">
           <div className="flex justify-between items-start mb-6 border-b border-border pb-4">
              <div className="w-full max-w-md">
                  <h3 className="text-lg font-bold text-white mb-2">{form.id ? "Editar" : "Registrar"} Proveedor</h3>
                  <Input 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    placeholder="Nombre del Laboratorio (Ej. Lab Augu)" 
                    className="text-lg font-bold"
                  />
              </div>
              <Button variant="ghost" onClick={() => { setIsEditing(false); setEditingLens(null); }}>Cancelar</Button>
           </div>
           
           <div className="flex gap-2 mb-6 p-1 bg-surfaceHighlight rounded-lg w-fit">
               <button onClick={() => setActiveTab("SERVICES")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab==="SERVICES" ? "bg-primary text-white shadow-sm" : "text-textMuted hover:text-white"}`}>🛠️ Servicios Extra</button>
               <button onClick={() => setActiveTab("LENSES")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab==="LENSES" ? "bg-primary text-white shadow-sm" : "text-textMuted hover:text-white"}`}>👓 Catálogo de Micas</button>
           </div>
           
           {activeTab === "SERVICES" && (
               <div className="bg-background rounded-xl p-4 border border-border">
                  <div className="grid grid-cols-[2fr_1fr_100px_auto] gap-3 mb-4 items-end">
                     <Input label="Servicio" placeholder="Ej. Biselado" value={tempService.name} onChange={e => setTempService({...tempService, name: e.target.value})} />
                     <Select label="Tipo" value={tempService.type} onChange={e => setTempService({...tempService, type: e.target.value})}>
                        {SERVICE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                     </Select>
                     <Input label="Costo ($)" type="number" value={tempService.price} onChange={e => setTempService({...tempService, price: e.target.value})} />
                     <Button onClick={handleAddService} className="h-[42px] mb-[1px]">+</Button>
                  </div>
                  <div className="space-y-2">
                      {form.services.map((s, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-surface rounded-lg border border-border">
                              <span className="text-sm font-medium text-white">{s.name} <span className="text-xs text-textMuted ml-2">({s.type})</span></span>
                              <div className="flex items-center gap-4">
                                  <span className="text-emerald-400 font-bold">${s.price}</span>
                                  <button onClick={() => removeService(i)} className="text-red-400 hover:text-red-300">×</button>
                              </div>
                          </div>
                      ))}
                      {form.services.length === 0 && <p className="text-textMuted text-sm italic text-center py-4">Sin servicios registrados.</p>}
                  </div>
               </div>
           )}

           {activeTab === "LENSES" && (
               <div className="bg-background rounded-xl p-4 border border-border">
                  {!editingLens ? (
                      <>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Micas Configuradas</h4>
                            <Button onClick={handleNewLens} variant="secondary" className="text-xs">+ Nueva Mica</Button>
                        </div>
                        <div className="space-y-2">
                            {form.lensCatalog?.map((lens, idx) => (
                                <div key={lens.id} className="flex justify-between items-center p-3 bg-surface hover:bg-surfaceHighlight transition-colors rounded-lg border border-border">
                                    <div>
                                        <div className="font-bold text-white">{lens.name}</div>
                                        <div className="text-xs text-textMuted mt-0.5">{lens.design} · {lens.material} · {lens.treatment}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" onClick={() => setEditingLens(lens)} className="text-xs py-1 px-2 h-auto">Editar</Button>
                                        <button onClick={() => removeLensFromCatalog(idx)} className="text-red-400 hover:bg-red-500/10 p-1 rounded">🗑️</button>
                                    </div>
                                </div>
                            ))}
                            {(!form.lensCatalog || form.lensCatalog.length === 0) && <p className="text-textMuted text-sm italic text-center py-8">No hay micas configuradas.</p>}
                        </div>
                      </>
                  ) : (
                      <div className="animate-[fadeIn_0.3s]">
                          <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
                              <h4 className="font-bold text-amber-400">Configurando Mica</h4>
                              <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setEditingLens(null)}>Atrás</Button>
                                <Button onClick={saveLensToCatalog} variant="primary">Guardar Mica</Button>
                              </div>
                          </div>
                          
                          <div className="grid gap-4 mb-6 p-4 bg-surface rounded-xl border border-border">
                              <Input label="Nombre Comercial" value={editingLens.name} onChange={e=>setEditingLens({...editingLens, name:e.target.value})} placeholder="Ej. CR-39 Terminado AR" />
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <Select label="Diseño" value={editingLens.design} onChange={e=>setEditingLens({...editingLens, design:e.target.value})}>
                                      {LENS_DESIGNS.map(d=><option key={d} value={d}>{d}</option>)}
                                  </Select>
                                  <Select label="Material" value={editingLens.material} onChange={e=>setEditingLens({...editingLens, material:e.target.value})}>
                                      {materialOptions.map(m => (<option key={m.id || m.name} value={m.name}>{m.name} {!m.active && "(Inactivo)"}</option>))}
                                  </Select>
                                  <Select label="Tratamiento" value={editingLens.treatment} onChange={e=>setEditingLens({...editingLens, treatment:e.target.value})}>
                                      {treatmentOptions.map(t => (<option key={t.id || t.name} value={t.name}>{t.name} {!t.active && "(Inactivo)"}</option>))}
                                  </Select>
                              </div>
                          </div>

                          <div className="p-4 bg-surface rounded-xl border border-border">
                              <h5 className="text-xs font-bold text-textMuted uppercase mb-3">Rangos de Graduación y Precio</h5>
                              <div className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end mb-4">
                                  <Input label="Esf Min" type="number" step="0.25" value={tempRange.sphMin} onChange={e=>handleRangeChange('sphMin', e.target.value)} onBlur={()=>handleRangeBlur('sphMin')} />
                                  <Input label="Esf Max" type="number" step="0.25" value={tempRange.sphMax} onChange={e=>handleRangeChange('sphMax', e.target.value)} onBlur={()=>handleRangeBlur('sphMax')} />
                                  <Input label="Cil Min" type="number" step="0.25" value={tempRange.cylMin} onChange={e=>handleRangeChange('cylMin', e.target.value)} onBlur={()=>handleRangeBlur('cylMin')} />
                                  <Input label="Cil Max" type="number" step="0.25" value={tempRange.cylMax} onChange={e=>handleRangeChange('cylMax', e.target.value)} onBlur={()=>handleRangeBlur('cylMax')} />
                                  <Input label="Costo" type="number" value={tempRange.cost} onChange={e=>handleRangeChange('cost', e.target.value)} className="text-red-400 font-bold" />
                                  <Input label="Precio Venta" type="number" value={tempRange.price} onChange={e=>handleRangeChange('price', e.target.value)} className="text-green-400 font-bold" />
                                  <Button onClick={addRangeToLens} className="h-[42px] mb-[1px]">+</Button>
                              </div>

                              <div className="max-h-60 overflow-y-auto custom-scrollbar border border-border rounded-lg">
                                  <table className="w-full text-sm text-left">
                                      <thead className="bg-surfaceHighlight text-textMuted text-xs uppercase sticky top-0">
                                          <tr>
                                              <th className="p-3">Esfera</th>
                                              <th className="p-3">Cilindro</th>
                                              <th className="p-3 text-red-400">Costo</th>
                                              <th className="p-3 text-green-400">Precio</th>
                                              <th className="p-3"></th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border">
                                          {editingLens.ranges.map((r, i) => (
                                            <tr key={i} className="hover:bg-white/5">
                                                <td className="p-3 text-textMain">{r.sphMin} a {r.sphMax}</td>
                                                <td className="p-3 text-textMain">{r.cylMin} a {r.cylMax}</td>
                                                <td className="p-3 text-red-400">${r.cost}</td>
                                                <td className="p-3 text-green-400 font-bold">${r.price}</td>
                                                <td className="p-3 text-right"><button onClick={() => removeRange(i)} className="text-textMuted hover:text-red-400 px-2">×</button></td>
                                            </tr>
                                          ))}
                                      </tbody>
                                  </table>
                                  {editingLens.ranges.length === 0 && <div className="p-4 text-center text-xs text-textMuted italic">Agrega rangos de graduación para definir precios.</div>}
                              </div>
                          </div>
                      </div>
                  )}
               </div>
           )}

           <div className="mt-6 flex justify-end pt-4 border-t border-border">
              <Button onClick={handleSaveLab} variant="primary" className="px-8 shadow-lg shadow-green-900/20">GUARDAR LABORATORIO</Button>
           </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
         {labs.map(l => (
            <Card key={l.id} className="group hover:border-primary/50 transition-colors cursor-pointer relative" noPadding>
               <div className="p-5">
                   <div className="flex justify-between items-start mb-2">
                       <h3 className="font-bold text-white text-lg truncate">{l.name}</h3>
                       <button onClick={(e) => { e.stopPropagation(); handleDeleteLab(l.id); }} className="text-textMuted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
                   </div>
                   <div className="text-sm text-textMuted mb-4">
                       {l.lensCatalog?.length || 0} micas configuradas
                   </div>
                   <Button onClick={() => { setForm(l); setIsEditing(true); }} variant="secondary" className="w-full text-xs">Administrar Precios</Button>
               </div>
            </Card>
         ))}
      </div>
    </div>
  );
}