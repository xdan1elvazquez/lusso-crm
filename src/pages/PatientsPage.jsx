import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePatients } from "../hooks/usePatients";

export default function PatientsPage() {
  const { patients, create, remove } = usePatients();
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return patients;
    return patients.filter((p) =>
      `${p.firstName} ${p.lastName} ${p.phone} ${p.email}`.toLowerCase().includes(s)
    );
  }, [patients, q]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    const p = create(form);
    setForm({ firstName: "", lastName: "", phone: "", email: "" });
    // opcional: navegar al detalle
    // navigate(`/patients/${p.id}`);
  };

  return (
    <div>
      <h1>Patients</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0" }}>
        <input
          placeholder="Buscar (nombre, tel, email)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <input
          placeholder="Nombre*"
          value={form.firstName}
          onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
        />
        <input
          placeholder="Apellido*"
          value={form.lastName}
          onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
        />
        <input
          placeholder="Teléfono"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <button type="submit">Agregar paciente</button>
      </form>

      <div style={{ marginTop: 18 }}>
        {filtered.length === 0 ? (
          <p>No hay pacientes.</p>
        ) : (
          <ul style={{ display: "grid", gap: 8, padding: 0, listStyle: "none" }}>
            {filtered.map((p) => (
              <li key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <Link to={`/patients/${p.id}`}>
                  {p.firstName} {p.lastName}
                </Link>
                <button onClick={() => remove(p.id)}>Eliminar</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
