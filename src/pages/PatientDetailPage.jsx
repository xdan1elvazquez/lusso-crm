import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext"; 
import { 
  getPatientById, 
  updatePatient, 
  getPatientsRecommendedBy,
  touchPatientView,
  setPatientPoints,
  getPatients // Para buscador de referidos
} from "@/services/patientsStorage";
import { getReferralSources } from "@/services/settingsStorage";
import { generateInformedConsentPDF } from "@/utils/pdfGenerator"; 

// Servicios para Timeline
import { getConsultationsByPatient } from "@/services/consultationsStorage";
import { getExamsByPatient } from "@/services/eyeExamStorage";

// Paneles Clínicos
import ConsultationsPanel from "@/components/ConsultationsPanel";
import EyeExamsPanel from "@/components/EyeExamsPanel";
import AnamnesisPanel from "@/components/AnamnesisPanel";
import SalesPanel from "@/components/SalesPanel";
import StudiesPanel from "@/components/StudiesPanel";
import PatientTimeline from "@/components/PatientTimeline"; // Timeline Visual

import { handlePhoneInput } from "@/utils/inputHandlers";
import LoadingState from "@/components/LoadingState";

// UI Components
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";

// Iconos
import { Users, Gift, Copy, FileText, Clock, Calendar, Activity, Edit2, UserCheck } from "lucide-react"; 

// --- HELPERS ---
function toDateInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formatDateTime(isoString) {
  if (!isoString) return "N/D";
  return new Date(isoString).toLocaleString("es-MX", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
}

function getPatientAge(dateString) {
  if (!dateString) return null;
  const target = dateString.includes("T") ? new Date(dateString) : new Date(dateString + "T12:00:00");
  const now = new Date();
  if (isNaN(target.getTime())) return null;
  let age = now.getFullYear() - target.getFullYear();
  const m = now.getMonth() - target.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < target.getDate())) age--;
  return age;
}

