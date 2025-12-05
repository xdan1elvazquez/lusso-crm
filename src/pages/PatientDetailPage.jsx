import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { 
  getPatientById, 
  updatePatient, 
  getPatientsRecommendedBy,
  touchPatientView 
} from "@/services/patientsStorage";
import { getReferralSources } from "@/services/settingsStorage";
import ConsultationsPanel from "@/components/ConsultationsPanel";
import EyeExamsPanel from "@/components/EyeExamsPanel";
import AnamnesisPanel from "@/components/AnamnesisPanel";
import SalesPanel from "@/components/SalesPanel";
import StudiesPanel from "@/components/StudiesPanel";
import { handlePhoneInput } from "@/utils/inputHandlers";
import LoadingState from "@/components/LoadingState";

function toDateInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formatDateTime(isoString) {
  if (!isoString) return "N/D";
  return new Date(isoString).toLocaleString("es-MX", { day: '2-digit', month: 'short', year: 'numeric' });
}

// Función robusta para edad
function getPatientAge(dateString) {
  if (!dateString) return null;
  const target = dateString.includes("T") ? new Date(dateString) : new Date(dateString + "T12:00:00");
  const now = new Date();
  if (isNaN(target.getTime())) return null;

  let age = now.getFullYear() - target.getFullYear();
  const m = now.getMonth() - target.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < target.getDate())) {
      age--;
  }
  return age;
}

const Field = ({ label, width="100%", children }) => (
  <label style={{ display: "block", width }}>
     <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, display: "block" }}>{label}</div>
     {children}
  </label>
);

