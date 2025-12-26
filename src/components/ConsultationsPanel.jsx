import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  createConsultation,
  deleteConsultation,
  getConsultationsByPatient,
} from "@/services/consultationsStorage";
import LoadingState from "@/components/LoadingState";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";

const ITEMS_PER_PAGE = 5;

export default function ConsultationsPanel({ patientId }) {
  const [loading, setLoading] = useState(true);
  const [allConsultations, setAllConsultations] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    type: "OPHTHALMO",
    reason: "",
    diagnosis: "",
    notes: "",
    visitDate: today,
  });

  const refreshData = async () => {
      setLoading(true);
      try {
          const data = await getConsultationsByPatient(patientId);
          setAllConsultations(data);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => { refreshData(); }, [patientId]);

  const filtered = useMemo(() => {
    if (!search) return allConsultations;
    const s = search.toLowerCase();
    return allConsultations.filter(c => 
      (c.diagnosis || "").toLowerCase().includes(s) ||
      (c.reason || "").toLowerCase().includes(s) ||
      (c.notes || "").toLowerCase().includes(s) ||
      (c.folio || "").toLowerCase().includes(s) // 🟢 Búsqueda por Folio
    );
  }, [allConsultations, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const onSubmit = async (e) => {
    e.preventDefault();
    await createConsultation({ patientId, ...form });
    setForm({ type: "OPHTHALMO", reason: "", diagnosis: "", notes: "", visitDate: today });
    setIsCreating(false); 
    setPage(1);
    refreshData();
  };

  const onDelete = async (id) => {
    if(confirm("¿Borrar consulta?")) {
        await deleteConsultation(id);
        refreshData();
    }
  };

  return (
    <Card className="border-t-4 border-t-blue-600 transition-all duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🩺 Exploración Médica ({allConsultations.length})
        </h2>
        <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "ghost" : "primary"}>
          {isCreating ? "Cancelar" : "+ Nueva Consulta"}
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={onSubmit} className="bg-background p-6 rounded-xl border border-border mb-6 animate-fadeIn space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Input label="Fecha" type="date" value={form.visitDate} onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))} />
                <Select label="Tipo" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                    <option value="OPHTHALMO">Oftalmología</option>
                    <option value="REFRACTIVE">Optometría</option>
                    <option value="GENERAL">General</option>
                </Select>
            </div>
            <Input label="Motivo de Consulta" placeholder="Razón de la visita" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
            <Input label="Diagnóstico Inicial" placeholder="Opcional" value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} />
            <div className="text-right">
                <Button type="submit" variant="primary">Guardar Registro</Button>
            </div>
        </form>
      )}

      {loading ? <LoadingState /> : (
          <>
            {allConsultations.length > 0 && (
                <Input 
                    placeholder="🔍 Buscar por folio, diagnóstico..." 
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="mb-4 bg-surface"
                />
            )}

            <div className="space-y-3">
                {paginated.length === 0 ? (
                    <p className="text-textMuted text-sm italic">No hay registros que coincidan.</p>
                ) : (
                    paginated.map((c) => (
                        <div key={c.id} className="border border-border rounded-xl p-4 bg-surface hover:border-primary/40 transition-colors">
                            <div className="flex justify-between mb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white block">{new Date(c.visitDate || c.createdAt).toLocaleDateString()}</span>
                                        {/* 🟢 AQUÍ MOSTRAMOS EL FOLIO EXP-XXX */}
                                        <span className="text-xs font-mono text-blue-300 bg-blue-900/30 px-1.5 rounded">
                                            {c.folio || c.id.slice(0,6)}
                                        </span>
                                    </div>
                                    <div className="mt-1">
                                        <Badge color={c.type==="OPHTHALMO"?"blue":"green"}>{c.type === "OPHTHALMO" ? "Médica" : "Optometría"}</Badge>
                                    </div>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <Link to={`/patients/${patientId}/consultations/${c.id}`} className="text-xs text-blue-400 hover:text-blue-300 font-medium">Ver Detalles ↗</Link>
                                    <button onClick={() => onDelete(c.id)} className="text-textMuted hover:text-red-400 text-lg leading-none">×</button>
                                </div>
                            </div>
                            <div className="text-sm text-textMuted">
                                {c.diagnosis ? <strong className="text-white block">{c.diagnosis}</strong> : <span className="opacity-70">Sin diagnóstico</span>}
                                {c.reason && <div className="mt-1 opacity-80">{c.reason}</div>}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded bg-surface border border-border disabled:opacity-50 text-textMuted hover:text-white">◀</button>
                    <span className="text-sm self-center text-textMuted">Pág {page} de {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded bg-surface border border-border disabled:opacity-50 text-textMuted hover:text-white">▶</button>
                </div>
            )}
          </>
      )}
    </Card>
  );
}