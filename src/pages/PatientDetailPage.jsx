import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { 
  getPatientById, 
  updatePatient, 
  getPatientsRecommendedBy,
  touchPatientView // 👈 NUEVO
} from "@/services/patientsStorage";
import { getReferralSources } from "@/services/settingsStorage";
import ConsultationsPanel from "@/components/ConsultationsPanel";
import EyeExamsPanel from "@/components/EyeExamsPanel";
import AnamnesisPanel from "@/components/AnamnesisPanel";
import SalesPanel from "@/components/SalesPanel";
import WorkOrdersPanel from "@/components/WorkOrdersPanel";

function toDateInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formatDateTime(isoString) {
  if (!isoString) return "N/D";
  return new Date(isoString).toLocaleString("es-MX", { 
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
}

export default function PatientDetailPage() {
  const { id } = useParams();
  
  // Hooks de estado
  const [patient, setPatient] = useState(null);
  const [referrerName, setReferrerName] = useState("");
  const [recommendedList, setRecommendedList] = useState([]);
  const [salePrefill, setSalePrefill] = useState(null);
  
  const [form, setForm] = useState({ 
    firstName: "", lastName: "", phone: "", email: "", 
    dob: "", sex: "", occupation: "", referralSource: "",
    createdAt: "" // 👈 NUEVO CAMPO EDITABLE
  });
  const [sources, setSources] = useState([]);

  useEffect(() => {
    setSources(getReferralSources());
    const p = getPatientById(id);
    setPatient(p);
    
    if (p) {
        // Registramos que se abrió el perfil
        touchPatientView(id);

        setForm({ 
            firstName: p.firstName, lastName: p.lastName, phone: p.phone, email: p.email,
            dob: p.dob || "", sex: p.sex || "NO_ESPECIFICADO", occupation: p.occupation || "",
            referralSource: p.referralSource || "",
            createdAt: toDateInput(p.createdAt) // Convertimos a formato input date
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
    // Al guardar, si modificaron la fecha, se respeta la hora original o se pone 12:00
    // Truco: Concatenamos la hora actual para que no pierda el timestamp si solo cambian el día
    let finalCreatedAt = patient.createdAt;
    if (form.createdAt !== toDateInput(patient.createdAt)) {
       finalCreatedAt = new Date(form.createdAt + "T12:00:00").toISOString();
    }

    const updated = updatePatient(id, { ...form, createdAt: finalCreatedAt });
    setPatient(updated);
    alert("Ficha actualizada");
  };

  const calculateAge = (dob) => {
      if (!dob) return "Edad N/D";
      const diff = Date.now() - new Date(dob).getTime();
      const ageDate = new Date(diff);
      return Math.abs(ageDate.getUTCFullYear() - 1970) + " años";
  };

  const handleSellFromExam = (exam) => { 
      setSalePrefill({ type: 'EXAM', data: exam }); 
      setTimeout(() => {
        const salesElement = document.getElementById("sales-section");
        if(salesElement) salesElement.scrollIntoView({ behavior: "smooth" });
      }, 100);
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

      {/* HERO: INFO RÁPIDA Y METADATA */}
      <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #111827 100%)", padding: "25px", borderRadius: "12px", marginBottom: 30, border: "1px solid #374151", display: "grid", gap: 15, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <div>
                <h1 style={{ margin: 0, fontSize: "2.2rem", color: "white" }}>{patient.firstName} {patient.lastName}</h1>
                <div style={{ display: "flex", gap: 15, marginTop: 8, color: "#bfdbfe", fontSize: "0.95em" }}>
                    <span>🎂 {calculateAge(form.dob)}</span>
                    <span>📞 {patient.phone}</span>
                    
                    {/* 👇 AQUÍ ESTÁ EL AGREGADO DE PUNTOS 👇 */}
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
         
         {/* BARRA DE METADATA (Último acceso / actualización) */}
         <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10, marginTop: 5, display: "flex", gap: 20, fontSize: "0.8em", color: "#9ca3af" }}>
            <span>🕒 <strong>Último acceso:</strong> {formatDateTime(patient.lastViewed)}</span>
            <span>📝 <strong>Última edición:</strong> {formatDateTime(patient.updatedAt)}</span>
            <span>📅 <strong>Alta original:</strong> {new Date(patient.createdAt).toLocaleDateString()}</span>
         </div>
      </div>

      {/* FICHA DE IDENTIFICACIÓN */}
      <section style={{ background: "#1a1a1a", padding: "25px", borderRadius: "12px", border: "1px solid #333", marginBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid #333", paddingBottom: 10 }}>
            <h3 style={{ margin: 0, color: "#e5e7eb" }}>Ficha de Identificación</h3>
            <button onClick={onSave} style={{ background: "#333", color: "white", border: "1px solid #555", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: "0.9em" }}>Actualizar Datos</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
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
           
           {/* CAMPO DE FECHA DE CREACIÓN EDITABLE */}
           <Field label="Fecha de Alta (Registro)">
               <input type="date" value={form.createdAt} onChange={e => setForm({...form, createdAt: e.target.value})} style={{ ...inputStyle, border: "1px dashed #666", color: "#aaa" }} title="Modificar si es un registro histórico" />
           </Field>

           {/* MARKETING MINI CARD */}
           <div style={{ gridColumn: "span 1", background: "#111", padding: 10, borderRadius: 8, border: "1px dashed #444" }}>
               <Field label="Marketing / Origen">
                   <select value={form.referralSource} onChange={e => setForm({...form, referralSource: e.target.value})} style={{ ...inputStyle, border: "none", background: "transparent", padding: 0, color: "#4ade80", fontWeight: "bold" }}>
                       {sources.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
               </Field>
               {referrerName && <div style={{ fontSize: "0.8em", color: "#aaa", marginTop: 5 }}>Recomendado por: <Link to={`/patients/${patient.referredBy}`} style={{color: "#60a5fa"}}>{referrerName}</Link></div>}
               {recommendedList.length > 0 && <div style={{ fontSize: "0.8em", color: "#fbbf24", marginTop: 5 }}>🏆 {recommendedList.length} referidos</div>}
           </div>
        </div>
      </section>

      {/* SECCIONES ORDENADAS CLÍNICAMENTE */}
      <div style={{ display: "grid", gap: "40px" }}>
        <AnamnesisPanel patientId={id} />
        <ConsultationsPanel patientId={id} />
        <EyeExamsPanel patientId={id} onSell={handleSellFromExam} />
        <hr style={{ border: "0", borderTop: "1px solid #333", margin: "0" }} />
        <div id="sales-section">
           <SalesPanel patientId={id} prefillData={salePrefill} onClearPrefill={() => setSalePrefill(null)} />
        </div>
        {/* (Eliminado WorkOrdersPanel de esta vista detallada como pediste) */}
      </div>
    </div>
  );
}