export default function PatientDetailPage() {
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [referrerName, setReferrerName] = useState("");
  const [recommendedList, setRecommendedList] = useState([]);
  const [salePrefill, setSalePrefill] = useState(null);
  
  const [isIdentityOpen, setIsIdentityOpen] = useState(false);
  const [form, setForm] = useState({});
  const [sources, setSources] = useState([]);

  // Edad calculada dinámicamente del formulario (para que se actualice si editan la fecha)
  const calculatedAge = getPatientAge(form.dob);

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
                    
                    // Teléfonos
                    phone: p.phone, // Móvil
                    homePhone: p.homePhone || "", // Casa

                    // Demográficos Expandidos
                    dob: p.dob || "", 
                    assignedSex: p.assignedSex || p.sex || "NO_ESPECIFICADO", // Migración suave
                    genderExpression: p.genderExpression || "",
                    maritalStatus: p.maritalStatus || "SOLTERO",
                    religion: p.religion || "",
                    reliability: p.reliability || "BUENA",

                    occupation: p.occupation || "",
                    referralSource: p.referralSource || "",
                    createdAt: toDateInput(p.createdAt),
                    
                    // Fiscal y Dirección
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

  const inputStyle = { width: "100%", padding: "8px 10px", background: "#111", border: "1px solid #333", color: "white", borderRadius: 6, fontSize: "0.95em" };

  if (loading) return <LoadingState />;
  if (!patient) return <div style={{padding:40, textAlign:"center"}}>Paciente no encontrado.</div>;

  return (
    <div style={{ paddingBottom: 80, width: "100%" }}>
      
      <div style={{ marginBottom: 15 }}>
        <Link to="/patients" style={{ color: "#888", textDecoration: "none", fontSize: "0.9em" }}>← Regresar al directorio</Link>
      </div>

      {/* HERO: INFO RÁPIDA */}
      <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #111827 100%)", padding: "25px", borderRadius: "12px", marginBottom: 30, border: "1px solid #374151", display: "grid", gap: 15, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <div>
                <h1 style={{ margin: 0, fontSize: "2.2rem", color: "white" }}>{patient.firstName} {patient.lastName}</h1>
                <div style={{ display: "flex", gap: 20, marginTop: 8, color: "#bfdbfe", fontSize: "0.95em", alignItems: "center" }}>
                    
                    {/* EDAD EN GRANDE */}
                    {calculatedAge !== null && (
                        <span style={{ fontSize: "1.2em", fontWeight: "bold", background: "rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: "6px", color: "#fff" }}>
                            {calculatedAge} Años
                        </span>
                    )}
                    
                    <span>🎂 {form.dob || "Sin fecha"}</span>
                    <span>📱 {patient.phone}</span>
                    <span style={{ color: "#fbbf24", fontWeight: "bold", background: "rgba(251, 191, 36, 0.1)", padding: "0 8px", borderRadius: "4px" }}>
                       💎 {patient.points || 0} Puntos
                    </span>
                </div>
             </div>
             <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.8em", color: "#9ca3af", marginBottom: 4 }}>ORIGEN</div>
                <div style={{ background: "rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: 20, fontSize: "0.9em", color: "#fff", display: "inline-block" }}>
                    {patient.referralSource}
                </div>
             </div>
         </div>
         
         <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10, marginTop: 5, display: "flex", gap: 20, fontSize: "0.8em", color: "#9ca3af" }}>
            <span>🕒 <strong>Último acceso:</strong> {formatDateTime(patient.lastViewed)}</span>
            <span>📝 <strong>Última edición:</strong> {formatDateTime(patient.updatedAt)}</span>
            <span>📅 <strong>Alta:</strong> {new Date(patient.createdAt).toLocaleDateString()}</span>
         </div>
      </div>

      {/* FICHA DE IDENTIFICACIÓN */}
      <section style={{ background: "#1a1a1a", padding: "15px 25px", borderRadius: "12px", border: "1px solid #333", marginBottom: 40 }}>
        <div 
            onClick={() => setIsIdentityOpen(!isIdentityOpen)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", paddingBottom: isIdentityOpen ? 20 : 0, marginBottom: isIdentityOpen ? 20 : 0, borderBottom: isIdentityOpen ? "1px solid #333" : "none" }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h3 style={{ margin: 0, color: "#e5e7eb" }}>Ficha de Identificación y Datos</h3>
                <span style={{ color: "#666", fontSize: "0.8em" }}>{isIdentityOpen ? "▼" : "▶"}</span>
            </div>
            {isIdentityOpen && <button onClick={(e) => { e.stopPropagation(); onSave(); }} style={{ background: "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: "600", fontSize: "0.9em" }}>Guardar Cambios</button>}
        </div>

        {isIdentityOpen && (
            <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 20 }}>
                    <Field label="Nombre"><input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} style={inputStyle} /></Field>
                    <Field label="Apellidos"><input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} style={inputStyle} /></Field>
                    
                    {/* TELÉFONOS */}
                    <Field label="Teléfono Móvil (10 dígitos)">
                        <input type="tel" maxLength={10} value={form.phone} onChange={e => setForm({...form, phone: handlePhoneInput(e.target.value)})} style={{...inputStyle, borderColor: "#60a5fa"}} placeholder="Principal" />
                    </Field>
                    <Field label="Teléfono Casa">
                        <input type="tel" maxLength={10} value={form.homePhone} onChange={e => setForm({...form, homePhone: handlePhoneInput(e.target.value)})} style={inputStyle} placeholder="Opcional" />
                    </Field>
                    
                    <Field label="Email"><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} /></Field>
                    <Field label="Fecha Nacimiento"><input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} style={inputStyle} /></Field>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20, marginBottom: 20, background: "#111", padding: 15, borderRadius: 8 }}>
                    {/* GÉNERO Y SEXO */}
                    <Field label="Sexo Asignado al Nacer">
                        <select value={form.assignedSex} onChange={e => setForm({...form, assignedSex: e.target.value})} style={inputStyle}>
                            <option value="NO_ESPECIFICADO">-- Seleccionar --</option>
                            <option value="MUJER">Mujer</option>
                            <option value="HOMBRE">Hombre</option>
                            <option value="INTERSEXUAL">Intersexual</option>
                        </select>
                    </Field>
                    <Field label="Expresión de Género / Identidad">
                        <input list="gender-options" value={form.genderExpression} onChange={e => setForm({...form, genderExpression: e.target.value})} style={inputStyle} placeholder="Ej. Femenino, No Binario..." />
                        <datalist id="gender-options">
                            <option value="Masculino" />
                            <option value="Femenino" />
                            <option value="No Binario" />
                            <option value="Fluido" />
                        </datalist>
                    </Field>

                    <Field label="Estado Civil">
                        <select value={form.maritalStatus} onChange={e => setForm({...form, maritalStatus: e.target.value})} style={inputStyle}>
                            <option value="SOLTERO">Soltero(a)</option>
                            <option value="CASADO">Casado(a)</option>
                            <option value="UNION_LIBRE">Unión Libre</option>
                            <option value="DIVORCIADO">Divorciado(a)</option>
                            <option value="VIUDO">Viudo(a)</option>
                        </select>
                    </Field>
                    <Field label="Religión">
                        <input value={form.religion} onChange={e => setForm({...form, religion: e.target.value})} style={inputStyle} placeholder="Opcional" />
                    </Field>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
                    <Field label="Ocupación"><input value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} style={inputStyle} /></Field>
                    <Field label="Fiabilidad del Informante">
                        <select value={form.reliability} onChange={e => setForm({...form, reliability: e.target.value})} style={inputStyle}>
                            <option value="BUENA">Buena</option>
                            <option value="REGULAR">Regular</option>
                            <option value="MALA">Mala</option>
                            <option value="NO_VALORADA">No Valorada</option>
                        </select>
                    </Field>

                    <div style={{ gridColumn: "span 1", background: "#111", padding: 10, borderRadius: 8, border: "1px dashed #444" }}>
                        <Field label="Marketing / Origen"><select value={form.referralSource} onChange={e => setForm({...form, referralSource: e.target.value})} style={{ ...inputStyle, border: "none", background: "transparent", padding: 0, color: "#4ade80", fontWeight: "bold" }}>{sources.map(s => <option key={s} value={s}>{s}</option>)}</select></Field>
                        {referrerName && <div style={{ fontSize: "0.8em", color: "#aaa", marginTop: 5 }}>Recomendado por: <Link to={`/patients/${patient.referredBy}`} style={{color: "#60a5fa"}}>{referrerName}</Link></div>}
                        {recommendedList.length > 0 && <div style={{ fontSize: "0.8em", color: "#fbbf24", marginTop: 5 }}>🏆 {recommendedList.length} referidos</div>}
                    </div>
                </div>
            </div>
        )}
      </section>

      {/* SECCIONES */}
      <div style={{ display: "grid", gap: "40px" }}>
        <AnamnesisPanel patientId={id} />
        <ConsultationsPanel patientId={id} />
        <EyeExamsPanel patientId={id} onSell={handleSellFromExam} />
        <StudiesPanel patientId={id} />
        <hr style={{ border: "0", borderTop: "1px solid #333", margin: "0" }} />
        <div id="sales-section">
           <SalesPanel patientId={id} prefillData={salePrefill} onClearPrefill={() => setSalePrefill(null)} />
        </div>
      </div>
    </div>
  );
}