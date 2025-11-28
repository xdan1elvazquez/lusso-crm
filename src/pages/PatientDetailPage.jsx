import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPatientById, updatePatient, getPatientsRecommendedBy, touchPatientView } from "@/services/patientsStorage";
import { getReferralSources } from "@/services/settingsStorage";
import ConsultationsPanel from "@/components/ConsultationsPanel";
import EyeExamsPanel from "@/components/EyeExamsPanel";
import AnamnesisPanel from "@/components/AnamnesisPanel";
import SalesPanel from "@/components/SalesPanel";
// WorkOrdersPanel removed from here as requested

function toDateInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formatDateTime(isoString) {
  if (!isoString) return "N/D";
  return new Date(isoString).toLocaleString("es-MX", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [referrerName, setReferrerName] = useState("");
  const [recommendedList, setRecommendedList] = useState([]);
  const [salePrefill, setSalePrefill] = useState(null);
  
  const [form, setForm] = useState({ 
    firstName: "", lastName: "", phone: "", email: "", 
    dob: "", sex: "", occupation: "", referralSource: "", createdAt: "",
    rfc: "", razonSocial: "", regimen: "", cp: "", emailFactura: "",
    // DIRECCIÓN
    street: "", externalNumber: "", internalNumber: "", suburb: "", city: "", state: "", zip: ""
  });
  const [sources, setSources] = useState([]);

  useEffect(() => {
    setSources(getReferralSources());
    const p = getPatientById(id);
    setPatient(p);
    if (p) {
        touchPatientView(id);
        setForm({ 
            firstName: p.firstName, lastName: p.lastName, phone: p.phone, email: p.email,
            dob: p.dob || "", sex: p.sex || "NO_ESPECIFICADO", occupation: p.occupation || "",
            referralSource: p.referralSource || "", createdAt: toDateInput(p.createdAt),
            rfc: p.taxData?.rfc || "", razonSocial: p.taxData?.razonSocial || "", regimen: p.taxData?.regimen || "", cp: p.taxData?.cp || "", emailFactura: p.taxData?.emailFactura || p.email || "",
            // Mapeo de dirección
            street: p.address?.street || "", externalNumber: p.address?.externalNumber || "", internalNumber: p.address?.internalNumber || "", 
            suburb: p.address?.suburb || "", city: p.address?.city || "", state: p.address?.state || "", zip: p.address?.zip || ""
        });
        if (p.referredBy) {
            const ref = getPatientById(p.referredBy);
            if (ref) setReferrerName(`${ref.firstName} ${ref.lastName}`);
        }
        setRecommendedList(getPatientsRecommendedBy(id));
    }
  }, [id]);

  if (!patient) return <div style={{ padding: 40, textAlign: "center" }}>Cargando paciente...</div>;

  const onSave = () => {
    let finalCreatedAt = patient.createdAt;
    if (form.createdAt !== toDateInput(patient.createdAt)) {
       finalCreatedAt = new Date(form.createdAt + "T12:00:00").toISOString();
    }
    
    const payload = {
        ...form,
        createdAt: finalCreatedAt,
        taxData: { rfc: form.rfc, razonSocial: form.razonSocial, regimen: form.regimen, cp: form.cp, emailFactura: form.emailFactura },
        address: { 
            street: form.street, externalNumber: form.externalNumber, internalNumber: form.internalNumber,
            suburb: form.suburb, city: form.city, state: form.state, zip: form.zip 
        }
    };

    const updated = updatePatient(id, payload);
    setPatient(updated);
    alert("Ficha actualizada");
  };

  const calculateAge = (dob) => {
      if (!dob) return "Edad N/D";
      const diff = Date.now() - new Date(dob).getTime();
      return Math.abs(new Date(diff).getUTCFullYear() - 1970) + " años";
  };

  const handleSellFromExam = (exam) => { 
      setSalePrefill({ type: 'EXAM', data: exam }); 
      setTimeout(() => { document.getElementById("sales-section")?.scrollIntoView({ behavior: "smooth" }); }, 100);
  };

  const Field = ({ label, width="100%", children }) => (
    <label style={{ display: "block", width }}>
       <span style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, display: "block" }}>{label}</span>
       {children}
    </label>
  );

  const inputStyle = { width: "100%", padding: "8px 10px", background: "#111", border: "1px solid #333", color: "white", borderRadius: 6, fontSize: "0.95em" };

  return (
    <div style={{ paddingBottom: 80, width: "100%" }}>
      <div style={{ marginBottom: 15 }}>
        <Link to="/patients" style={{ color: "#888", textDecoration: "none", fontSize: "0.9em" }}>← Regresar al directorio</Link>
      </div>

      {/* HERO */}
      <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #111827 100%)", padding: "25px", borderRadius: "12px", marginBottom: 30, border: "1px solid #374151", display: "grid", gap: 15, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <div>
                <h1 style={{ margin: 0, fontSize: "2.2rem", color: "white" }}>{patient.firstName} {patient.lastName}</h1>
                <div style={{ display: "flex", gap: 15, marginTop: 8, color: "#bfdbfe", fontSize: "0.95em" }}>
                    <span>🎂 {calculateAge(form.dob)}</span>
                    <span>📞 {patient.phone}</span>
                    <span style={{ color: "#fbbf24", fontWeight: "bold", background: "rgba(251, 191, 36, 0.1)", padding: "0 8px", borderRadius: "4px" }}>💎 {patient.points || 0} Puntos</span>
                </div>
             </div>
             <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.8em", color: "#9ca3af", marginBottom: 4 }}>ORIGEN</div>
                <div style={{ background: "rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: 20, fontSize: "0.9em", color: "#fff", display: "inline-block" }}>{patient.referralSource}</div>
             </div>
         </div>
         <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10, marginTop: 5, display: "flex", gap: 20, fontSize: "0.8em", color: "#9ca3af" }}>
            <span>🕒 <strong>Último acceso:</strong> {formatDateTime(patient.lastViewed)}</span>
            <span>📝 <strong>Última edición:</strong> {formatDateTime(patient.updatedAt)}</span>
            <span>📅 <strong>Alta original:</strong> {new Date(patient.createdAt).toLocaleDateString()}</span>
         </div>
      </div>

      {/* FICHA TÉCNICA */}
      <section style={{ background: "#1a1a1a", padding: "25px", borderRadius: "12px", border: "1px solid #333", marginBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid #333", paddingBottom: 10 }}>
            <h3 style={{ margin: 0, color: "#e5e7eb" }}>Ficha de Identificación</h3>
            <button onClick={onSave} style={{ background: "#333", color: "white", border: "1px solid #555", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: "0.9em" }}>Actualizar Datos</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
           <Field label="Nombre"><input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} style={inputStyle} /></Field>
           <Field label="Apellidos"><input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} style={inputStyle} /></Field>
           <Field label="Teléfono"><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={inputStyle} /></Field>
           <Field label="Email"><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} /></Field>
           <Field label="Fecha Nacimiento"><input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} style={inputStyle} /></Field>
           <Field label="Sexo">
               <select value={form.sex} onChange={e => setForm({...form, sex: e.target.value})} style={inputStyle}>
                   <option value="NO_ESPECIFICADO">No especificado</option>
                   <option value="MUJER">Mujer</option>
                   <option value="HOMBRE">Hombre</option>
               </select>
           </Field>
           <Field label="Ocupación"><input value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} style={inputStyle} /></Field>
           <Field label="Fecha de Alta"><input type="date" value={form.createdAt} onChange={e => setForm({...form, createdAt: e.target.value})} style={{ ...inputStyle, border: "1px dashed #666", color: "#aaa" }} /></Field>

           <div style={{ gridColumn: "span 1", background: "#111", padding: 10, borderRadius: 8, border: "1px dashed #444" }}>
               <Field label="Marketing / Origen">
                   <select value={form.referralSource} onChange={e => setForm({...form, referralSource: e.target.value})} style={{ ...inputStyle, border: "none", background: "transparent", padding: 0, color: "#4ade80", fontWeight: "bold" }}>
                       {sources.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
               </Field>
               {referrerName && <div style={{ fontSize: "0.8em", color: "#aaa", marginTop: 5 }}>Recomendado por: <Link to={`/patients/${patient.referredBy}`} style={{color: "#60a5fa"}}>{referrerName}</Link></div>}
           </div>
        </div>

        {/* DIRECCIÓN (NUEVO) */}
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #333" }}>
            <h4 style={{ margin: "0 0 15px 0", color: "#f472b6", fontSize: "0.9em" }}>Dirección Particular</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15 }}>
                <div style={{ gridColumn: "span 2" }}>
                    <Field label="Calle"><input value={form.street} onChange={e => setForm({...form, street: e.target.value})} style={inputStyle} placeholder="Calle principal" /></Field>
                </div>
                <Field label="Num Ext"><input value={form.externalNumber} onChange={e => setForm({...form, externalNumber: e.target.value})} style={inputStyle} /></Field>
                <Field label="Num Int"><input value={form.internalNumber} onChange={e => setForm({...form, internalNumber: e.target.value})} style={inputStyle} /></Field>
                <Field label="Colonia"><input value={form.suburb} onChange={e => setForm({...form, suburb: e.target.value})} style={inputStyle} /></Field>
                <Field label="C.P."><input value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} style={inputStyle} placeholder="00000" /></Field>
                <Field label="Ciudad / Municipio"><input value={form.city} onChange={e => setForm({...form, city: e.target.value})} style={inputStyle} /></Field>
                <Field label="Estado"><input value={form.state} onChange={e => setForm({...form, state: e.target.value})} style={inputStyle} /></Field>
            </div>
        </div>

        {/* DATOS FISCALES */}
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #333" }}>
            <h4 style={{ margin: "0 0 15px 0", color: "#60a5fa", fontSize: "0.9em" }}>Datos de Facturación (SAT)</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 15 }}>
                <Field label="RFC"><input value={form.rfc} onChange={e => setForm({...form, rfc: e.target.value})} style={inputStyle} placeholder="ABCD010101XYZ" /></Field>
                <Field label="Razón Social"><input value={form.razonSocial} onChange={e => setForm({...form, razonSocial: e.target.value})} style={inputStyle} placeholder="Nombre completo" /></Field>
                <Field label="Régimen Fiscal"><input value={form.regimen} onChange={e => setForm({...form, regimen: e.target.value})} style={inputStyle} placeholder="601, 626..." /></Field>
                <Field label="C.P. Fiscal"><input value={form.cp} onChange={e => setForm({...form, cp: e.target.value})} style={inputStyle} placeholder="Igual a dirección" /></Field>
                <Field label="Email Factura"><input value={form.emailFactura} onChange={e => setForm({...form, emailFactura: e.target.value})} style={inputStyle} placeholder="Para XML/PDF" /></Field>
            </div>
        </div>
      </section>

      <div style={{ display: "grid", gap: "40px" }}>
        <AnamnesisPanel patientId={id} />
        <ConsultationsPanel patientId={id} />
        <EyeExamsPanel patientId={id} onSell={handleSellFromExam} />
        <hr style={{ border: "0", borderTop: "1px solid #333", margin: "0" }} />
        <div id="sales-section">
           <SalesPanel patientId={id} prefillData={salePrefill} onClearPrefill={() => setSalePrefill(null)} />
        </div>
      </div>
    </div>
  );
}