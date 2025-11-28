import React, { useMemo, useState, useEffect } from "react";
import { createSale, getSalesByPatientId, deleteSale } from "@/services/salesStorage";
import { getExamsByPatient, getExamById } from "@/services/eyeExamStorage"; 
import RxPicker from "./RxPicker";
import { normalizeRxValue } from "@/utils/rxOptions";

export default function SalesPanel({ patientId, prefillData, onClearPrefill }) {
  const [tick, setTick] = useState(0);
  
  // Modos de origen: 'NONE', 'EXAM'
  const [sourceType, setSourceType] = useState("NONE");
  const [selectedExamId, setSelectedExamId] = useState("");

  const [form, setForm] = useState({
    kind: "LENSES",
    description: "",
    total: "",
    initialPayment: "",
    method: "EFECTIVO",
    labName: "",
    dueDate: "",
    rxNotes: "",
    rxManual: normalizeRxValue(),
  });

  const sales = useMemo(() => getSalesByPatientId(patientId), [patientId, tick]);
  const exams = useMemo(() => getExamsByPatient(patientId), [patientId, tick]);

  // EFECTO: Cuando llega data desde el botón "Vender" del examen
  useEffect(() => {
    if (prefillData && prefillData.type === 'EXAM') {
      const exam = prefillData.data;
      setSourceType("EXAM");
      setSelectedExamId(exam.id);
      
      // Auto-generamos la descripción basada en la recomendación
      let autoDesc = "Lentes Completos";
      if (exam.recommendations?.design) autoDesc += ` - ${exam.recommendations.design}`;
      if (exam.recommendations?.material) autoDesc += ` (${exam.recommendations.material})`;

      setForm(prev => ({
        ...prev,
        kind: "LENSES",
        description: autoDesc,
        rxNotes: exam.notes || "",
        rxManual: exam.rx, // Copiamos la Rx del examen
      }));
      
      window.scrollTo({ top: 500, behavior: 'smooth' }); 
    }
  }, [prefillData]);

  // Manejo manual del selector de exámenes
  const handleExamSelect = (examId) => {
    setSelectedExamId(examId);
    if (!examId) return;
    const exam = exams.find(e => e.id === examId);
    if (exam) {
      setForm(prev => ({
        ...prev,
        rxManual: exam.rx,
        description: prev.description || (exam.recommendations?.design ? `Lentes ${exam.recommendations.design}` : ""),
      }));
    }
  };

  const onCreate = (e) => {
    e.preventDefault();
    if (!form.total) return;

    createSale({
      patientId,
      kind: form.kind,
      description: form.description,
      total: Number(form.total),
      payments: form.initialPayment > 0 ? [{ amount: Number(form.initialPayment), method: form.method, paidAt: new Date().toISOString() }] : [],
      items: [{
        kind: form.kind,
        description: form.description,
        qty: 1,
        unitPrice: Number(form.total),
        requiresLab: true,
        eyeExamId: selectedExamId || null, // 👈 GUARDAMOS LA RELACIÓN
        rxSnapshot: normalizeRxValue(form.rxManual), // Guardamos foto estática por seguridad
        labName: form.labName,
        dueDate: form.dueDate
      }]
    });

    // Limpiar
    setForm({ kind: "LENSES", description: "", total: "", initialPayment: "", method: "EFECTIVO", labName: "", dueDate: "", rxNotes: "", rxManual: normalizeRxValue() });
    setSourceType("NONE");
    setSelectedExamId("");
    if (onClearPrefill) onClearPrefill(); 
    setTick(t => t + 1);
  };

  return (
    <section style={{ background: "#1a1a1a", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
      <h3 style={{ margin: "0 0 20px 0", color: "#e5e7eb" }}>Ventas y Caja</h3>

      <div style={{ background: "#111", padding: 20, borderRadius: 10, marginBottom: 20, border: "1px dashed #444" }}>
        
        {/* SELECTOR DE ORIGEN */}
        <div style={{ marginBottom: 15, paddingBottom: 15, borderBottom: "1px solid #333" }}>
          <label style={{ color: "#aaa", fontSize: 13, marginRight: 10 }}>Origen de datos:</label>
          <select 
            value={sourceType} 
            onChange={e => { setSourceType(e.target.value); setSelectedExamId(""); }}
            style={{ padding: 6, borderRadius: 4, background: "#222", color: "white", border: "1px solid #555" }}
          >
            <option value="NONE">Manual (Sin vínculo)</option>
            <option value="EXAM">Desde Examen de Vista</option>
          </select>
        </div>

        {sourceType === "EXAM" && (
          <div style={{ marginBottom: 15, background: "#1e3a8a", padding: 10, borderRadius: 6 }}>
            <label style={{ display: "block", color: "#bfdbfe", fontSize: 12, marginBottom: 4 }}>Selecciona el Examen:</label>
            <select 
              value={selectedExamId} 
              onChange={e => handleExamSelect(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 4 }}
            >
              <option value="">-- Seleccionar --</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>
                  {new Date(e.examDate).toLocaleDateString()} - {e.recommendations?.design || "Sin recomendación"}
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={onCreate} style={{ display: "grid", gap: 15 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
             <label>
               <span style={{fontSize:12, color:"#888"}}>Concepto / Descripción</span>
               <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} />
             </label>
             <label>
               <span style={{fontSize:12, color:"#888"}}>Total a Cobrar</span>
               <input type="number" value={form.total} onChange={e => setForm({...form, total: e.target.value})} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} />
             </label>
          </div>

          {/* Rx Preview */}
          <div style={{ opacity: sourceType === "EXAM" ? 0.8 : 1 }}>
             <strong style={{fontSize:12, color:"#888"}}>Graduación para Trabajo</strong>
             <RxPicker value={form.rxManual} onChange={rx => setForm({...form, rxManual: rx})} />
          </div>

          <button type="submit" style={{ padding: 12, background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>
            Generar Venta
          </button>
        </form>
      </div>

      {/* LISTA DE VENTAS */}
      <div style={{ display: "grid", gap: 10 }}>
        {/* ... (aquí se renderizan las ventas igual) ... */}
      </div>
    </section>
  );
}