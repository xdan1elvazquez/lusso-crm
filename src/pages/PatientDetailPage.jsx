import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { 
  getPatientById, 
  updatePatient, 
  getPatientsRecommendedBy,
  touchPatientView 
} from "@/services/patientsStorage";
import { getReferralSources } from "@/services/settingsStorage";

// Paneles Clínicos (Lógica original intacta)
import ConsultationsPanel from "@/components/ConsultationsPanel";
import EyeExamsPanel from "@/components/EyeExamsPanel";
import AnamnesisPanel from "@/components/AnamnesisPanel";
import SalesPanel from "@/components/SalesPanel";
import StudiesPanel from "@/components/StudiesPanel";
import { handlePhoneInput } from "@/utils/inputHandlers";

// 👇 AQUÍ ESTABA EL ERROR: Faltaba esta línea
import LoadingState from "@/components/LoadingState";

// UI Components Nuevos (Tailwind)
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";

// --- HELPERS ORIGINALES ---
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
  
  // --- ESTADO Y LÓGICA ORIGINAL ---
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [referrerName, setReferrerName] = useState("");
  const [recommendedList, setRecommendedList] = useState([]);
  const [salePrefill, setSalePrefill] = useState(null);
  
  const [isIdentityOpen, setIsIdentityOpen] = useState(false);
  const [form, setForm] = useState({});
  const [sources, setSources] = useState([]);

  const calculatedAge = getPatientAge(form?.dob); // Protección opcional ?.

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
                // 1. CARGA DE ESTADO COMPLETA
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

                if (p.referredBy) {
                    const ref = await getPatientById(p.referredBy);
                    if (ref) setReferrerName(`${ref.firstName} ${ref.lastName}`);
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
    setIsIdentityOpen(false); 
    alert("Ficha actualizada");
  };

  const handleSellFromExam = (exam) => { 
      setSalePrefill({ type: 'EXAM', data: exam }); 
      setTimeout(() => {
        const salesElement = document.getElementById("sales-section");
        if(salesElement) salesElement.scrollIntoView({ behavior: "smooth" });
      }, 100);
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
                        <Badge color="yellow" className="text-yellow-300 border-yellow-500/30 font-bold">
                            💎 {patient.points || 0} Puntos
                        </Badge>
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
                        📝 <strong>Última edición:</strong> {formatDateTime(patient.updatedAt)}
                    </span>
                    <span className="text-xs text-textMuted">
                        📅 <strong>Alta:</strong> {new Date(patient.createdAt).toLocaleDateString()}
                    </span>
                </div>
             </div>
         </div>
      </div>

      {/* FICHA TÉCNICA */}
      <Card>
        <div 
            onClick={() => setIsIdentityOpen(!isIdentityOpen)}
            className="flex justify-between items-center cursor-pointer group"
        >
            <div className="flex items-center gap-3">
                <div className={`text-xl transition-transform duration-300 ${isIdentityOpen ? "rotate-90" : ""}`}>▶</div>
                <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">Ficha de Identificación Completa</h3>
            </div>
            {isIdentityOpen && <Button onClick={(e) => { e.stopPropagation(); onSave(); }} variant="primary" className="py-1 px-4 text-xs">Guardar Cambios</Button>}
        </div>

        {isIdentityOpen && (
            <div className="mt-6 pt-6 border-t border-border animate-[fadeIn_0.3s_ease-out] space-y-8">
                {/* 1. Datos Personales */}
                <section>
                    <h4 className="text-sm font-bold text-textMuted uppercase mb-4 tracking-wider">Datos Personales</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Input label="Nombre(s)" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                        <Input label="Apellidos" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                        <Input label="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                    </div>
                </section>

                {/* 2. Contacto y Demográficos */}
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

                {/* 3. Identidad y Social */}
                <section>
                    <h4 className="text-sm font-bold text-textMuted uppercase mb-4 tracking-wider">Perfil Social</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div className="w-full">
                            <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2 ml-1">Expresión de Género</label>
                            <input 
                                list="gender-options" 
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-textMain text-sm focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none placeholder-textMuted/50"
                                value={form.genderExpression} 
                                onChange={e => setForm({...form, genderExpression: e.target.value})} 
                                placeholder="Ej. Femenino, No Binario..." 
                            />
                            <datalist id="gender-options">
                                <option value="Masculino" />
                                <option value="Femenino" />
                                <option value="No Binario" />
                                <option value="Fluido" />
                            </datalist>
                        </div>

                        <Select label="Estado Civil" value={form.maritalStatus} onChange={e => setForm({...form, maritalStatus: e.target.value})}>
                            <option value="SOLTERO">Soltero(a)</option>
                            <option value="CASADO">Casado(a)</option>
                            <option value="UNION_LIBRE">Unión Libre</option>
                            <option value="DIVORCIADO">Divorciado(a)</option>
                            <option value="VIUDO">Viudo(a)</option>
                        </Select>

                        <Input label="Religión" value={form.religion} onChange={e => setForm({...form, religion: e.target.value})} placeholder="Opcional" />
                        
                        <Select label="Fiabilidad Informante" value={form.reliability} onChange={e => setForm({...form, reliability: e.target.value})}>
                            <option value="BUENA">Buena</option>
                            <option value="REGULAR">Regular</option>
                            <option value="MALA">Mala</option>
                            <option value="NO_VALORADA">No Valorada</option>
                        </Select>
                    </div>
                </section>

                {/* 4. Ocupación y Marketing */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Input label="Ocupación" value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} />
                    <div className="col-span-2 bg-surfaceHighlight/30 p-4 rounded-xl flex gap-6 items-center border border-border/50">
                        <div className="flex-1">
                            <Select label="Marketing / Origen" value={form.referralSource} onChange={e => setForm(f => ({ ...f, referralSource: e.target.value }))}>
                                <option value="">-- Seleccionar --</option>
                                {sources.map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>
                        {referrerName && (
                            <div className="flex-1 border-l border-border pl-4">
                                <span className="text-xs text-textMuted uppercase font-bold block mb-1">Recomendado por</span>
                                <Link to={`/patients/${patient.referredBy}`} className="text-primary hover:underline font-medium">{referrerName}</Link>
                            </div>
                        )}
                        {recommendedList.length > 0 && (
                            <div className="flex-1 border-l border-border pl-4">
                                <span className="text-xs text-textMuted uppercase font-bold block mb-1">Referidos</span>
                                <div className="text-yellow-400 font-bold">🏆 {recommendedList.length} Pacientes</div>
                            </div>
                        )}
                    </div>
                </section>

                {/* 5. Dirección */}
                <section className="pt-4 border-t border-border">
                    <h4 className="text-sm font-bold text-textMuted uppercase mb-4 tracking-wider">Dirección</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <Input label="Calle" value={form.street} onChange={e => setForm({...form, street: e.target.value})} />
                        </div>
                        <Input label="Núm. Ext" value={form.externalNumber} onChange={e => setForm({...form, externalNumber: e.target.value})} />
                        <Input label="Núm. Int" value={form.internalNumber} onChange={e => setForm({...form, internalNumber: e.target.value})} placeholder="Opcional" />
                        <Input label="Colonia" value={form.suburb} onChange={e => setForm({...form, suburb: e.target.value})} />
                        <Input label="Código Postal" value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} />
                        <Input label="Ciudad / Municipio" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                        <Input label="Estado" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
                    </div>
                </section>

                {/* 6. Datos Fiscales */}
                <section className="pt-4 border-t border-border">
                    <h4 className="text-sm font-bold text-textMuted uppercase mb-4 tracking-wider">Datos de Facturación</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="RFC" value={form.rfc} onChange={e => setForm({...form, rfc: e.target.value})} />
                        <div className="md:col-span-2">
                            <Input label="Razón Social" value={form.razonSocial} onChange={e => setForm({...form, razonSocial: e.target.value})} />
                        </div>
                        <div className="md:col-span-2">
                            <Input label="Régimen Fiscal" value={form.regimen} onChange={e => setForm({...form, regimen: e.target.value})} />
                        </div>
                        <Input label="C.P. Fiscal" value={form.cp} onChange={e => setForm({...form, cp: e.target.value})} />
                        <div className="md:col-span-3">
                            <Input label="Email para Facturas" value={form.emailFactura} onChange={e => setForm({...form, emailFactura: e.target.value})} placeholder="Si es diferente al de contacto" />
                        </div>
                    </div>
                </section>
            </div>
        )}
      </Card>

      <div className="space-y-10">
        <AnamnesisPanel patientId={id} />
        <ConsultationsPanel patientId={id} />
        <EyeExamsPanel patientId={id} onSell={handleSellFromExam} />
        <StudiesPanel patientId={id} />
        
        <div className="border-t border-border pt-8" id="sales-section">
           <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
               🛒 Generar Venta <span className="text-sm font-normal text-textMuted ml-2">(Paciente Vinculado)</span>
           </h2>
           <SalesPanel patientId={id} prefillData={salePrefill} onClearPrefill={() => setSalePrefill(null)} />
        </div>
      </div>
    </div>
  );
}