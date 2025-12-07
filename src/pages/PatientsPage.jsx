import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePatients } from "@/hooks/usePatients"; 
import { validatePatient } from "@/utils/validators";
import { getReferralSources } from "@/services/settingsStorage"; 
import { handlePhoneInput } from "@/utils/inputHandlers";
import LoadingState from "@/components/LoadingState";

// UI Components Nuevos
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select"; // Usamos el Select del UI Kit

export default function PatientsPage() {
  // --- LÓGICA ORIGINAL INTACTA ---
  const { patients, create, remove, loading: loadingPatients, refresh } = usePatients();
  
  const [q, setQ] = useState("");
  const [sources, setSources] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const [form, setForm] = useState({ 
    firstName: "", lastName: "", phone: "", email: "", 
    dob: "", sex: "NO_ESPECIFICADO", occupation: "",
    referralSource: "", referredBy: "" 
  });
  
  const [referrerQuery, setReferrerQuery] = useState("");
  const [selectedReferrer, setSelectedReferrer] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function loadConfig() {
        try {
            const srcs = await getReferralSources();
            setSources(Array.isArray(srcs) ? srcs : []);
        } catch (e) {
            console.error(e);
            setSources([]);
        } finally {
            setLoadingConfig(false);
        }
    }
    loadConfig();
  }, []);

  const safePatients = Array.isArray(patients) ? patients : [];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return safePatients;
    return safePatients.filter((p) => {
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        const phone = p.phone || "";
        return fullName.includes(s) || phone.includes(s);
    });
  }, [safePatients, q]);

  const filteredReferrers = useMemo(() => {
    if (!referrerQuery) return [];
    const s = referrerQuery.toLowerCase();
    return safePatients.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(s)).slice(0, 5);
  }, [safePatients, referrerQuery]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const validation = validatePatient(form);
    if (!validation.isValid) { setErrors(validation.errors); return; }
    setErrors({});
    
    const success = await create({ 
        ...form, 
        referralSource: form.referralSource || "Pasaba por aquí", 
        referredBy: selectedReferrer?.id || null 
    });

    if (success) {
        setForm({ firstName: "", lastName: "", phone: "", email: "", dob: "", sex: "NO_ESPECIFICADO", occupation: "", referralSource: "", referredBy: "" });
        setReferrerQuery(""); 
        setSelectedReferrer(null);
        alert("Paciente registrado correctamente.");
    }
  };
  
  const handleDelete = async (id) => {
      await remove(id);
  };

  if (loadingPatients || loadingConfig) return <LoadingState />;

  // --- RENDERIZADO CON NUEVO DISEÑO (TAILWIND) ---
  return (
    <div className="page-container space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Pacientes</h1>
            <p className="text-textMuted text-sm">Directorio clínico ({safePatients.length} total)</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
             <Button variant="ghost" onClick={refresh} title="Recargar">🔄</Button>
             <div className="flex-1 md:w-80">
                <Input
                    placeholder="🔍 Buscar por nombre o teléfono..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="bg-surface"
                />
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 items-start">
          
          {/* LISTA DE PACIENTES (GRID CARDS) */}
          <div className="space-y-4">
            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-surface rounded-2xl border border-border text-textMuted">
                    <span className="text-4xl block mb-2">👥</span>
                    No se encontraron pacientes.
                </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filtered.map((p) => (
                      <Card key={p.id} noPadding className="group hover:border-primary/40 transition-all cursor-default relative">
                          <div className="p-4 flex justify-between items-start">
                              <div className="flex gap-4 overflow-hidden">
                                  <div className="w-12 h-12 rounded-full bg-surfaceHighlight flex items-center justify-center text-lg font-bold text-textMuted group-hover:text-white group-hover:bg-primary transition-colors flex-shrink-0">
                                      {p.firstName.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                      <Link to={`/patients/${p.id}`} className="font-bold text-lg text-white hover:text-primary transition-colors block leading-tight truncate">
                                          {p.firstName} {p.lastName}
                                      </Link>
                                      <div className="text-sm text-textMuted mt-1 flex items-center gap-2 font-mono">
                                          {p.phone || "Sin teléfono"}
                                      </div>
                                  </div>
                              </div>
                              <button 
                                onClick={() => handleDelete(p.id)} 
                                className="text-textMuted hover:text-red-400 p-2 -mr-2 -mt-2 opacity-50 hover:opacity-100 transition-opacity"
                                title="Eliminar"
                              >
                                  ✕
                              </button>
                          </div>
                      </Card>
                  ))}
              </div>
            )}
          </div>

          {/* FORMULARIO DE REGISTRO (Sidebar Derecho) */}
          <Card className="sticky top-6 border-l-4 border-l-primary shadow-glow">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>➕</span> Nuevo Paciente
            </h3>
            
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <Input label="Nombre(s)" value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} error={errors.firstName} />
                    <Input label="Apellidos" value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} error={errors.lastName} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Input 
                        label="Móvil (10 dígitos)"
                        type="tel"
                        maxLength={10}
                        value={form.phone} 
                        onChange={(e) => {
                            const clean = handlePhoneInput(e.target.value);
                            setForm(f => ({ ...f, phone: clean }));
                        }} 
                        error={errors.phone}
                    />
                    <Input label="Email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Opcional" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Input label="Fecha Nac." type="date" value={form.dob} onChange={(e) => setForm(f => ({ ...f, dob: e.target.value }))} />
                    <Select label="Sexo" value={form.sex} onChange={(e) => setForm(f => ({ ...f, sex: e.target.value }))}>
                        <option value="NO_ESPECIFICADO">Prefiero no decir</option>
                        <option value="MUJER">Mujer</option>
                        <option value="HOMBRE">Hombre</option>
                    </Select>
                </div>

                <Input label="Ocupación" placeholder="Ej. Estudiante" value={form.occupation} onChange={(e) => setForm(f => ({ ...f, occupation: e.target.value }))} />

                {/* SECCIÓN MARKETING */}
                <div className="p-3 bg-surfaceHighlight rounded-xl border border-border/50 space-y-3">
                    <Select label="¿Cómo se enteró?" value={form.referralSource} onChange={(e) => setForm(f => ({ ...f, referralSource: e.target.value }))}>
                        <option value="">-- Origen --</option>
                        {Array.isArray(sources) && sources.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>

                    {form.referralSource === "Recomendación" && (
                        <div className="relative">
                            {selectedReferrer ? (
                                <div className="flex justify-between items-center bg-blue-500/20 p-2 rounded-lg border border-blue-500/30">
                                    <span className="text-xs text-blue-200 truncate font-bold">Por: {selectedReferrer.firstName} {selectedReferrer.lastName}</span>
                                    <button type="button" onClick={() => setSelectedReferrer(null)} className="text-white hover:text-red-400 px-2">✕</button>
                                </div>
                            ) : (
                                <>
                                    <Input placeholder="Buscar quién recomendó..." value={referrerQuery} onChange={e => setReferrerQuery(e.target.value)} className="text-xs py-2 bg-background" />
                                    {referrerQuery && filteredReferrers.length > 0 && (
                                        <div className="absolute top-full w-full bg-surface border border-border z-10 rounded-lg mt-1 shadow-xl overflow-hidden">
                                            {filteredReferrers.map(p => (
                                                <div key={p.id} onClick={() => { setSelectedReferrer(p); setReferrerQuery(""); }} className="p-2 hover:bg-primary hover:text-white cursor-pointer text-xs border-b border-border last:border-0 truncate">
                                                    {p.firstName} {p.lastName}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <Button type="submit" variant="primary" className="w-full mt-2 py-3">
                    Guardar Paciente
                </Button>
            </form>
          </Card>
      </div>
    </div>
  );
}