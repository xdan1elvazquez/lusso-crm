import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPatientById, updatePatient } from "@/services/patientsStorage";
import ConsultationsPanel from "@/components/ConsultationsPanel";
import EyeExamsPanel from "@/components/EyeExamsPanel"; // 👈 IMPORTAR EL NUEVO PANEL
import AnamnesisPanel from "@/components/AnamnesisPanel";
import SalesPanel from "@/components/SalesPanel";
import WorkOrdersPanel from "@/components/WorkOrdersPanel";

export default function PatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  // ... (el resto de tu estado y useEffect igual que antes) ...
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });

  useEffect(() => {
    const p = getPatientById(id);
    setPatient(p);
    if (p) setForm({ firstName: p.firstName, lastName: p.lastName, phone: p.phone, email: p.email });
  }, [id]);

  if (!patient) return <div>Cargando...</div>; // Simplificado

  const onSave = () => {
    const updated = updatePatient(id, form);
    setPatient(updated);
    alert("Datos actualizados");
  };

  return (
    <div style={{ paddingBottom: 60 }}>
      <Link to="/patients" style={{ color: "#888", textDecoration: "none" }}>← Volver</Link>
      <h1 style={{ marginTop: 10 }}>{patient.firstName} {patient.lastName}</h1>

      {/* Datos Generales */}
      <div style={{ display: "grid", gap: 8, maxWidth: 520, marginBottom: 30, background: "#1a1a1a", padding: 16, borderRadius: 10 }}>
        <h3 style={{ margin: "0 0 10px 0" }}>Datos Personales</h3>
        <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white" }} />
        <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white" }} />
        <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white" }} />
        <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white" }} />
        <button onClick={onSave} style={{ marginTop: 8 }}>Guardar cambios</button>
      </div>

      {/* --- PANELES CLÍNICOS --- */}
      
      {/* 1. Consultas Médicas (Diagnósticos) */}
      <ConsultationsPanel patientId={id} />

      {/* 2. Exámenes de la Vista (NUEVO: Aquí verás todo el historial Rx) */}
      <EyeExamsPanel patientId={id} />

      <hr style={{ margin: "30px 0", borderColor: "#333" }} />

      {/* 3. Otros Datos */}
      <AnamnesisPanel patientId={id} />
      <SalesPanel patientId={id} />
      <WorkOrdersPanel patientId={id} />
    </div>
  );
}
