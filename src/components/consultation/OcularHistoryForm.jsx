import React, { useState } from "react";
import { OCULAR_DISEASES, OCULAR_SYMPTOMS } from "@/utils/anamnesisOcularConfig";

const styles = {
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: "1em", color: "#4ade80", borderBottom: "1px solid #333", paddingBottom: 5, marginBottom: 10, marginTop: 0 },
  input: { width: "100%", padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "0.9em" },
  label: { fontSize: "0.85em", color: "#aaa", display: "block", marginBottom: 4 },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 },
  checkLabel: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.9em", color: "#ddd", marginBottom: 6 }
};

export default function OcularHistoryForm({ data, onChange }) {
  // Inicialización segura
  const hx = data || {};

  const update = (field, value) => onChange({ ...hx, [field]: value });
  const updateSub = (category, key, val) => update(category, { ...(hx[category] || {}), [key]: val });

  return (
    <div style={{ marginTop: 10 }}>
      
      {/* 1. LENTES (GRADUACIÓN) */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>1. Corrección Óptica (Gafas)</h4>
        <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
            <label style={styles.checkLabel}>
                <input type="radio" checked={hx.glasses?.uses === true} onChange={() => updateSub("glasses", "uses", true)} /> Sí usa
            </label>
            <label style={styles.checkLabel}>
                <input type="radio" checked={hx.glasses?.uses === false} onChange={() => updateSub("glasses", "uses", false)} /> No usa
            </label>
        </div>
        {hx.glasses?.uses && (
            <div style={{ background: "#111", padding: 10, borderRadius: 6, animation: "fadeIn 0.2s" }}>
                <div style={styles.row}>
                    <label>
                        <span style={styles.label}>¿Desde cuándo?</span>
                        <input value={hx.glasses?.since || ""} onChange={e => updateSub("glasses", "since", e.target.value)} style={styles.input} placeholder="Año o edad" />
                    </label>
                    <label>
                        <span style={styles.label}>Última Graduación (Fecha)</span>
                        <input type="date" value={hx.glasses?.lastRxDate || ""} onChange={e => updateSub("glasses", "lastRxDate", e.target.value)} style={styles.input} />
                    </label>
                </div>
                <label>
                    <span style={styles.label}>Problemas con sus lentes actuales</span>
                    <input value={hx.glasses?.issues || ""} onChange={e => updateSub("glasses", "issues", e.target.value)} style={styles.input} placeholder="Ve borroso, pesan, se rayaron..." />
                </label>
            </div>
        )}
      </div>

      {/* 2. LENTES DE CONTACTO */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>2. Lentes de Contacto (LC)</h4>
        <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
            <label style={styles.checkLabel}>
                <input type="radio" checked={hx.contactLenses?.uses === true} onChange={() => updateSub("contactLenses", "uses", true)} /> Sí usa / usó
            </label>
            <label style={styles.checkLabel}>
                <input type="radio" checked={hx.contactLenses?.uses === false} onChange={() => updateSub("contactLenses", "uses", false)} /> Niega uso
            </label>
        </div>
        {hx.contactLenses?.uses && (
            <div style={{ background: "#111", padding: 10, borderRadius: 6 }}>
                <div style={styles.row}>
                    <input placeholder="Tipo (Blandos, RGP...)" value={hx.contactLenses?.type || ""} onChange={e => updateSub("contactLenses", "type", e.target.value)} style={styles.input} />
                    <input placeholder="Horas uso / día" value={hx.contactLenses?.frequency || ""} onChange={e => updateSub("contactLenses", "frequency", e.target.value)} style={styles.input} />
                </div>
                <div style={styles.row}>
                    <input placeholder="Solución Limpieza" value={hx.contactLenses?.solution || ""} onChange={e => updateSub("contactLenses", "solution", e.target.value)} style={styles.input} />
                    <input placeholder="Complicaciones" value={hx.contactLenses?.issues || ""} onChange={e => updateSub("contactLenses", "issues", e.target.value)} style={styles.input} />
                </div>
            </div>
        )}
      </div>

      {/* 3. ENFERMEDADES OCULARES */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>3. Enfermedades Oculares Previas</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "#111", padding: 10, borderRadius: 6 }}>
            {OCULAR_DISEASES.map(dis => {
                const isActive = hx.diseases?.[dis.id]?.active || false;
                return (
                    <div key={dis.id}>
                        <label style={{ ...styles.checkLabel, color: isActive ? "#fbbf24" : "#aaa" }}>
                            <input 
                                type="checkbox" 
                                checked={isActive} 
                                onChange={e => {
                                    const next = { active: e.target.checked, notes: hx.diseases?.[dis.id]?.notes || "" };
                                    updateSub("diseases", dis.id, next);
                                }} 
                            />
                            {dis.label}
                        </label>
                        {isActive && (
                            <input 
                                placeholder="Detalles (ojo, tiempo...)" 
                                value={hx.diseases?.[dis.id]?.notes || ""} 
                                onChange={e => updateSub("diseases", dis.id, { active: true, notes: e.target.value })} 
                                style={{ ...styles.input, fontSize: "0.8em", padding: 4, marginTop: 2, borderColor: "#fbbf24" }} 
                            />
                        )}
                    </div>
                );
            })}
        </div>
        <div style={{ marginTop: 10 }}>
            <span style={styles.label}>Otras condiciones oculares:</span>
            <input value={hx.diseases?.other || ""} onChange={e => updateSub("diseases", "other", e.target.value)} style={styles.input} />
        </div>
      </div>

      {/* 4. CIRUGÍAS Y TRAUMA (Agrupados) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div>
              <h4 style={{ ...styles.sectionTitle, color: "#f87171" }}>4. Cirugías Oculares</h4>
              <div style={{ background: "#111", padding: 10, borderRadius: 6 }}>
                  <label style={styles.checkLabel}>
                      <input type="checkbox" checked={hx.surgeries?.active || false} onChange={e => updateSub("surgeries", "active", e.target.checked)} />
                      Antecedente Qx
                  </label>
                  {hx.surgeries?.active && (
                      <textarea 
                        rows={3} 
                        placeholder="Describir: Tipo, fecha y ojo..." 
                        value={hx.surgeries?.details || ""} 
                        onChange={e => updateSub("surgeries", "details", e.target.value)} 
                        style={{ ...styles.input, resize: "vertical" }} 
                      />
                  )}
              </div>
          </div>
          <div>
              <h4 style={{ ...styles.sectionTitle, color: "#f87171" }}>5. Traumatismos</h4>
              <div style={{ background: "#111", padding: 10, borderRadius: 6 }}>
                  <label style={styles.checkLabel}>
                      <input type="checkbox" checked={hx.trauma?.active || false} onChange={e => updateSub("trauma", "active", e.target.checked)} />
                      Golpes / Trauma
                  </label>
                  {hx.trauma?.active && (
                      <textarea 
                        rows={3} 
                        placeholder="Describir: Objeto, fecha, secuelas..." 
                        value={hx.trauma?.details || ""} 
                        onChange={e => updateSub("trauma", "details", e.target.value)} 
                        style={{ ...styles.input, resize: "vertical" }} 
                      />
                  )}
              </div>
          </div>
      </div>

      {/* 6. MEDICAMENTOS OCULARES */}
      <div style={styles.section}>
          <h4 style={styles.sectionTitle}>6. Medicamentos / Gotas Actuales</h4>
          <div style={{ background: "#111", padding: 10, borderRadius: 6 }}>
              <div style={styles.row}>
                  <input 
                    placeholder="Nombre (ej. Humylub)" 
                    value={hx.meds?.[0]?.name || ""} 
                    onChange={e => {
                        const newMeds = [...(hx.meds || [])];
                        if(!newMeds[0]) newMeds[0] = { name: "", dose: "" };
                        newMeds[0].name = e.target.value;
                        update("meds", newMeds);
                    }} 
                    style={styles.input} 
                  />
                  <input 
                    placeholder="Dosis / Frecuencia" 
                    value={hx.meds?.[0]?.dose || ""} 
                    onChange={e => {
                        const newMeds = [...(hx.meds || [])];
                        if(!newMeds[0]) newMeds[0] = { name: "", dose: "" };
                        newMeds[0].dose = e.target.value;
                        update("meds", newMeds);
                    }} 
                    style={styles.input} 
                  />
              </div>
              <textarea 
                placeholder="Alergias a gotas o medicamentos oftalmológicos..." 
                value={hx.allergies || ""} 
                onChange={e => update("allergies", e.target.value)} 
                style={{ ...styles.input, marginTop: 10, borderColor: "#f87171" }} 
              />
          </div>
      </div>

      {/* 7. SÍNTOMAS (CHECKBOXES RÁPIDOS) */}
      <div style={styles.section}>
          <h4 style={styles.sectionTitle}>7. Sintomatología Frecuente</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {OCULAR_SYMPTOMS.map(sym => (
                  <label key={sym.id} style={{ padding: "4px 8px", background: hx.symptoms?.[sym.id] ? "#1e3a8a" : "#222", borderRadius: 4, fontSize: "0.85em", cursor: "pointer", color: hx.symptoms?.[sym.id] ? "#bfdbfe" : "#888", border: "1px solid #444" }}>
                      <input 
                        type="checkbox" 
                        style={{ display: "none" }} 
                        checked={hx.symptoms?.[sym.id] || false} 
                        onChange={e => updateSub("symptoms", sym.id, e.target.checked)} 
                      />
                      {hx.symptoms?.[sym.id] ? "✓ " : "+ "}{sym.label}
                  </label>
              ))}
          </div>
      </div>

    </div>
  );
}
