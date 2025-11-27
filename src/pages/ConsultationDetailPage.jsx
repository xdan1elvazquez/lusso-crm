import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getConsultationById,
  updateConsultation,
} from "../services/consultationsStorage";

function toDateInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function ConsultationDetailPage() {
  const { patientId, consultationId } = useParams();
  const navigate = useNavigate();

  const [consultation, setConsultation] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({
    visitDate: "",
    type: "REFRACTIVE",
    reason: "",
    diagnosis: "",
    notes: "",
  });

  useEffect(() => {
    const c = getConsultationById(consultationId);
    if (!c || (patientId && c.patientId && c.patientId !== patientId)) {
      setNotFound(true);
      return;
    }
    setConsultation(c);
    setForm({
      visitDate: toDateInput(c.visitDate || c.createdAt),
      type: c.type || "REFRACTIVE",
      reason: c.reason || "",
      diagnosis: c.diagnosis || "",
      notes: c.notes || "",
    });
  }, [patientId, consultationId]);

  const onSave = (e) => {
    e.preventDefault();
    const updated = updateConsultation(consultationId, {
      patientId: consultation?.patientId ?? patientId ?? null,
      visitDate: form.visitDate,
      type: form.type,
      reason: form.reason,
      diagnosis: form.diagnosis,
      notes: form.notes,
    });
    if (!updated) {
      setNotFound(true);
      return;
    }
    navigate(`/patients/${patientId}`);
  };

  if (notFound) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <p>Consulta no encontrada.</p>
        <Link to={`/patients/${patientId}`}>← Volver al paciente</Link>
      </div>
    );
  }

  if (!consultation) {
    return <p>Cargando...</p>;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Link to={`/patients/${patientId}`}>← Volver al paciente</Link>
      <header style={{ display: "grid", gap: 4 }}>
        <h1 style={{ margin: 0 }}>Detalle de consulta</h1>
        <div style={{ opacity: 0.7, fontSize: 14 }}>
          Creada: {new Date(consultation.createdAt).toLocaleString()}
        </div>
      </header>

      <form onSubmit={onSave} style={{ display: "grid", gap: 10, maxWidth: 720 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Fecha de atención</span>
          <input
            type="date"
            value={form.visitDate}
            onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Tipo</span>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="REFRACTIVE">Examen de la vista</option>
            <option value="OPHTHALMO">Consulta oftalmológica</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Motivo</span>
          <input
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Diagnóstico</span>
          <input
            value={form.diagnosis}
            onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Notas</span>
          <textarea
            rows={4}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </label>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit">Guardar</button>
          <Link to={`/patients/${patientId}`} style={{ alignSelf: "center" }}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
