import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { 
  getPatientById, 
  updatePatient, 
  getPatientsRecommendedBy,
  touchPatientView,
  setPatientPoints 
} from "@/services/patientsStorage";
import { getReferralSources } from "@/services/settingsStorage";

// Paneles Clínicos
import ConsultationsPanel from "@/components/ConsultationsPanel";
import EyeExamsPanel from "@/components/EyeExamsPanel";
import AnamnesisPanel from "@/components/AnamnesisPanel";
import SalesPanel from "@/components/SalesPanel";
import StudiesPanel from "@/components/StudiesPanel";
import { handlePhoneInput } from "@/utils/inputHandlers";
import LoadingState from "@/components/LoadingState";

// UI Components
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";

// Iconos
import { Users, Gift, Share2, Copy } from "lucide-react";

// --- HELPERS ---
function toDateInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formatDateTime(isoString) {
  if (!isoString) return "N/D";
  return new Date(isoString).toLocaleString("es-MX", { day: '2-digit', month: 'short', year: 'numeric' });
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

export default function PatientDetailPage() {
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [referrer, setReferrer] = useState(null); // Objeto completo del padrino
  const [recommendedList, setRecommendedList] = useState([]);
  const [salePrefill, setSalePrefill] = useState(null);
  
  const [isIdentityOpen, setIsIdentityOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); // general | loyalty
  const [form, setForm] = useState({});
  const [sources, setSources] = useState([]);

  // Estado para Edición de Puntos
  const [editingPoints, setEditingPoints] = useState(false);
  const [newPointsVal, setNewPointsVal] = useState("");

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
            setSources(sourcesData);
            
            if (p) {
                touchPatientView(id);
                setForm({ 
                    firstName: p.firstName, lastName: p.lastName, email: p.email,
                    phone: p.phone, homePhone: p.homePhone || "", 
                    dob: p.dob || "", assignedSex: p.assignedSex || p.sex || "NO_ESPECIFICADO",
                    genderExpression: p.genderExpression || "", 
                    maritalStatus: p.maritalStatus || "SOLTERO",
                    religion: p.religion || "", 
                    reliability: p.reliability || "BUENA",
                    occupation: p.occupation || "", referralSource: p.referralSource || "",
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

                // Cargar datos de lealtad
                if (p.referredBy) {
                    const refData = await getPatientById(p.referredBy);
                    setReferrer(refData);
                }
                const recs = await getPatientsRecommendedBy(id);
                setRecommendedList(recs);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    loadData();
  }, [id]);

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

    await updatePatient(id, payload);
    setPatient({ ...patient, ...payload }); 
    alert("Ficha actualizada");
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
        alert("Puntos actualizados manualmente.");
    } catch (e) {
        alert("Error: " + e.message);
    }
  };

  if (loading) return <LoadingState />;
  if (!patient) return <div className="p-10 text-center text-textMuted">Paciente no encontrado.</div>;

  return (
    <div className="page-container space-y-8">
      
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex items-center gap-2 text-sm text-textMuted mb-2">
        <Link to="/patients" className="hover:text-white transition-colors">Pacientes</Link>
        <span>/</span>
        <span className="text-white">Detalle</span>
      </div>

      {/* HERO CARD */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/20 shadow-glow p-6 md:p-8">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
             <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-blue-900/50 uppercase">
                    {patient.firstName.charAt(0)}
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{patient.firstName} {patient.lastName}</h1>
                    <div className="flex flex-wrap gap-3 mt-3 items-center">
                        {calculatedAge !== null && (
                            <Badge color="blue" className="text-sm px-3 py-1 bg-blue-500/20 border-blue-500/30 text-blue-200">
                                {calculatedAge} Años
                            </Badge>
                        )}
                        <span className="text-textMuted text-sm flex items-center gap-1">🎂 {form.dob || "N/A"}</span>
                        <span className="text-textMuted text-sm flex items-center gap-1">📱 {patient.phone}</span>
                        
                        {/* BADGE DE PUNTOS */}
                        <div className="relative group cursor-pointer" onClick={() => { setNewPointsVal(patient.points); setEditingPoints(true); }}>
                            <Badge color="yellow" className="text-yellow-300 border-yellow-500/30 font-bold hover:bg-yellow-500/20 transition-colors flex items-center gap-2">
                                💎 {patient.points?.toLocaleString() || 0} Puntos
                                <span className="text-[10px] opacity-0 group-hover:opacity-100 bg-black/50 px-1 rounded">✏️</span>
                            </Badge>
                        </div>

                        {/* BADGE CÓDIGO REFERIDO (Solo lectura aquí) */}
                        {patient.referralCode && (
                            <Badge color="purple" className="text-purple-300 border-purple-500/30 font-mono tracking-wider">
                                🎫 {patient.referralCode}
                            </Badge>
                        )}
                    </div>
                </div>
             </div>
             
             <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                    <div className="text-xs text-textMuted uppercase tracking-wider mb-1">Origen</div>
                    <Badge color="gray">{patient.referralSource || "Desconocido"}</Badge>
                </div>
                <div className="flex flex-col items-end gap-1 mt-3">
                    <span className="text-xs text-textMuted">
                        🕒 <strong>Último acceso:</strong> {formatDateTime(patient.lastViewed)}
                    </span>
                    <span className="text-xs text-textMuted">
                        📅 <strong>Alta:</strong> {new Date(patient.createdAt).toLocaleDateString()}
                    </span>
                </div>
             </div>
         </div>
      </div>

      {/* FICHA TÉCNICA + RED DE LEALTAD */}
      <Card className="overflow-hidden">
        <div className="flex border-b border-border">
             <button 
                onClick={() => { setActiveTab("general"); setIsIdentityOpen(true); }}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === "general" && isIdentityOpen ? "bg-white/5 text-primary border-b-2 border-primary" : "text-textMuted hover:text-white"}`}
             >
                📋 Datos Generales
             </button>
             <button 
                onClick={() => { setActiveTab("loyalty"); setIsIdentityOpen(true); }}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === "loyalty" && isIdentityOpen ? "bg-white/5 text-amber-400 border-b-2 border-amber-400" : "text-textMuted hover:text-white"}`}
             >
                🤝 Red de Lealtad ({recommendedList.length})
             </button>
             <button 
                onClick={() => setIsIdentityOpen(!isIdentityOpen)}
                className="px-4 text-textMuted hover:text-white border-l border-border"
                title="Colapsar/Expandir"
             >
                {isIdentityOpen ? "▲" : "▼"}
             </button>
        </div>

        {isIdentityOpen && (
            <div className="p-6 animate-[fadeIn_0.3s_ease-out]">
                
                {/* PESTAÑA 1: DATOS GENERALES */}
                {activeTab === "general" && (
                    <div className="space-y-8">
                         {/* 1. Datos Personales */}
                        <section>
                            <h4 className="text-sm font-bold text-textMuted uppercase mb-4 tracking-wider">Datos Personales</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <Input label="Nombre(s)" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                                <Input label="Apellidos" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                                <Input label="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                            </div>
                        </section>

                        {/* 2. Contacto */}
                        <section className="bg-surfaceHighlight/30 p-5 rounded-xl border border-border/50">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <Input label="Móvil" value={form.phone} onChange={e => setForm({...form, phone: handlePhoneInput(e.target.value)})} />
                                <Input label="Tel. Casa" value={form.homePhone} onChange={e => setForm({...form, homePhone: handlePhoneInput(e.target.value)})} />
                                <Input label="Fecha Nacimiento" type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
                                <Select label="Sexo Asignado" value={form.assignedSex} onChange={e => setForm({...form, assignedSex: e.target.value})}>
                                    <option value="NO_ESPECIFICADO">--</option>
                                    <option value="MUJER">Mujer</option>
                                    <option value="HOMBRE">Hombre</option>
                                    <option value="INTERSEXUAL">Intersexual</option>
                                </Select>
                            </div>
                        </section>

                        {/* 3. Datos Fiscales & Dirección (Resumido para brevedad, expandir si se desea) */}
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

                {/* PESTAÑA 2: RED DE LEALTAD (NUEVO) */}
                {activeTab === "loyalty" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* IZQUIERDA: PADRINO */}
                        <div className="bg-surfaceHighlight/30 border border-border p-6 rounded-xl flex flex-col items-center text-center">
                            <div className="mb-4 p-3 bg-blue-500/20 rounded-full text-blue-400">
                                <Users size={32} />
                            </div>
                            <h4 className="text-white font-bold text-lg mb-1">¿Quién lo invitó?</h4>
                            
                            {referrer ? (
                                <div className="mt-4 w-full">
                                    <Link to={`/patients/${referrer.id}`} className="block bg-slate-800 p-4 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700">
                                        <div className="font-bold text-primary text-lg">{referrer.firstName} {referrer.lastName}</div>
                                        <div className="text-sm text-textMuted">{referrer.phone}</div>
                                        <div className="mt-2 text-xs bg-blue-900/50 text-blue-200 inline-block px-2 py-1 rounded">
                                            Código: {referrer.referralCode || "N/A"}
                                        </div>
                                    </Link>
                                </div>
                            ) : (
                                <div className="mt-4 text-textMuted italic text-sm">
                                    Este paciente llegó por medios orgánicos o externos ({patient.referralSource}).
                                </div>
                            )}
                        </div>

                        {/* DERECHA: AHIJADOS */}
                        <div className="bg-surfaceHighlight/30 border border-border p-6 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-white font-bold text-lg flex items-center gap-2">
                                    <Gift size={20} className="text-amber-400" />
                                    Referidos Traídos
                                </h4>
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

                        <div className="col-span-1 md:col-span-2 mt-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl flex justify-between items-center">
                            <div>
                                <h5 className="font-bold text-purple-200">Código de Embajador</h5>
                                <p className="text-xs text-purple-300/70">Comparte este código con el paciente para que invite amigos.</p>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-purple-500/30">
                                <span className="font-mono text-xl font-bold text-purple-400 tracking-widest px-2">
                                    {patient.referralCode || "GENERANDO..."}
                                </span>
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(patient.referralCode); alert("Copiado!"); }}
                                    className="p-2 hover:bg-white/10 rounded-md text-purple-300"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        )}
      </Card>

      {/* GRID PANELES CLÍNICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="h-full"><AnamnesisPanel patientId={id} /></div>
          <div className="h-full"><ConsultationsPanel patientId={id} /></div>
          <div className="h-full"><EyeExamsPanel patientId={id} onSell={handleSellFromExam} /></div>
          <div className="h-full"><StudiesPanel patientId={id} /></div>
      </div>
      
      {/* SECCIÓN VENTAS */}
      <div className="border-t border-border pt-8" id="sales-section">
           <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
               🛒 Generar Venta <span className="text-sm font-normal text-textMuted ml-2">(Paciente Vinculado)</span>
           </h2>
           <SalesPanel patientId={id} prefillData={salePrefill} onClearPrefill={() => setSalePrefill(null)} />
      </div>

      {/* MODAL EDICIÓN PUNTOS */}
      {editingPoints && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-surface border border-border p-6 rounded-xl w-full max-w-sm shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-4">Ajuste Manual de Puntos</h3>
                  <p className="text-sm text-textMuted mb-4">
                      Usa esto para corregir errores o asignar bonificaciones manuales.
                  </p>
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