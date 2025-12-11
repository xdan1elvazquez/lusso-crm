import React, { useMemo, useState, useEffect } from "react";
import { 
  getExamsByPatient, 
  getExamsByConsultation, 
  createEyeExam, 
  updateEyeExam, 
  deleteEyeExam 
} from "@/services/eyeExamStorage"; 
import { getLabs } from "@/services/labStorage"; // 👈 Importar Storage de Labs
import { getCatalogOptions } from "@/utils/lensMatcher"; // 👈 Importar Helper
import RxPicker from "@/components/RxPicker";
import { normalizeRxValue } from "@/utils/rxOptions";
import { validateRx } from "@/utils/validators";

// UI Kit
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import LoadingState from "@/components/LoadingState";

const TABS = { PRELIM: "prelim", REFRACTION: "refraction", CONTACT: "contact" };

// Helper visual para Porcentajes AV
function getVaPercentage(value) {
  if (!value || typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase();
  if (clean.includes('/')) {
    const [num, den] = clean.split('/');
    const n = parseFloat(num);
    const d = parseFloat(den);
    if (!isNaN(n) && !isNaN(d) && d !== 0) return Math.min(Math.round((n / d) * 100), 100);
  }
  const decimal = parseFloat(clean);
  if (!isNaN(decimal)) {
    if (decimal <= 2.0) return Math.round(decimal * 100);
    if (decimal >= 10) return Math.round((20 / decimal) * 100);
  }
  return null;
}

const TabButton = ({ id, label, activeTab, setActiveTab }) => (
  <button 
    type="button"
    onClick={() => setActiveTab(id)}
    className={`
      flex-1 py-3 text-sm font-medium transition-colors border-b-2 
      ${activeTab === id 
        ? "border-primary text-primary bg-surfaceHighlight/10" 
        : "border-transparent text-textMuted hover:text-white hover:bg-surfaceHighlight/5"
      }
    `}
  >
    {label}
  </button>
);

const AvInput = ({ label, valOD, valOS, valAO, onChange, prevData }) => {
  const RenderDiff = ({ current, prev }) => {
    if (!prev) return null;
    const prevPct = getVaPercentage(prev);
    if (!current) return <span className="text-xs text-textMuted ml-1 opacity-50">(Prev: {prev})</span>;
    const currPct = getVaPercentage(current);
    if (prevPct !== null && currPct !== null) {
        const diff = currPct - prevPct;
        if (diff > 0) return <span className="text-[10px] text-emerald-400 ml-1">▲{currPct}%</span>;
        if (diff < 0) return <span className="text-[10px] text-red-400 ml-1">▼{currPct}%</span>;
    }
    return null;
  };

  return (
    <div className="bg-surfaceHighlight/20 p-3 rounded-lg border border-border">
      <div className="text-xs font-bold text-textMuted uppercase mb-2">{label}</div>
      <div className="grid grid-cols-3 gap-3">
        <label>
           <span className="text-[10px] text-blue-400 font-bold block mb-1">OD <RenderDiff current={valOD} prev={prevData?.od} /></span>
           <input value={valOD} onChange={e => onChange('od', e.target.value)} className="w-full bg-background border border-border rounded px-2 py-1 text-sm focus:border-blue-500 outline-none text-center text-white" placeholder="20/..." />
        </label>
        <label>
           <span className="text-[10px] text-green-400 font-bold block mb-1">OS <RenderDiff current={valOS} prev={prevData?.os} /></span>
           <input value={valOS} onChange={e => onChange('os', e.target.value)} className="w-full bg-background border border-border rounded px-2 py-1 text-sm focus:border-green-500 outline-none text-center text-white" placeholder="20/..." />
        </label>
        <label>
           <span className="text-[10px] text-white font-bold block mb-1">AO <RenderDiff current={valAO} prev={prevData?.ao} /></span>
           <input value={valAO} onChange={e => onChange('ao', e.target.value)} className="w-full bg-background border border-border rounded px-2 py-1 text-sm focus:border-white outline-none text-center text-white" placeholder="20/..." />
        </label>
      </div>
    </div>
  );
};

export default function EyeExamsPanel({ patientId, consultationId = null, onSell }) {
  const [loading, setLoading] = useState(true);
  const [allExams, setAllExams] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.PRELIM);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  
  // Estados iniciales robustos
  const [prelim, setPrelim] = useState({ avsc: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } }, avcc: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } }, cv: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } }, ishihara: "", motility: "", lensometry: normalizeRxValue() });
  const [refraction, setRefraction] = useState({ autorefrac: { od: "", os: "" }, finalRx: normalizeRxValue(), finalAv: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } } });
  const [cl, setCl] = useState({ keratometry: { od: { k1:"", k2:"", axis:"" }, os: { k1:"", k2:"", axis:"" } }, trial: { od: { baseCurve:"", diameter:"", power:"", av:"", overRefraction:"" }, os: { baseCurve:"", diameter:"", power:"", av:"", overRefraction:"" }, notes: "" }, final: { design: "", brand: "", od: { baseCurve:"", diameter:"", power:"" }, os: { baseCurve:"", diameter:"", power:"" } } });
  const [recs, setRecs] = useState({ design: "", material: "", coating: "", usage: "" });

  // Estado para el catálogo
  const [catalogOptions, setCatalogOptions] = useState({ designs: [], materials: [], treatments: [] });

  // 🔥 CORRECCIÓN: Cargar catálogo de forma ASÍNCRONA (Esto arregla el error de pantalla blanca)
  useEffect(() => {
    const loadCatalog = async () => {
        try {
            const labs = await getLabs(); // Ahora esperamos a la promesa
            const fullCatalog = labs.flatMap(l => l.lensCatalog || []);
            setCatalogOptions(getCatalogOptions(fullCatalog));
        } catch (error) {
            console.error("Error cargando catálogo en EyeExams:", error);
        }
    };
    loadCatalog();
  }, []);

  const refreshData = async () => {
      setLoading(true);
      try {
          let data = [];
          if (consultationId) data = await getExamsByConsultation(consultationId);
          else data = await getExamsByPatient(patientId);
          setAllExams(data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { refreshData(); }, [patientId, consultationId]);

  const prevExam = useMemo(() => allExams.find(e => e.id !== editingId), [allExams, editingId]);
  const paginated = allExams.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(allExams.length / ITEMS_PER_PAGE);

  const resetForm = () => {
    setFormDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setPrelim({ avsc: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } }, avcc: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } }, cv: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } }, ishihara: "", motility: "", lensometry: normalizeRxValue() });
    setRefraction({ autorefrac: { od: "", os: "" }, finalRx: normalizeRxValue(), finalAv: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } } });
    setCl({ keratometry: { od: { k1:"", k2:"", axis:"" }, os: { k1:"", k2:"", axis:"" } }, trial: { od: { baseCurve:"", diameter:"", power:"", av:"", overRefraction:"" }, os: { baseCurve:"", diameter:"", power:"", av:"", overRefraction:"" }, notes: "" }, final: { design: "", brand: "", od: { baseCurve:"", diameter:"", power:"" }, os: { baseCurve:"", diameter:"", power:"" } } });
    setRecs({ design: "", material: "", coating: "", usage: "" });
    setEditingId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { patientId, consultationId: consultationId || null, examDate: formDate, preliminary: prelim, refraction: refraction, contactLens: cl, recommendations: recs, notes: notes };
    if (editingId) await updateEyeExam(editingId, payload); else await createEyeExam(payload);
    resetForm(); setIsCreating(false); refreshData();
  };

  const handleEdit = (exam) => {
    setEditingId(exam.id);
    setFormDate(new Date(exam.examDate).toISOString().slice(0, 10));
    setNotes(exam.notes || "");
    setPrelim({ ...exam.preliminary, avsc: exam.preliminary?.avsc || prelim.avsc, avcc: exam.preliminary?.avcc || prelim.avcc, cv: exam.preliminary?.cv || prelim.cv });
    setRefraction(exam.refraction || refraction);
    setCl(exam.contactLens || cl);
    setRecs(exam.recommendations || recs);
    setIsCreating(true);
  };

  const handleDelete = async (id) => { if(confirm("¿Eliminar?")) { await deleteEyeExam(id); refreshData(); } };

  return (
    <Card className={`transition-all duration-300 ${consultationId ? "border-dashed border-primary/30" : ""}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
            👁️ {consultationId ? "Examen de la Vista (Vinculado)" : `Exámenes de Vista (${allExams.length})`}
        </h2>
        <Button onClick={() => { resetForm(); setIsCreating(!isCreating); }} variant={isCreating ? "ghost" : "primary"}>
          {isCreating ? "Cancelar" : "+ Nuevo Examen"}
        </Button>
      </div>

      {isCreating && (
        <div className="bg-background rounded-xl border border-border overflow-hidden mb-6 animate-fadeIn">
           <div className="flex border-b border-border bg-surfaceHighlight/10">
              <TabButton id={TABS.PRELIM} label="1. Preliminares" activeTab={activeTab} setActiveTab={setActiveTab} />
              <TabButton id={TABS.REFRACTION} label="2. Refracción" activeTab={activeTab} setActiveTab={setActiveTab} />
              <TabButton id={TABS.CONTACT} label="3. Lentes de Contacto" activeTab={activeTab} setActiveTab={setActiveTab} />
           </div>
           
           <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="flex gap-4">
                 <Input label="Fecha" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-auto" />
              </div>

              {/* 1. PRELIMINARES */}
              {activeTab === TABS.PRELIM && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                   <div className="space-y-4">
                      <h4 className="text-sm font-bold text-amber-400 border-b border-amber-500/30 pb-2">Agudeza Visual Entrada (SC)</h4>
                      <AvInput label="Lejos" valOD={prelim.avsc.far.od} valOS={prelim.avsc.far.os} valAO={prelim.avsc.far.ao} 
                        onChange={(eye, v) => setPrelim(p => ({...p, avsc: {...p.avsc, far: {...p.avsc.far, [eye]: v}}}))} prevData={prevExam?.preliminary?.avsc?.far} />
                      <AvInput label="Cerca" valOD={prelim.avsc.near.od} valOS={prelim.avsc.near.os} valAO={prelim.avsc.near.ao} 
                        onChange={(eye, v) => setPrelim(p => ({...p, avsc: {...p.avsc, near: {...p.avsc.near, [eye]: v}}}))} prevData={prevExam?.preliminary?.avsc?.near} />
                   </div>
                   <div className="space-y-4">
                      <h4 className="text-sm font-bold text-blue-400 border-b border-blue-500/30 pb-2">Capacidad Visual (Pin Hole)</h4>
                      <AvInput label="Lejos" valOD={prelim.cv.far.od} valOS={prelim.cv.far.os} valAO={prelim.cv.far.ao} 
                        onChange={(eye, v) => setPrelim(p => ({...p, cv: {...p.cv, far: {...p.cv.far, [eye]: v}}}))} prevData={prevExam?.preliminary?.cv?.far} />
                      
                      <Input label="Ishihara / Test Color" value={prelim.ishihara} onChange={e => setPrelim(p => ({...p, ishihara: e.target.value}))} />
                   </div>
                </div>
              )}

              {/* 2. REFRACCIÓN */}
              {activeTab === TABS.REFRACTION && (
                <div className="space-y-6 animate-fadeIn">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surfaceHighlight/20 p-4 rounded-xl">
                      <Input label="Autorefractómetro OD" value={refraction.autorefrac.od} onChange={e => setRefraction(r => ({...r, autorefrac: {...r.autorefrac, od: e.target.value}}))} placeholder="-2.00 -0.50 x 180" />
                      <Input label="Autorefractómetro OS" value={refraction.autorefrac.os} onChange={e => setRefraction(r => ({...r, autorefrac: {...r.autorefrac, os: e.target.value}}))} placeholder="-2.00 -0.50 x 180" />
                   </div>
                   
                   <div className="bg-surfaceHighlight/10 p-5 rounded-xl border border-emerald-500/30">
                      <h4 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">👓 Refracción Final (Rx)</h4>
                      <RxPicker value={refraction.finalRx} onChange={v => setRefraction(r => ({...r, finalRx: v}))} />
                      <div className="mt-6 pt-4 border-t border-border">
                          <h5 className="text-xs font-bold text-emerald-300 mb-3">Agudeza Visual Final (Con Rx)</h5>
                          <AvInput label="Lejos" valOD={refraction.finalAv.far.od} valOS={refraction.finalAv.far.os} valAO={refraction.finalAv.far.ao} 
                            onChange={(eye, v) => setRefraction(r => ({...r, finalAv: {...r.finalAv, far: {...r.finalAv.far, [eye]: v}}}))} prevData={prevExam?.refraction?.finalAv?.far} />
                      </div>
                   </div>

                   <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-500/30">
                      <h4 className="text-indigo-300 font-bold mb-3">Recomendación (Catálogo)</h4>
                      <div className="grid grid-cols-2 gap-4">
                         
                         {/* SELECTOR DISEÑO */}
                         <label className="block">
                             <span className="text-[10px] text-textMuted uppercase mb-1 block font-bold">Diseño</span>
                             <select 
                                 value={recs.design} 
                                 onChange={e => setRecs({...recs, design: e.target.value})}
                                 className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-white focus:border-primary outline-none cursor-pointer"
                             >
                                 <option value="">-- Indistinto --</option>
                                 {catalogOptions.designs.map(d => <option key={d} value={d}>{d}</option>)}
                             </select>
                         </label>

                         {/* SELECTOR MATERIAL */}
                         <label className="block">
                             <span className="text-[10px] text-textMuted uppercase mb-1 block font-bold">Material</span>
                             <select 
                                 value={recs.material} 
                                 onChange={e => setRecs({...recs, material: e.target.value})}
                                 className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-white focus:border-primary outline-none cursor-pointer"
                             >
                                 <option value="">-- Indistinto --</option>
                                 {catalogOptions.materials.map(m => <option key={m} value={m}>{m}</option>)}
                             </select>
                         </label>

                         {/* SELECTOR TRATAMIENTO */}
                         <label className="block">
                             <span className="text-[10px] text-textMuted uppercase mb-1 block font-bold">Tratamiento</span>
                             <select 
                                 value={recs.coating} 
                                 onChange={e => setRecs({...recs, coating: e.target.value})}
                                 className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-white focus:border-primary outline-none cursor-pointer"
                             >
                                 <option value="">-- Indistinto --</option>
                                 {catalogOptions.treatments.map(t => <option key={t} value={t}>{t}</option>)}
                             </select>
                         </label>
                         
                         {/* USO SUGERIDO (Mantenemos Input) */}
                         <Input 
                            label="Uso Sugerido" 
                            placeholder="Ej. Permanente, Lectura..." 
                            value={recs.usage} 
                            onChange={e => setRecs({...recs, usage: e.target.value})} 
                         />
                      </div>
                   </div>
                </div>
              )}

              {/* 3. LENTES DE CONTACTO (RESTAURADO Y ESTILIZADO) */}
              {activeTab === TABS.CONTACT && (
                <div className="space-y-6 animate-fadeIn">
                    
                    {/* QUERATOMETRÍA */}
                    <div className="bg-surfaceHighlight/20 p-4 rounded-xl border border-border">
                        <h4 className="text-sm font-bold text-pink-400 border-b border-pink-500/30 pb-2 mb-3">1. Queratometría</h4>
                        
                        {/* OD */}
                        <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-3 mb-3 items-center">
                            <span className="text-sm font-bold text-blue-400">OD</span>
                            <Input placeholder="K1" value={cl.keratometry.od.k1} onChange={e => setCl(c => ({...c, keratometry: {...c.keratometry, od: {...c.keratometry.od, k1: e.target.value}}}))} className="h-8 text-xs text-center" />
                            <Input placeholder="K2" value={cl.keratometry.od.k2} onChange={e => setCl(c => ({...c, keratometry: {...c.keratometry, od: {...c.keratometry.od, k2: e.target.value}}}))} className="h-8 text-xs text-center" />
                            <Input placeholder="Eje" value={cl.keratometry.od.axis} onChange={e => setCl(c => ({...c, keratometry: {...c.keratometry, od: {...c.keratometry.od, axis: e.target.value}}}))} className="h-8 text-xs text-center" />
                        </div>
                        
                        {/* OS */}
                        <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-3 items-center">
                            <span className="text-sm font-bold text-green-400">OS</span>
                            <Input placeholder="K1" value={cl.keratometry.os.k1} onChange={e => setCl(c => ({...c, keratometry: {...c.keratometry, os: {...c.keratometry.os, k1: e.target.value}}}))} className="h-8 text-xs text-center" />
                            <Input placeholder="K2" value={cl.keratometry.os.k2} onChange={e => setCl(c => ({...c, keratometry: {...c.keratometry, os: {...c.keratometry.os, k2: e.target.value}}}))} className="h-8 text-xs text-center" />
                            <Input placeholder="Eje" value={cl.keratometry.os.axis} onChange={e => setCl(c => ({...c, keratometry: {...c.keratometry, os: {...c.keratometry.os, axis: e.target.value}}}))} className="h-8 text-xs text-center" />
                        </div>
                    </div>

                    {/* LENTE DE PRUEBA */}
                    <div className="bg-surfaceHighlight/10 p-4 rounded-xl border border-border">
                        <h4 className="text-sm font-bold text-pink-400 border-b border-pink-500/30 pb-2 mb-3">2. Lente de Prueba</h4>
                        
                        {/* HEADER TABLA */}
                        <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr] gap-3 mb-2 text-[10px] text-textMuted font-bold uppercase text-center">
                            <span></span>
                            <span>Curva Base</span>
                            <span>Diámetro</span>
                            <span>Poder</span>
                            <span>Sobre-Rx</span>
                        </div>

                        {/* OD */}
                        <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr] gap-3 mb-3 items-center">
                            <span className="text-sm font-bold text-blue-400">OD</span>
                            <Input placeholder="CB" value={cl.trial.od.baseCurve} onChange={e => setCl(c => ({...c, trial: {...c.trial, od: {...c.trial.od, baseCurve: e.target.value}}}))} className="h-8 text-xs text-center" />
                            <Input placeholder="DIA" value={cl.trial.od.diameter} onChange={e => setCl(c => ({...c, trial: {...c.trial, od: {...c.trial.od, diameter: e.target.value}}}))} className="h-8 text-xs text-center" />
                            <Input placeholder="PWR" value={cl.trial.od.power} onChange={e => setCl(c => ({...c, trial: {...c.trial, od: {...c.trial.od, power: e.target.value}}}))} className="h-8 text-xs text-center" />
                            <Input placeholder="S-Rx" value={cl.trial.od.overRefraction} onChange={e => setCl(c => ({...c, trial: {...c.trial, od: {...c.trial.od, overRefraction: e.target.value}}}))} className="h-8 text-xs text-center" />
                        </div>

                        {/* OS */}
                        <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr] gap-3 items-center mb-4">
                            <span className="text-sm font-bold text-green-400">OS</span>
                            <Input placeholder="CB" value={cl.trial.os.baseCurve} onChange={e => setCl(c => ({...c, trial: {...c.trial, os: {...c.trial.os, baseCurve: e.target.value}}}))} className="h-8 text-xs text-center" />
                            <Input placeholder="DIA" value={cl.trial.os.diameter} onChange={e => setCl(c => ({...c, trial: {...c.trial, os: {...c.trial.os, diameter: e.target.value}}}))} className="h-8 text-xs text-center" />
                            <Input placeholder="PWR" value={cl.trial.os.power} onChange={e => setCl(c => ({...c, trial: {...c.trial, os: {...c.trial.os, power: e.target.value}}}))} className="h-8 text-xs text-center" />
                            <Input placeholder="S-Rx" value={cl.trial.os.overRefraction} onChange={e => setCl(c => ({...c, trial: {...c.trial, os: {...c.trial.os, overRefraction: e.target.value}}}))} className="h-8 text-xs text-center" />
                        </div>

                        <Input label="Notas de Adaptación" value={cl.trial.notes} onChange={e => setCl(c => ({...c, trial: {...c.trial, notes: e.target.value}}))} placeholder="Movimiento, centrado, comodidad..." />
                    </div>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                 <label className="block text-xs font-bold text-textMuted uppercase mb-2">Observaciones Generales</label>
                 <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-surface border border-border rounded-xl p-3 text-textMain focus:border-primary outline-none resize-none" />
                 <Button type="submit" variant="primary" className="w-full mt-4">
                    {editingId ? "Actualizar Examen" : "Guardar Examen"}
                 </Button>
              </div>
           </form>
        </div>
      )}

      {loading ? <LoadingState /> : (
          <div className="space-y-3">
            {paginated.length === 0 ? <p className="text-textMuted text-sm italic">No hay registros.</p> : 
            paginated.map(exam => (
                <div key={exam.id} className="border border-border rounded-xl p-4 bg-surface hover:border-primary/40 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <strong className="text-white block">{new Date(exam.examDate).toLocaleDateString()}</strong>
                            <div className="flex gap-2 mt-1">
                                {!consultationId && <Badge color={exam.consultationId ? "blue" : "green"}>{exam.consultationId ? "Vinculado" : "Independiente"}</Badge>}
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" onClick={() => onSell && onSell(exam)} className="text-green-400 hover:text-green-300 py-1 px-2 text-xs">🛒 Vender</Button>
                            <Button variant="ghost" onClick={() => handleEdit(exam)} className="py-1 px-2 text-xs">Editar</Button>
                            <Button variant="ghost" onClick={() => handleDelete(exam.id)} className="text-red-400 py-1 px-2 text-xs">×</Button>
                        </div>
                    </div>
                    <div className="text-sm text-textMuted grid gap-1 font-mono bg-background p-2 rounded border border-border/50">
                        <div className="flex gap-4">
                            <span><span className="text-blue-400 font-bold">OD:</span> {exam.refraction?.finalRx?.od?.sph} / {exam.refraction?.finalRx?.od?.cyl}</span>
                            <span><span className="text-green-400 font-bold">OI:</span> {exam.refraction?.finalRx?.os?.sph} / {exam.refraction?.finalRx?.os?.cyl}</span>
                        </div>
                        {exam.preliminary?.avsc?.far?.od && <div className="text-xs opacity-70 mt-1">AV Entrada: {exam.preliminary.avsc.far.od} (OD) / {exam.preliminary.avsc.far.os} (OS)</div>}
                    </div>
                </div>
            ))}
          </div>
      )}
      
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded bg-surface border border-border disabled:opacity-50">←</button>
            <span className="text-sm self-center text-textMuted">{page} / {totalPages}</span>
            <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded bg-surface border border-border disabled:opacity-50">→</button>
        </div>
      )}
    </Card>
  );
}