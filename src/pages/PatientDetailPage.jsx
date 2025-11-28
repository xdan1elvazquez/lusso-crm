import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPatientById, updatePatient } from "@/services/patientsStorage";
import ConsultationsPanel from "@/components/ConsultationsPanel";
import EyeExamsPanel from "@/components/EyeExamsPanel";
import AnamnesisPanel from "@/components/AnamnesisPanel";
import SalesPanel from "@/components/SalesPanel";
import WorkOrdersPanel from "@/components/WorkOrdersPanel";

export default function PatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  
  // ESTADO PUENTE PARA VINCULAR
  const [salePrefill, setSalePrefill] = useState(null); 

  useEffect(() => {
    const p = getPatientById(id);
    setPatient(p);
    if (p) setForm({ firstName: p.firstName, lastName: p.lastName, phone: p.phone, email: p.email });
  }, [id]);

  if (!patient) return <div style={{ padding: 40, textAlign: "center" }}>Cargando paciente...</div>;

  const onSave = () => {
    const updated = updatePatient(id, form);
    setPatient(updated);
    alert("Datos actualizados correctamente");
  };

  const handleSellFromExam = (exam) => {
    setSalePrefill({ type: 'EXAM', data: exam });
  };

  return (
    <div style={{ paddingBottom: 80, width: "100%" }}>
      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <Link to="/patients" style={{ color: "#aaa", textDecoration: "none", fontSize: "0.9em" }}>
          ← Volver a lista
        </Link>
        <h1 style={{ margin: "10px 0 0 0", fontSize: "2rem" }}>
          {patient.firstName} {patient.lastName}
        </h1>
        <div style={{ color: "#666", fontSize: "0.9em" }}>ID: {patient.id}</div>
      </div>

      {/* DATOS PERSONALES */}
      <section style={{ 
        background: "#1a1a1a", 
        padding: "24px", 
        borderRadius: "12px", 
        border: "1px solid #333",
        marginBottom: "40px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: "#e5e7eb" }}>Datos Personales</h3>
          <button onClick={onSave} style={{ background: "#2563eb", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
            Guardar Cambios
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", color: "#9ca3af" }}>Nombre(s)</span>
            <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} style={{ padding: "10px", background: "#262626", border: "1px solid #404040", color: "white", borderRadius: "6px", width: "100%" }} />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", color: "#9ca3af" }}>Apellidos</span>
            <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} style={{ padding: "10px", background: "#262626", border: "1px solid #404040", color: "white", borderRadius: "6px", width: "100%" }} />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", color: "#9ca3af" }}>Teléfono</span>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={{ padding: "10px", background: "#262626", border: "1px solid #404040", color: "white", borderRadius: "6px", width: "100%" }} />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", color: "#9ca3af" }}>Email</span>
            <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={{ padding: "10px", background: "#262626", border: "1px solid #404040", color: "white", borderRadius: "6px", width: "100%" }} />
          </label>
        </div>
      </section>

      {/* PANELES */}
      <div style={{ display: "grid", gap: "40px" }}>
        <ConsultationsPanel patientId={id} />
        
        {/* Pasamos la función onSell */}
        <EyeExamsPanel patientId={id} onSell={handleSellFromExam} />

        <hr style={{ border: "0", borderTop: "1px solid #333", margin: "0" }} />

        <AnamnesisPanel patientId={id} />

        {/* Pasamos los datos al panel de ventas */}
        <SalesPanel 
           patientId={id} 
           prefillData={salePrefill} 
           onClearPrefill={() => setSalePrefill(null)} 
        />

        <WorkOrdersPanel patientId={id} />
      </div>
    </div>
  );
}