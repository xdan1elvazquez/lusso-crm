import React from "react";
import { RELATIVES_CONFIG } from "@/utils/anamnesisFamilyConfig";

const styles = {
  card: { background: "#111", border: "1px solid #333", borderRadius: 8, padding: 12, marginBottom: 10 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { fontSize: "0.85em", color: "#aaa", display: "block", marginBottom: 3 },
  input: { width: "100%", padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "0.9em" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 },
  toggleBtn: { cursor: "pointer", background: "none", border: "none", fontSize: "0.8em" }
};

export default function FamilyHistoryForm({ data, onChange }) {
  // Estructura segura
  const familyData = data || { relatives: {}, ophthalmic: {} };

  const updateRelative = (id, field, val) => {
    const current = familyData.relatives?.[id] || { negated: false };
    const next = { ...current, [field]: val };
    // Si se niega, limpiamos datos para ahorrar espacio visual/mental
    if (field === "negated" && val === true) {
        next.diseases = ""; next.treatment = ""; next.vitalStatus = "UNKNOWN";
    }
    onChange({ 
        ...familyData, 
        relatives: { ...familyData.relatives, [id]: next } 
    });
  };

  const updateOphthalmic = (relId, field, val) => {
      const current = familyData.ophthalmic?.[relId] || { negated: true };
      const next = { ...current, [field]: val };
      onChange({
          ...familyData,
          ophthalmic: { ...familyData.ophthalmic, [relId]: next }
      });
  };

  return (
    <div style={{ marginTop: 10 }}>
      {/* SECCIÓN 1: SISTÉMICOS POR FAMILIAR */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ margin: "0 0 10px 0", color: "#60a5fa", borderBottom: "1px solid #333", paddingBottom: 5 }}>A. Enfermedades Sistémicas / Estado Vital</h4>
        {RELATIVES_CONFIG.map(rel => {
            const relData = familyData.relatives?.[rel.id] || { negated: false, vitalStatus: "ALIVE" };
            const isNegated = relData.negated;

            return (
                <div key={rel.id} style={{ ...styles.card, borderLeft: isNegated ? "3px solid #333" : "3px solid #fbbf24", opacity: isNegated ? 0.7 : 1 }}>
                    <div style={styles.header}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <strong style={{ color: "#e5e7eb" }}>{rel.label}</strong>
                            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.8em", cursor: "pointer" }}>
                                <input type="checkbox" checked={isNegated} onChange={e => updateRelative(rel.id, "negated", e.target.checked)} />
                                Negados / Sano
                            </label>
                        </div>
                        {rel.hasCount && (
                            <input 
                                type="number" 
                                placeholder="#" 
                                style={{ width: 50, padding: 2, textAlign: "center", background: "#333", border: "1px solid #555", color: "white", borderRadius: 4 }} 
                                value={relData.count || ""}
                                onChange={e => updateRelative(rel.id, "count", e.target.value)}
                            />
                        )}
                    </div>

                    {!isNegated && (
                        <div style={{ animation: "fadeIn 0.2s" }}>
                            {/* Estado Vital */}
                            <div style={{ marginBottom: 10, background: "#222", padding: 8, borderRadius: 4 }}>
                                <span style={{ marginRight: 10, fontSize: "0.85em", color: "#aaa" }}>Estado:</span>
                                {["ALIVE", "DECEASED", "UNKNOWN"].map(status => (
                                    <label key={status} style={{ marginRight: 10, fontSize: "0.85em", cursor: "pointer", color: relData.vitalStatus === status ? "#fff" : "#666" }}>
                                        <input 
                                            type="radio" 
                                            name={`status-${rel.id}`} 
                                            checked={relData.vitalStatus === status} 
                                            onChange={() => updateRelative(rel.id, "vitalStatus", status)}
                                            style={{ marginRight: 4 }}
                                        />
                                        {status === "ALIVE" ? "Vivo" : status === "DECEASED" ? "Finado" : "Desc."}
                                    </label>
                                ))}
                                {relData.vitalStatus === "DECEASED" && (
                                    <div style={{ marginTop: 5, display: "grid", gridTemplateColumns: "1fr 100px", gap: 5 }}>
                                        <input placeholder="Causa fallecimiento" value={relData.deathCause || ""} onChange={e => updateRelative(rel.id, "deathCause", e.target.value)} style={styles.input} />
                                        <input placeholder="Tiempo (años)" value={relData.deathTime || ""} onChange={e => updateRelative(rel.id, "deathTime", e.target.value)} style={styles.input} />
                                    </div>
                                )}
                            </div>

                            {/* Padecimientos */}
                            <label style={styles.label}>Enfermedades (Diabetes, HAS, Cáncer...)</label>
                            <input value={relData.diseases || ""} onChange={e => updateRelative(rel.id, "diseases", e.target.value)} style={{ ...styles.input, marginBottom: 5 }} placeholder="Describir padecimientos..." />
                            
                            <div style={styles.row}>
                                <input placeholder="Tiempo evolución" value={relData.diseaseDuration || ""} onChange={e => updateRelative(rel.id, "diseaseDuration", e.target.value)} style={styles.input} />
                                <input placeholder="Tratamiento" value={relData.treatment || ""} onChange={e => updateRelative(rel.id, "treatment", e.target.value)} style={styles.input} />
                            </div>
                        </div>
                    )}
                </div>
            );
        })}
      </div>

      {/* SECCIÓN 2: OFTALMOLÓGICOS (TABLITA RESUMIDA) */}
      <div>
          <h4 style={{ margin: "0 0 10px 0", color: "#a78bfa", borderBottom: "1px solid #333", paddingBottom: 5 }}>B. Heredofamiliares Oftalmológicos</h4>
          <div style={{ display: "grid", gap: 5 }}>
              {RELATIVES_CONFIG.map(rel => {
                  const ophData = familyData.ophthalmic?.[rel.id] || { negated: true };
                  if (ophData.negated) {
                      return (
                          <div key={rel.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#111", borderBottom: "1px solid #222", fontSize: "0.9em" }}>
                              <span style={{ color: "#888" }}>{rel.label}</span>
                              <button onClick={() => updateOphthalmic(rel.id, "negated", false)} style={{ color: "#4ade80", background: "none", border: "none", cursor: "pointer", fontSize: "0.9em" }}>+ Agregar</button>
                          </div>
                      );
                  }
                  return (
                      <div key={rel.id} style={{ background: "#1f1f1f", padding: 10, borderRadius: 6, border: "1px solid #a78bfa", marginBottom: 5 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                              <strong style={{ color: "#e5e7eb", fontSize: "0.9em" }}>{rel.label}</strong>
                              <button onClick={() => updateOphthalmic(rel.id, "negated", true)} style={{ color: "#f87171", background: "none", border: "none", cursor: "pointer", fontSize: "0.8em" }}>Cancelar</button>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                              <input placeholder="Padecimiento (Glaucoma, etc)" value={ophData.condition || ""} onChange={e => updateOphthalmic(rel.id, "condition", e.target.value)} style={styles.input} />
                              <input placeholder="Tratamiento" value={ophData.treatment || ""} onChange={e => updateOphthalmic(rel.id, "treatment", e.target.value)} style={styles.input} />
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>
    </div>
  );
}