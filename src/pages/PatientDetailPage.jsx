import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPatientById, updatePatient } from "../services/patientsStorage";
import ConsultationsPanel from "../components/ConsultationsPanel";
import AnamnesisPanel from "../components/AnamnesisPanel";

export default function PatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });

  useEffect(() => {
    const p = getPatientById(id);
    setPatient(p);
    if (p) setForm({ firstName: p.firstName, lastName: p.lastName, phone: p.phone, email: p.email });
  }, [id]);

  if (!patient) {
    return (
      <div>
        <p>Paciente no encontrado.</p>
        <Link to="/patients">Volver</Link>
      </div>
    );
  }

  const onSave = () => {
    const updated = updatePatient(id, form);
    setPatient(updated);
  };

  return (
    <div>
      <Link to="/patients">← Volver</Link>
      <h1>{patient.firstName} {patient.lastName}</h1>

      <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
        <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
        <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        <button onClick={onSave}>Guardar cambios</button>
      </div>
      <ConsultationsPanel patientId={id} />
      <AnamnesisPanel patientId={id} />
    </div>
  );
}
