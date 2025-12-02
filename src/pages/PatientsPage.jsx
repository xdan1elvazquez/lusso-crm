import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePatients } from "@/hooks/usePatients";
import { validatePatient } from "@/utils/validators";
import { getReferralSources } from "@/services/settingsStorage";
// 👇 IMPORTAR HANDLER
import { handlePhoneInput } from "@/utils/inputHandlers";

export default function PatientsPage() {
  const { patients, create, remove } = usePatients();
  const [q, setQ] = useState("");
  const [sources, setSources] = useState([]);
  
  const [form, setForm] = useState({ 
    firstName: "", lastName: "", phone: "", email: "", 
    dob: "", sex: "NO_ESPECIFICADO", occupation: "",
    referralSource: "", referredBy: "" 
  });
  
  const [referrerQuery, setReferrerQuery] = useState("");
  const [selectedReferrer, setSelectedReferrer] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => { setSources(getReferralSources()); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return patients;
    return patients.filter((p) => `${p.firstName} ${p.lastName} ${p.phone}`.toLowerCase().includes(s));
  }, [patients, q]);

  const filteredReferrers = useMemo(() => {
    if (!referrerQuery) return [];
    const s = referrerQuery.toLowerCase();
    return patients.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(s)).slice(0, 5);
  }, [patients, referrerQuery]);

  const onSubmit = (e) => {
    e.preventDefault();
    const validation = validatePatient(form);
    if (!validation.isValid) { setErrors(validation.errors); return; }
    setErrors({});
    create({ ...form, referralSource: form.referralSource || "Pasaba por aquí", referredBy: selectedReferrer?.id || null });
    setForm({ firstName: "", lastName: "", phone: "", email: "", dob: "", sex: "NO_ESPECIFICADO", occupation: "", referralSource: "", referredBy: "" });
    setReferrerQuery(""); setSelectedReferrer(null);
  };

  const InputGroup = ({ label, error, children }) => (
    <label style={{ display: "block", marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 4 }}>{label}</span>
      {children}
      {error && <div style={{ color: "#f87171", fontSize: 11, marginTop: 2 }}>{error}</div>}
    </label>
  );

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      
      {/* HEADER Y BUSCADOR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h1 style={{ margin: 0 }}>Pacientes</h1>
        <input
          placeholder="🔍 Buscar por nombre o teléfono..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: 300, padding: "10px", borderRadius: "8px", border: "1px solid #444", background: "#111", color: "white" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 30, alignItems: "start" }}>
          
          {/* FORMULARIO PRINCIPAL (MÁS LIMPIO) */}
          <div style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333" }}>
            <h3 style={{ marginTop: 0, color: "#e5e7eb", borderBottom: "1px solid #333", paddingBottom: 15, marginBottom: 20 }}>Registrar Nuevo Paciente</h3>
            
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 15 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                    <InputGroup label="Nombre(s)" error={errors.firstName}>
                        <input value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #444", background: "#222", color: "white" }} />
                    </InputGroup>
                    <InputGroup label="Apellidos" error={errors.lastName}>
                        <input value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #444", background: "#222", color: "white" }} />
                    </InputGroup>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                    {/* 👇 INPUT DE TELÉFONO ACTUALIZADO */}
                    <InputGroup label="Teléfono (10 dígitos)" error={errors.phone}>
                        <input 
                            type="tel"
                            placeholder="55 1234 5678"
                            maxLength={10}
                            value={form.phone} 
                            onChange={(e) => {
                                // Sanitización inmediata
                                const clean = handlePhoneInput(e.target.value);
                                setForm(f => ({ ...f, phone: clean }));
                            }} 
                            style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #444", background: "#222", color: "white" }} 
                        />
                    </InputGroup>
                    <InputGroup label="Email (Opcional)">
                        <input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #444", background: "#222", color: "white" }} />
                    </InputGroup>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 15 }}>
                    <InputGroup label="Fecha Nacimiento">
                        <input type="date" value={form.dob} onChange={(e) => setForm(f => ({ ...f, dob: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #444", background: "#222", color: "white" }} />
                    </InputGroup>
                    <InputGroup label="Sexo">
                        <select value={form.sex} onChange={(e) => setForm(f => ({ ...f, sex: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #444", background: "#222", color: "white" }}>
                            <option value="NO_ESPECIFICADO">Prefiero no decir</option>
                            <option value="MUJER">Mujer</option>
                            <option value="HOMBRE">Hombre</option>
                        </select>
                    </InputGroup>
                    <InputGroup label="Ocupación">
                        <input placeholder="Ej. Estudiante" value={form.occupation} onChange={(e) => setForm(f => ({ ...f, occupation: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #444", background: "#222", color: "white" }} />
                    </InputGroup>
                </div>

                {/* SECCIÓN MARKETING (DIFERENCIADA) */}
                <div style={{ background: "#111", padding: 15, borderRadius: 8, border: "1px dashed #444", marginTop: 10 }}>
                    <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: "bold", marginBottom: 10 }}>📊 Origen del Paciente</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                        <select value={form.referralSource} onChange={(e) => setForm(f => ({ ...f, referralSource: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #444", background: "#222", color: "white" }}>
                            <option value="">-- ¿Cómo se enteró? --</option>
                            {sources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        {form.referralSource === "Recomendación" && (
                            <div style={{ position: "relative" }}>
                                {selectedReferrer ? (
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e3a8a", padding: 10, borderRadius: 6 }}>
                                        <span style={{ fontSize: 13 }}>Recomendado por: <strong>{selectedReferrer.firstName} {selectedReferrer.lastName}</strong></span>
                                        <button type="button" onClick={() => setSelectedReferrer(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>✕</button>
                                    </div>
                                ) : (
                                    <>
                                        <input placeholder="Buscar quién lo recomendó..." value={referrerQuery} onChange={e => setReferrerQuery(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #4ade80", background: "#222", color: "white" }} />
                                        {referrerQuery && filteredReferrers.length > 0 && (
                                            <div style={{ position: "absolute", top: "100%", width: "100%", background: "#333", border: "1px solid #555", zIndex: 10, borderRadius: 6, marginTop: 4 }}>
                                                {filteredReferrers.map(p => (
                                                    <div key={p.id} onClick={() => { setSelectedReferrer(p); setReferrerQuery(""); }} style={{ padding: 10, borderBottom: "1px solid #444", cursor: "pointer", fontSize: 13 }}>{p.firstName} {p.lastName}</div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <button type="submit" style={{ marginTop: 15, padding: "12px", background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: "1em" }}>
                    Guardar Paciente
                </button>
            </form>
          </div>

          {/* LISTADO COMPACTO (DERECHA) */}
          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <div style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Directorio Reciente</div>
            {filtered.length === 0 ? <p style={{ opacity: 0.6, fontSize: 13 }}>Sin resultados.</p> : 
              filtered.map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1a1a1a", padding: "12px 15px", borderRadius: "8px", border: "1px solid #333" }}>
                    <div style={{ overflow: "hidden" }}>
                      <Link to={`/patients/${p.id}`} style={{ fontWeight: "bold", fontSize: "1em", color: "#fff", textDecoration: "none", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.firstName} {p.lastName}
                      </Link>
                      <div style={{ fontSize: "0.8em", color: "#888", marginTop: "2px" }}>{p.phone}</div>
                    </div>
                    <button onClick={() => remove(p.id)} style={{ background: "none", border: "none", color: "#666", fontSize: "16px", cursor: "pointer", padding: "0 5px" }}>×</button>
                  </div>
              ))
            }
          </div>
      </div>
    </div>
  );
}