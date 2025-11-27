import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePatients } from "@/hooks/usePatients"; // Usando alias
import { validatePatient } from "@/utils/validators"; // 👈 Importamos al "Cadenero"

export default function PatientsPage() {
  const { patients, create, remove } = usePatients();
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  
  // 1. Estado para guardar los errores de validación
  const [errors, setErrors] = useState({});

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return patients;
    return patients.filter((p) =>
      `${p.firstName} ${p.lastName} ${p.phone} ${p.email}`.toLowerCase().includes(s)
    );
  }, [patients, q]);

  const onSubmit = (e) => {
    e.preventDefault();

    // 2. PASO DE SEGURIDAD: Validar antes de guardar
    const validation = validatePatient(form);
    
    if (!validation.isValid) {
      // Si el cadenero dice "No pasas", mostramos los errores y cancelamos
      setErrors(validation.errors);
      return; 
    }

    // 3. Si todo está bien, limpiamos errores y guardamos
    setErrors({});
    create(form);
    setForm({ firstName: "", lastName: "", phone: "", email: "" });
  };

  // Pequeño estilo para los mensajes de error
  const errorStyle = { color: "#ff4d4f", fontSize: "12px", marginTop: "4px" };

  return (
    <div>
      <h1>Pacientes</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0" }}>
        <input
          placeholder="Buscar (nombre, tel, email)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #444", background: "#222", color: "white" }}
        />
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 520, background: "#1a1a1a", padding: "20px", borderRadius: "10px" }}>
        <h3>Registrar Nuevo Paciente</h3>
        
        {/* Nombre */}
        <div>
          <input
            placeholder="Nombre*"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: errors.firstName ? "1px solid red" : "1px solid #444" }}
          />
          {errors.firstName && <div style={errorStyle}>{errors.firstName}</div>}
        </div>

        {/* Apellido */}
        <div>
          <input
            placeholder="Apellido*"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: errors.lastName ? "1px solid red" : "1px solid #444" }}
          />
          {errors.lastName && <div style={errorStyle}>{errors.lastName}</div>}
        </div>

        {/* Teléfono */}
        <div>
          <input
            placeholder="Teléfono (10 dígitos)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: errors.phone ? "1px solid red" : "1px solid #444" }}
          />
          {errors.phone && <div style={errorStyle}>{errors.phone}</div>}
        </div>

        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #444" }}
        />

        <button type="submit" style={{ marginTop: "10px" }}>Agregar paciente</button>
      </form>

      <div style={{ marginTop: 24 }}>
        {filtered.length === 0 ? (
          <p style={{ opacity: 0.6 }}>No se encontraron pacientes.</p>
        ) : (
          <ul style={{ display: "grid", gap: 10, padding: 0, listStyle: "none" }}>
            {filtered.map((p) => (
              <li key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#2a2a2a", padding: "10px 15px", borderRadius: "8px" }}>
                <div>
                  <Link to={`/patients/${p.id}`} style={{ fontWeight: "bold", fontSize: "1.1em" }}>
                    {p.firstName} {p.lastName}
                  </Link>
                  <div style={{ fontSize: "0.85em", opacity: 0.7, marginTop: "2px" }}>
                    {p.phone || "Sin teléfono"} • {p.email || "Sin email"}
                  </div>
                </div>
                <button onClick={() => remove(p.id)} style={{ background: "#4a1111", border: "1px solid #ff4d4f", fontSize: "0.8em" }}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}