function getRelativeTime(dateString) {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days < 1) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  if (days < 365) return `Hace ${Math.floor(days/30)} meses`;
  return `Hace ${Math.floor(days/365)} años`;
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const { currentBranch, role } = useAuth(); 
  
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [referrer, setReferrer] = useState(null); 
  const [recommendedList, setRecommendedList] = useState([]);
  const [salePrefill, setSalePrefill] = useState(null);
  
  // Datos Timeline
  const [timelineConsultations, setTimelineConsultations] = useState([]);
  const [timelineExams, setTimelineExams] = useState([]);

  const [isIdentityOpen, setIsIdentityOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); 
  const [form, setForm] = useState({});
  const [sources, setSources] = useState([]);

  const [editingPoints, setEditingPoints] = useState(false);
  const [newPointsVal, setNewPointsVal] = useState("");

  // Búsqueda de Referidos (En Edición)
  const [allPatients, setAllPatients] = useState([]);
  const [referrerSearch, setReferrerSearch] = useState("");
  const [showReferrerList, setShowReferrerList] = useState(false);

  const calculatedAge = getPatientAge(form?.dob);

  useEffect(() => {
    async function loadData() {
        setLoading(true);
        try {
            const [p, sourcesData] = await Promise.all([
                getPatientById(id),
                getReferralSources()
            ]);
            setPatient(p);
            setSources(Array.isArray(sourcesData) ? sourcesData : []);
            
            if (p) {
                touchPatientView(id);
                setForm({ 
                    firstName: p.firstName, 
                    lastName: p.lastName, 
                    curp: p.curp || "", 
                    email: p.email,
                    phone: p.phone, 
                    homePhone: p.homePhone || "", 
                    dob: p.dob || "", 
                    assignedSex: p.assignedSex || p.sex || "NO_ESPECIFICADO",
                    genderExpression: p.genderExpression || "", 
                    maritalStatus: p.maritalStatus || "SOLTERO",
                    religion: p.religion || "", 
                    reliability: p.reliability || "BUENA",
                    occupation: p.occupation || "", 
                    referralSource: p.referralSource || "",
                    referredBy: p.referredBy || "", 
                    createdAt: toDateInput(p.createdAt),
                    rfc: p.taxData?.rfc || "", 
                    razonSocial: p.taxData?.razonSocial || "",
                    regimen: p.taxData?.regimen || "", 
                    cp: p.taxData?.cp || "",
                    emailFactura: p.taxData?.emailFactura || p.email || "",
                    street: p.address?.street || "", 
                    externalNumber: p.address?.externalNumber || "", 
                    internalNumber: p.address?.internalNumber || "", 
                    suburb: p.address?.suburb || "", 
                    city: p.address?.city || "", 
                    state: p.address?.state || "", 
                    zip: p.address?.zip || ""
                });

                // Carga Historial (Paralelo para velocidad)
                const [recs, cons, exams] = await Promise.all([
                    getPatientsRecommendedBy(id),
                    getConsultationsByPatient(id),
                    getExamsByPatient(id)
                ]);
                setRecommendedList(recs);
                setTimelineConsultations(cons);
                setTimelineExams(exams);

                if (p.referredBy) {
                    const refData = await getPatientById(p.referredBy);
                    setReferrer(refData);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    loadData();
  }, [id]);

  // Cargar directorio solo si va a buscar padrino
  const loadAllPatientsForSearch = async () => {
      if (allPatients.length > 0) return;
      try {
          const list = await getPatients();
          setAllPatients(list);
      } catch (e) { console.error(e); }
  };

  const potentialReferrers = allPatients.filter(p => {
      if (!referrerSearch || referrerSearch.length < 2) return false;
      const s = referrerSearch.toLowerCase();
      if (p.id === id) return false; // No auto-referirse
      return `${p.firstName} ${p.lastName}`.toLowerCase().includes(s) || p.phone?.includes(s);
  }).slice(0, 5);

  const onSave = async () => {
    let finalCreatedAt = patient.createdAt;
    if (form.createdAt !== toDateInput(patient.createdAt)) {
       finalCreatedAt = new Date(form.createdAt + "T12:00:00").toISOString();
    }
    
    const payload = {
        ...form,
        createdAt: finalCreatedAt,
        taxData: { 
            rfc: form.rfc, razonSocial: form.razonSocial, 
            regimen: form.regimen, cp: form.cp, emailFactura: form.emailFactura 
        },
        address: { 
            street: form.street, externalNumber: form.externalNumber, 
            internalNumber: form.internalNumber, suburb: form.suburb, 
            city: form.city, state: form.state, zip: form.zip 
        }
    };

    try {
        await updatePatient(id, payload);
        // Actualizamos estado local SIN recargar toda la página para evitar crash
        setPatient(prev => ({ ...prev, ...payload }));
        
        // Actualizar visualmente el padrino si cambió
        if (payload.referredBy && payload.referredBy !== patient.referredBy) {
            const refData = await getPatientById(payload.referredBy);
            setReferrer(refData);
        } else if (!payload.referredBy) {
            setReferrer(null);
        }

        alert("✅ Ficha actualizada correctamente");
    } catch (e) {
        console.error("Error saving patient:", e);
        alert("Error al guardar cambios");
    }
  };

  const handlePrintConsent = () => {
    const patientDataForPdf = { ...patient, ...form, id: patient.id };
    generateInformedConsentPDF(patientDataForPdf, currentBranch);
  };

  const handleSellFromExam = (exam) => { 
      setSalePrefill({ type: 'EXAM', data: exam }); 
      setTimeout(() => {
        const salesElement = document.getElementById("sales-section");
        if(salesElement) salesElement.scrollIntoView({ behavior: "smooth" });
      }, 100);
  };

  const handleUpdatePoints = async () => {
    if (newPointsVal === "") return;
    try {
        await setPatientPoints(id, newPointsVal);
        setPatient(prev => ({ ...prev, points: Number(newPointsVal) }));
        setEditingPoints(false);
        alert("Puntos actualizados.");
    } catch (e) {
        alert("Error: " + e.message);
    }
  };

  if (loading) return <LoadingState />;
  if (!patient) return <div className="p-10 text-center text-textMuted">Paciente no encontrado.</div>;

  // Helper para nombre del referido en edición
  const selectedReferrerName = referrer ? `${referrer.firstName} ${referrer.lastName}` : (
      form.referredBy && allPatients.find(p => p.id === form.referredBy) ? `${allPatients.find(p => p.id === form.referredBy).firstName} ${allPatients.find(p => p.id === form.referredBy).lastName}` : "Desconocido"
  );

  return (
    <div className="page-container space-y-8">
      
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-textMuted">
            <Link to="/patients" className="hover:text-white transition-colors">Pacientes</Link>
            <span>/</span>
            <span className="text-white">Detalle</span>
        </div>
      </div>

      {/* HERO CARD (HEADER) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/20 shadow-glow p-6 md:p-8">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-8 items-center">
             
             {/* 1. FOTO Y NOMBRE */}
             <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-blue-900/50 uppercase shrink-0">
                    {patient.firstName.charAt(0)}
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">{patient.firstName} <br/> {patient.lastName}</h1>
                    <div className="flex flex-wrap gap-3 mt-3 items-center">
                        {calculatedAge !== null && (
                            <Badge color="blue" className="text-sm px-3 py-1 bg-blue-500/20 border-blue-500/30 text-blue-200">
                                {calculatedAge} Años
                            </Badge>
                        )}
                        <span className="text-textMuted text-sm flex items-center gap-1">🎂 {form.dob || "N/A"}</span>
                        
                        <div className="relative group cursor-pointer" onClick={() => { setNewPointsVal(patient.points); setEditingPoints(true); }}>
                            <Badge color="yellow" className="text-yellow-300 border-yellow-500/30 font-bold hover:bg-yellow-500/20 transition-colors flex items-center gap-2">
                                💎 {patient.points?.toLocaleString() || 0} Puntos
                                <span className="text-[10px] opacity-0 group-hover:opacity-100 bg-black/50 px-1 rounded">✏️</span>
                            </Badge>
                        </div>
                    </div>
                </div>
             </div>
             
             {/* 2. DATOS DE AUDITORÍA Y ORIGEN */}
             <div className="flex flex-col gap-2 border-l border-white/10 pl-6 lg:ml-auto text-sm">
                <div className="flex items-center gap-2 text-textMuted">
                    <Clock size={14} className="text-blue-400" /> 
                    <span>Acceso: <span className="text-white font-mono">{formatDateTime(patient.lastViewed)}</span></span>
                </div>
                <div className="flex items-center gap-2 text-textMuted">
                    <Calendar size={14} className="text-emerald-400" /> 
                    <span>Alta: <span className="text-white">{new Date(patient.createdAt).toLocaleDateString()}</span> <span className="text-xs opacity-60">({getRelativeTime(patient.createdAt)})</span></span>
                </div>
                <div className="flex items-center gap-2 text-textMuted">
                    <Activity size={14} className="text-amber-400" /> 
                    <span>Actualizado: <span className="text-white">{formatDateTime(patient.updatedAt)}</span></span>
                </div>
                <div className="mt-1">
                     <Badge color="gray" className="text-xs">{patient.referralSource || "Origen: Desconocido"}</Badge>
                </div>
             </div>

             {/* 3. BOTÓN DE CONSENTIMIENTO */}
             <div className="flex flex-col gap-2">
                <Button 
                    onClick={handlePrintConsent} 
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-2 h-12 px-6"
                >
                    <FileText size={18} />
                    <span>Consentimiento NOM-024</span>
                </Button>
                {patient.referralCode && (
                     <div className="text-center">
                        <Badge color="purple" className="text-purple-300 border-purple-500/30 font-mono tracking-wider text-xs">
                             🎫 {patient.referralCode}
                        </Badge>
                     </div>
                )}
             </div>
         </div>
      </div>

      {/* FICHA EXPANDIBLE (DATOS, LEALTAD) */}
      <Card className="overflow-hidden">
        <div className="flex border-b border-border">
             <button onClick={() => { setActiveTab("general"); setIsIdentityOpen(true); }} className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === "general" && isIdentityOpen ? "bg-white/5 text-primary border-b-2 border-primary" : "text-textMuted hover:text-white"}`}>📋 Datos Generales</button>
             <button onClick={() => { setActiveTab("loyalty"); setIsIdentityOpen(true); }} className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === "loyalty" && isIdentityOpen ? "bg-white/5 text-amber-400 border-b-2 border-amber-400" : "text-textMuted hover:text-white"}`}>🤝 Red de Lealtad ({recommendedList.length})</button>
             <button onClick={() => setIsIdentityOpen(!isIdentityOpen)} className="px-4 text-textMuted hover:text-white border-l border-border" title="Colapsar/Expandir">{isIdentityOpen ? "▲" : "▼"}</button>
        </div>

        {isIdentityOpen && (
            <div className="p-6 animate-[fadeIn_0.3s_ease-out]">
                {activeTab === "general" && (
                    <div className="space-y-8">
                        <section>
                            <h4 className="text-sm font-bold text-textMuted uppercase mb-4 tracking-wider">Datos Personales</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                <Input label="Nombre(s)" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                                <Input label="Apellidos" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                                <Input label="CURP" value={form.curp} onChange={e => setForm({...form, curp: e.target.value.toUpperCase()})} maxLength={18} placeholder="CLAVE ÚNICA..." />
                                <Input label="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                                
                                {role === 'ADMIN' && (
                                    <Input label="Fecha de Alta (Admin)" type="date" value={form.createdAt} onChange={e => setForm({...form, createdAt: e.target.value})} className="border-red-500/30 text-red-200" />
                                )}
                            </div>
                        </section>
                        
                        <section className="bg-surfaceHighlight/30 p-5 rounded-xl border border-border/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                                <Input label="Móvil" value={form.phone} onChange={e => setForm({...form, phone: handlePhoneInput(e.target.value)})} />
                                <Input label="Tel. Casa" value={form.homePhone} onChange={e => setForm({...form, homePhone: handlePhoneInput(e.target.value)})} />
                                <Input label="Fecha Nac." type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
                                <Select label="Sexo" value={form.assignedSex} onChange={e => setForm({...form, assignedSex: e.target.value})}>
                                    <option value="NO_ESPECIFICADO">--</option>
                                    <option value="MUJER">Mujer</option>
                                    <option value="HOMBRE">Hombre</option>
                                    <option value="INTERSEXUAL">Intersexual</option>
                                </Select>
                                
                                <Input label="Ocupación" value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} />
                                
                                <Select label="¿Cómo se enteró?" value={form.referralSource} onChange={e => {
                                    const val = e.target.value;
                                    setForm({...form, referralSource: val, referredBy: val !== "Recomendación" ? "" : form.referredBy});
                                    if (val === "Recomendación") loadAllPatientsForSearch();
                                }}>
                                    <option value="">-- Origen --</option>
                                    {sources.map(s => <option key={s} value={s}>{s}</option>)}
                                </Select>
                            </div>

                            {/* CAMPO DE RECOMENDACIÓN (EDICIÓN) */}
                            {form.referralSource === "Recomendación" && (
                                <div className="mt-4 pt-4 border-t border-white/10 animate-fadeIn">
                                    <label className="block text-xs font-bold text-textMuted uppercase mb-1">¿Quién lo recomendó?</label>
                                    {form.referredBy ? (
                                        <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-500/50 rounded px-3 py-2 w-fit">
                                            <UserCheck size={14} className="text-emerald-400" />
                                            <span className="text-sm text-white">{selectedReferrerName || "Cargando..."}</span>
                                            <button type="button" onClick={() => setForm({...form, referredBy: ""})} className="text-textMuted hover:text-white ml-2 text-lg">×</button>
                                        </div>
                                    ) : (
                                        <div className="relative max-w-sm">
                                            <Input 
                                                placeholder="Buscar paciente..." 
                                                value={referrerSearch} 
                                                onChange={e => { setReferrerSearch(e.target.value); setShowReferrerList(true); }}
                                                onFocus={() => { loadAllPatientsForSearch(); setShowReferrerList(true); }}
                                                className="bg-background text-xs border-dashed border-amber-500/50"
                                            />
                                            {showReferrerList && referrerSearch.length > 1 && (
                                                <div className="absolute top-full left-0 right-0 bg-surface border border-border rounded-lg shadow-xl z-50 mt-1 max-h-40 overflow-y-auto">
                                                    {potentialReferrers.length === 0 ? (
                                                        <div className="p-3 text-xs text-textMuted italic">No se encontraron.</div>
                                                    ) : (
                                                        potentialReferrers.map(p => (
                                                            <div key={p.id} className="p-2 hover:bg-surfaceHighlight cursor-pointer border-b border-white/5 last:border-0" onClick={() => { setForm({...form, referredBy: p.id}); setReferrerSearch(""); setShowReferrerList(false); }}>
                                                                <div className="text-xs font-bold text-white">{p.firstName} {p.lastName}</div>
                                                                <div className="text-[10px] text-textMuted">{p.phone}</div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                            {showReferrerList && <div className="fixed inset-0 z-40" onClick={() => setShowReferrerList(false)}></div>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        <section className="pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                <h4 className="text-sm font-bold text-textMuted uppercase mb-4 tracking-wider">Dirección</h4>
                                <div className="space-y-3">
                                    <Input label="Calle y Núm" value={form.street} onChange={e => setForm({...form, street: e.target.value})} placeholder="Calle principal 123" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input label="Colonia" value={form.suburb} onChange={e => setForm({...form, suburb: e.target.value})} />
                                        <Input label="C.P." value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} />
                                    </div>
                                </div>
                             </div>
                             <div>
                                <h4 className="text-sm font-bold text-textMuted uppercase mb-4 tracking-wider">Fiscal (Facturación)</h4>
                                <div className="space-y-3">
                                    <Input label="RFC" value={form.rfc} onChange={e => setForm({...form, rfc: e.target.value})} />
                                    <Input label="Razón Social" value={form.razonSocial} onChange={e => setForm({...form, razonSocial: e.target.value})} />
                                </div>
                             </div>
                        </section>
                        <div className="flex justify-end pt-4 border-t border-border">
                             <Button onClick={onSave}>Guardar Cambios</Button>
                        </div>
                    </div>
                )}
                {activeTab === "loyalty" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-surfaceHighlight/30 border border-border p-6 rounded-xl flex flex-col items-center text-center">
                            <div className="mb-4 p-3 bg-blue-500/20 rounded-full text-blue-400"><Users size={32} /></div>
                            <h4 className="text-white font-bold text-lg mb-1">¿Quién lo invitó?</h4>
                            {referrer ? (
                                <div className="mt-4 w-full">
                                    <Link to={`/patients/${referrer.id}`} className="block bg-slate-800 p-4 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700">
                                        <div className="font-bold text-primary text-lg">{referrer.firstName} {referrer.lastName}</div>
                                        <div className="text-sm text-textMuted">{referrer.phone}</div>
                                        <div className="mt-2 text-xs bg-blue-900/50 text-blue-200 inline-block px-2 py-1 rounded">Código: {referrer.referralCode || "N/A"}</div>
                                    </Link>
                                </div>
                            ) : (<div className="mt-4 text-textMuted italic text-sm">Este paciente llegó por medios orgánicos o externos ({patient.referralSource}).</div>)}
                        </div>
                        <div className="bg-surfaceHighlight/30 border border-border p-6 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-white font-bold text-lg flex items-center gap-2"><Gift size={20} className="text-amber-400" /> Referidos Traídos</h4>
                                <Badge color="yellow" className="text-lg">{recommendedList.length}</Badge>
                            </div>
                            {recommendedList.length === 0 ? (
                                <div className="text-center py-8 text-textMuted border border-dashed border-slate-700 rounded-lg">
                                    <p>Aún no ha referido a nadie.</p>
                                    <p className="text-xs mt-2">¡Anímalo a compartir su código: <span className="text-purple-400 font-mono">{patient.referralCode}</span>!</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {recommendedList.map(rec => (
                                        <Link key={rec.id} to={`/patients/${rec.id}`} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700">
                                            <div>
                                                <div className="font-bold text-slate-200">{rec.firstName} {rec.lastName}</div>
                                                <div className="text-xs text-textMuted">Alta: {new Date(rec.createdAt).toLocaleDateString()}</div>
                                            </div>
                                            <Badge color="green">Activo</Badge>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}
      </Card>

      {/* 🟢 NUEVO GRID ORGANIZADO ( Timeline Izq - Paneles Der ) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Columna Izquierda: Timeline */}
          <div className="xl:col-span-3 h-[1030px]">
             <PatientTimeline consultations={timelineConsultations} exams={timelineExams} />
          </div>

          {/* Columna Derecha: Paneles */}
          <div className="xl:col-span-9 space-y-6">
              
              {/* Fila 1: Antecedentes + Estudios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
                  <AnamnesisPanel patientId={id} className="h-full" />
                  <StudiesPanel patientId={id} className="h-full" />
              </div>

              {/* Fila 2: Consultas + Exámenes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
                  <ConsultationsPanel patientId={id} className="h-full" />
                  <EyeExamsPanel patientId={id} onSell={handleSellFromExam} className="h-full" />
              </div>
          </div>
      </div>
      
      {/* Sección Ventas */}
      <div className="border-t border-border pt-8" id="sales-section">
           <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">🛒 Generar Venta</h2>
           <SalesPanel patientId={id} prefillData={salePrefill} onClearPrefill={() => setSalePrefill(null)} />
      </div>

      {editingPoints && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-surface border border-border p-6 rounded-xl w-full max-w-sm shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-4">Ajuste Manual de Puntos</h3>
                  <Input label="Nuevos Puntos Totales" type="number" value={newPointsVal} onChange={e => setNewPointsVal(e.target.value)} className="font-bold text-lg" />
                  <div className="flex justify-end gap-3 mt-6">
                      <Button variant="ghost" onClick={() => setEditingPoints(false)}>Cancelar</Button>
                      <Button onClick={handleUpdatePoints}>Guardar</Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}