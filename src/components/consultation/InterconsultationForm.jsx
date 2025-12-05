import React from "react";

export default function InterconsultationForm({ data, onChange }) {
    if (!data.required) {
        return (
            <button onClick={() => onChange({ ...data, required: true, createdAt: new Date().toISOString() })} style={{ background: "transparent", border: "1px dashed #60a5fa", color: "#60a5fa", padding: "8px", width: "100%", borderRadius: 6, cursor: "pointer" }}>+ Solicitar Interconsulta / Derivación</button>
        );
    }
    return (
        <div style={{ background: "rgba(30, 58, 138, 0.2)", border: "1px solid #1e40af", borderRadius: 8, padding: 15 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ margin: 0, color: "#93c5fd" }}>Solicitud de Interconsulta</h4>
                <button onClick={() => onChange({ ...data, required: false })} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 12 }}>Cancelar</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "#aaa" }}>Especialidad / Profesional Destino <input value={data.to} onChange={e => onChange({ ...data, to: e.target.value })} style={{ width: "100%", padding: 8, background: "#111", border: "1px solid #1e40af", color: "white", borderRadius: 4 }} placeholder="Ej. Retina, Medicina Interna..." /></label>
                <label style={{ fontSize: 12, color: "#aaa" }}>Urgencia <select value={data.urgency} onChange={e => onChange({ ...data, urgency: e.target.value })} style={{ width: "100%", padding: 8, background: "#111", border: "1px solid #1e40af", color: "white", borderRadius: 4 }}><option value="NORMAL">Normal / Ordinaria</option><option value="URGENTE">Urgente</option></select></label>
            </div>
            <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 4 }}>Motivo de Envío</label>
            <textarea rows={3} value={data.reason} onChange={e => onChange({ ...data, reason: e.target.value })} style={{ width: "100%", padding: 8, background: "#111", border: "1px solid #1e40af", color: "white", borderRadius: 4 }} placeholder="Describir hallazgo y motivo..." />
            <div style={{ marginTop: 10, fontSize: 11, color: "#666" }}>Estado: <span style={{ color: "white" }}>{data.status}</span> · Solicitada: {new Date(data.createdAt).toLocaleDateString()}</div>
        </div>
    );
}