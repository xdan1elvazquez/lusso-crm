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

// Recibimos className para poder fijar la altura desde el padre
export default function ConsultationsPanel({ patientId, className = "" }) {
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
      (c.folio || "").toLowerCase().includes(s)
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
    <Card className={`border-t-4 border-t-blue-600 transition-all duration-300 flex flex-col ${className}`}>
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🩺 Exploración Médica ({allConsultations.length})
        </h2>
        <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "ghost" : "primary"} size="sm">
          {isCreating ? "Cancelar" : "+ Nueva"}
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={onSubmit} className="bg-background p-4 rounded-xl border border-border mb-4 animate-fadeIn space-y-3 shrink-0">
            <div className="grid grid-cols-2 gap-3">
                <Input label="Fecha" type="date" value={form.visitDate} onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))} />
                <Select label="Tipo" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                    <option value="OPHTHALMO">Oftalmología</option>
                    <option value="REFRACTIVE">Optometría</option>
                    <option value="GENERAL">General</option>
                </Select>
            </div>
            <Input label="Motivo" placeholder="Razón visita..." value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
            <Input label="Diagnóstico" placeholder="Opcional" value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} />
            <div className="text-right">
                <Button type="submit" variant="primary" size="sm">Guardar</Button>
            </div>
        </form>
      )}

      {loading ? <LoadingState /> : (
          <div className="flex-1 flex flex-col min-h-0">
            {allConsultations.length > 0 && (
                <Input 
                    placeholder="🔍 Buscar..." 
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="mb-3 bg-surface shrink-0"
                />
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {paginated.length === 0 ? (
                    <p className="text-textMuted text-sm italic text-center py-4">No hay registros.</p>
                ) : (
                    paginated.map((c) => (
                        <div key={c.id} className="border border-border rounded-xl p-3 bg-surface hover:border-primary/40 transition-colors">
                            <div className="flex justify-between mb-1">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white block text-sm">{new Date(c.visitDate || c.createdAt).toLocaleDateString()}</span>
                                        <span className="text-[10px] font-mono text-blue-300 bg-blue-900/30 px-1.5 rounded">
                                            {c.folio || c.id.slice(0,6)}
                                        </span>
                                    </div>
                                    <div className="mt-0.5">
                                        <Badge color={c.type==="OPHTHALMO"?"blue":"green"} className="text-[10px] py-0">{c.type === "OPHTHALMO" ? "Médica" : "Optometría"}</Badge>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-start">
                                    <Link to={`/patients/${patientId}/consultations/${c.id}`} className="text-[10px] bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-2 py-1 rounded transition-colors">Ver</Link>
                                    <button onClick={() => onDelete(c.id)} className="text-textMuted hover:text-red-400 px-1">×</button>
                                </div>
                            </div>
                            <div className="text-xs text-textMuted mt-2 pt-2 border-t border-border/50">
                                {c.diagnosis ? <strong className="text-white block truncate">{c.diagnosis}</strong> : <span className="opacity-70">Sin diagnóstico</span>}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-border shrink-0">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30 text-xs text-textMuted">◀ Anterior</button>
                    <span className="text-xs text-textMuted">{page} / {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30 text-xs text-textMuted">Siguiente ▶</button>
                </div>
            )}
          </div>
      )}
    </Card>
  );
}