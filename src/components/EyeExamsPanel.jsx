import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { 
  getExamsByPatient, 
  createEyeExam, 
  deleteEyeExam 
} from "@/services/eyeExamStorage"; // Alias configurado
import RxPicker from "@/components/RxPicker";
import { normalizeRxValue } from "@/utils/rxOptions";
import { validateRx } from "@/utils/validators";

export default function EyeExamsPanel({ patientId }) {
  const [tick, setTick] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  
  // Estado del formulario para examen independiente
  const [formRx, setFormRx] = useState(normalizeRxValue());
  const [formNotes, setFormNotes] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState({});

  // Cargar todos los exámenes del paciente (Vinculados e Independientes)
  const exams = useMemo(() => getExamsByPatient(patientId), [patientId, tick]);

  const handleCreate = (e) => {
    e.preventDefault();
    
    // Validación
    const validation = validateRx(formRx);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    createEyeExam({
      patientId,
      consultationId: null, // 👈 ESTO LO HACE INDEPENDIENTE
      examDate: formDate,
      rx: formRx,
      notes: formNotes
    });

    // Reset y cerrar
    setFormRx(normalizeRxValue());
    setFormNotes("");
    setErrors({});
    setIsCreating(false);
    setTick(t => t + 1);
  };

  const handleDelete = (id) => {
    if(confirm("¿Eliminar este examen?")) {
      deleteEyeExam(id);
      setTick(t => t + 1);
    }
  };

  return (
    <section style={{ marginTop: 28, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Historial de Refracciones (Rx)</h2>
        <button onClick={() => setIsCreating(!isCreating)} style={{ fontSize: "0.9em" }}>
          {isCreating ? "Cancelar" : "+ Examen Independiente"}
        </button>
      </div>

      {/* FORMULARIO DE CREACIÓN INDEPENDIENTE */}
      {isCreating && (
        <form onSubmit={handleCreate} style={{ background: "#1a1a1a", padding: 16, borderRadius: 10, border: "1px solid #333" }}>
          <h4 style={{ marginTop: 0, color: "#4ade80" }}>Nuevo Examen (Solo Optometría)</h4>
          
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 4 }}>Fecha</label>
            <input 
              type="date" 
              value={formDate} 
              onChange={e => setFormDate(e.target.value)}
              style={{ background: "#222", border: "1px solid #444", color: "white", padding: 6, borderRadius: 4 }}
            />
          </div>

          {Object.keys(errors).length > 0 && (
            <div style={{ color: "#ff4d4f", fontSize: 13, marginBottom: 10 }}>
              ⚠️ {Object.values(errors)[0]}
            </div>
          )}

          <RxPicker value={formRx} onChange={setFormRx} />
          
          <textarea 
            placeholder="Notas del examen..." 
            rows={2} 
            value={formNotes}
            onChange={e => setFormNotes(e.target.value)}
            style={{ width: "100%", marginTop: 10, background: "#222", border: "1px solid #444", color: "white", padding: 8 }}
          />

          <button type="submit" style={{ marginTop: 12, background: "#4ade80", color: "black", border: "none" }}>
            Guardar Examen
          </button>
        </form>
      )}

      {/* LISTADO DE EXÁMENES */}
      <div style={{ display: "grid", gap: 10 }}>
        {exams.length === 0 ? (
          <p style={{ opacity: 0.6, fontStyle: "italic" }}>No hay exámenes registrados.</p>
        ) : (
          exams.map(exam => (
            <div key={exam.id} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 12, background: "#111" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <strong style={{ color: "#fff" }}>{new Date(exam.examDate).toLocaleDateString()}</strong>
                  <span style={{ marginLeft: 10, fontSize: 12, padding: "2px 6px", borderRadius: 4, background: exam.consultationId ? "#2563eb" : "#4ade80", color: exam.consultationId ? "white" : "black" }}>
                    {exam.consultationId ? "Médico (Vinculado)" : "Independiente"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {exam.consultationId && (
                    <Link to={`/patients/${patientId}/consultations/${exam.consultationId}`} style={{ fontSize: 12, color: "#60a5fa" }}>
                      Ver Consulta ↗
                    </Link>
                  )}
                  <button onClick={() => handleDelete(exam.id)} style={{ padding: "2px 6px", fontSize: 11, background: "transparent", border: "1px solid #444", color: "#888" }}>
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Resumen Rx */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.95em" }}>
                <div>
                  <span style={{ color: "#888", fontSize: 12 }}>OD:</span> 
                  <b style={{ marginLeft: 4 }}>{exam.rx.od.sph?.toFixed(2)} / {exam.rx.od.cyl?.toFixed(2)} x {exam.rx.od.axis}°</b>
                </div>
                <div>
                  <span style={{ color: "#888", fontSize: 12 }}>OI:</span> 
                  <b style={{ marginLeft: 4 }}>{exam.rx.os.sph?.toFixed(2)} / {exam.rx.os.cyl?.toFixed(2)} x {exam.rx.os.axis}°</b>
                </div>
              </div>
              
              {exam.notes && <div style={{ marginTop: 6, fontSize: 13, color: "#aaa" }}>📝 {exam.notes}</div>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}