import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { getConsultationById, updateConsultation } from "@/services/consultationsStorage";
// Importamos el nuevo servicio
import { getExamsByConsultation, createEyeExam, deleteEyeExam } from "@/services/eyeExamStorage"; 
import RxPicker from "@/components/RxPicker";
import { normalizeRxValue } from "@/utils/rxOptions";
import { validateRx } from "@/utils/validators";

function toDateInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export default function ConsultationDetailPage() {
  const { patientId, consultationId } = useParams();
  
  // Estado de la consulta médica (Solo datos médicos)
  const [consultation, setConsultation] = useState(null);
  const [form, setForm] = useState({
    visitDate: "",
    type: "OPHTHALMO", // Por defecto oftalmológica
    reason: "",
    diagnosis: "",
    notes: "",
  });

  // Estado para la lista de exámenes vinculados
  const [exams, setExams] = useState([]);
  const [tick, setTick] = useState(0); // Para forzar recarga de exámenes

  // Estado para el formulario de "Nuevo Examen" (Rx)
  const [showRxForm, setShowRxForm] = useState(false);
  const [rxForm, setRxForm] = useState(normalizeRxValue());
  const [rxErrors, setRxErrors] = useState({});

  // Cargar consulta
  useEffect(() => {
    const c = getConsultationById(consultationId);
    if (c && c.patientId === patientId) {
      setConsultation(c);
      setForm({
        visitDate: toDateInput(c.visitDate || c.createdAt),
        type: c.type || "OPHTHALMO",
        reason: c.reason || "",
        diagnosis: c.diagnosis || "",
        notes: c.notes || "",
      });
    }
  }, [patientId, consultationId]);

  // Cargar exámenes vinculados cada vez que cambia 'tick'
  useEffect(() => {
    if (consultationId) {
      setExams(getExamsByConsultation(consultationId));
    }
  }, [consultationId, tick]);

  const onSaveConsultation = () => {
    updateConsultation(consultationId, {
      ...form,
      visitDate: form.visitDate || new Date().toISOString(),
    });
    alert("Datos médicos actualizados");
  };

  const onSaveExam = (e) => {
    e.preventDefault();
    // Validamos la Rx con tu "Cadenero"
    const validation = validateRx(rxForm);
    if (!validation.isValid) {
      setRxErrors(validation.errors);
      return;
    }

    createEyeExam({
      patientId,
      consultationId, // ¡Aquí hacemos el vínculo!
      examDate: form.visitDate || new Date().toISOString(),
      rx: rxForm,
      notes: rxForm.notes, // Usamos las notas del picker
    });

    // Limpieza
    setRxForm(normalizeRxValue());
    setRxErrors({});
    setShowRxForm(false);
    setTick((t) => t + 1); // Recargar lista
  };

  const onDeleteExam = (examId) => {
    if (confirm("¿Borrar este examen?")) {
      deleteEyeExam(examId);
      setTick((t) => t + 1);
    }
  };

  if (!consultation) return <p>Cargando...</p>;

  return (
    <div style={{ paddingBottom: 40 }}>
      <header style={{ marginBottom: 20 }}>
        <Link to={`/patients/${patientId}`} style={{ color: "#aaa", textDecoration: "none" }}>← Volver al paciente</Link>
        <h1 style={{ marginTop: 10 }}>Consulta {form.type === "OPHTHALMO" ? "Oftalmológica" : "General"}</h1>
      </header>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr" }}>
        
        {/* === SECCIÓN 1: DATOS MÉDICOS === */}
        <section style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
          <h3 style={{ marginTop: 0, borderBottom: "1px solid #333", paddingBottom: 10 }}>Datos Clínicos</h3>
          <div style={{ display: "grid", gap: 12, maxWidth: 600 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid" }}>
                <span style={{ fontSize: 13, color: "#888" }}>Fecha</span>
                <input type="date" value={form.visitDate} onChange={(e) => setForm(f => ({ ...f, visitDate: e.target.value }))} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white" }} />
              </label>
              <label style={{ display: "grid" }}>
                <span style={{ fontSize: 13, color: "#888" }}>Tipo</span>
                <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white" }}>
                  <option value="OPHTHALMO">Oftalmológica</option>
                  <option value="REFRACTIVE">Optometría</option>
                </select>
              </label>
            </div>
            
            <input placeholder="Motivo de consulta" value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} style={{ padding: 10, background: "#222", border: "1px solid #444", color: "white" }} />
            <input placeholder="Diagnóstico" value={form.diagnosis} onChange={(e) => setForm(f => ({ ...f, diagnosis: e.target.value }))} style={{ padding: 10, background: "#222", border: "1px solid #444", color: "white" }} />
            <textarea placeholder="Notas médicas / Plan de tratamiento" rows={3} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} style={{ padding: 10, background: "#222", border: "1px solid #444", color: "white" }} />
            
            <button onClick={onSaveConsultation} style={{ justifySelf: "start", background: "#333", border: "1px solid #555", color: "white" }}>Guardar Datos Médicos</button>
          </div>
        </section>

        {/* === SECCIÓN 2: EXÁMENES DE VISTA (RX) === */}
        <section style={{ background: "#111", padding: 20, borderRadius: 12, border: "1px dashed #444" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <h3 style={{ margin: 0 }}>Exámenes de la Vista (Refracción)</h3>
            {!showRxForm && (
              <button onClick={() => setShowRxForm(true)} style={{ background: "#2563eb", color: "white", border: "none" }}>
                + Nuevo Examen
              </button>
            )}
          </div>

          {/* LISTA DE EXÁMENES EXISTENTES */}
          <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
            {exams.length === 0 && !showRxForm && <p style={{ color: "#666", fontStyle: "italic" }}>No hay exámenes registrados en esta consulta.</p>}
            
            {exams.map((exam) => (
              <div key={exam.id} style={{ background: "#222", padding: 12, borderRadius: 8, borderLeft: "4px solid #4ade80", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "bold" }}>
                    OD: {exam.rx.od.sph?.toFixed(2)} / {exam.rx.od.cyl?.toFixed(2)} x {exam.rx.od.axis}°
                  </div>
                  <div style={{ fontWeight: "bold" }}>
                    OI: {exam.rx.os.sph?.toFixed(2)} / {exam.rx.os.cyl?.toFixed(2)} x {exam.rx.os.axis}°
                  </div>
                  <div style={{ fontSize: 12, color: "#888" }}>Add: {exam.rx.od.add || "-"} · Notas: {exam.notes || "Sin notas"}</div>
                </div>
                <button onClick={() => onDeleteExam(exam.id)} style={{ padding: "4px 8px", fontSize: 12, background: "transparent", border: "1px solid #666", color: "#888" }}>Borrar</button>
              </div>
            ))}
          </div>

          {/* FORMULARIO PARA NUEVO EXAMEN */}
          {showRxForm && (
            <div style={{ background: "#1f1f1f", padding: 15, borderRadius: 8, border: "1px solid #2563eb" }}>
              <h4 style={{ marginTop: 0, color: "#60a5fa" }}>Nueva Refracción</h4>
              
              {Object.keys(rxErrors).length > 0 && (
                <div style={{ color: "#f87171", fontSize: 13, marginBottom: 10 }}>⚠️ {Object.values(rxErrors)[0]}</div>
              )}

              <RxPicker value={rxForm} onChange={setRxForm} />
              
              <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
                <button onClick={onSaveExam} style={{ background: "#2563eb", color: "white", border: "none" }}>Guardar Examen</button>
                <button onClick={() => setShowRxForm(false)} style={{ background: "transparent", border: "none", color: "#aaa" }}>Cancelar</button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}