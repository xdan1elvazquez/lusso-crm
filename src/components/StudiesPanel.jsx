import React, { useState, useEffect } from "react";
import { createStudy, deleteStudy, getStudiesByPatient } from "@/services/studiesStorage";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

const FILE_TYPES = [
  { id: "IMAGE", label: "Imagen", icon: "🖼️" },
  { id: "PDF", label: "PDF", icon: "📄" },
  { id: "VIDEO", label: "Video", icon: "🎥" },
  { id: "AUDIO", label: "Audio", icon: "🎵" },
];

export default function StudiesPanel({ patientId, consultationId = null }) {
  const [loading, setLoading] = useState(true);
  const [studies, setStudies] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({ name: "", type: "IMAGE", url: "", notes: "" });

  const refreshData = async () => {
      setLoading(true);
      try {
          const data = await getStudiesByPatient(patientId);
          setStudies(consultationId ? data.filter(s => s.consultationId === consultationId) : data);
      } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { refreshData(); }, [patientId, consultationId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    await createStudy({ patientId, consultationId, ...form, url: "https://via.placeholder.com/150" });
    setForm({ name: "", type: "IMAGE", url: "", notes: "" });
    setIsUploading(false);
    refreshData();
  };

  const handleDelete = async (id) => { if(confirm("¿Eliminar?")) { await deleteStudy(id); refreshData(); } };

  return (
    <Card className="mt-8 border-t-4 border-t-purple-500">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">
            📁 {consultationId ? "Estudios de esta Consulta" : "Expediente de Estudios"}
        </h3>
        <Button onClick={() => setIsUploading(!isUploading)} variant={isUploading ? "ghost" : "primary"}>
            {isUploading ? "Cancelar" : "+ Adjuntar"}
        </Button>
      </div>

      {isUploading && (
          <form onSubmit={handleUpload} className="bg-surfaceHighlight/20 p-5 rounded-xl border border-dashed border-border mb-6 animate-fadeIn space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2"><Input label="Nombre del Estudio" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus /></div>
                  <Select label="Tipo" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                      {FILE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                  </Select>
              </div>
              <Input label="Notas" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              <div className="text-right">
                  <Button type="submit">Guardar Registro</Button>
              </div>
          </form>
      )}

      {loading ? <div className="text-center text-textMuted">Cargando...</div> : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {studies.length === 0 && <p className="col-span-full text-textMuted italic text-sm">No hay estudios adjuntos.</p>}
              
              {studies.map(study => {
                  const typeInfo = FILE_TYPES.find(t => t.id === study.type) || FILE_TYPES[0];
                  return (
                      <div key={study.id} className="bg-background border border-border rounded-xl p-4 relative group hover:border-purple-500/50 transition-colors flex flex-col items-center text-center">
                          <div className="text-4xl mb-3 grayscale group-hover:grayscale-0 transition-all">{typeInfo.icon}</div>
                          <div className="font-bold text-white text-sm truncate w-full">{study.name}</div>
                          <div className="text-xs text-textMuted mt-1">{new Date(study.createdAt).toLocaleDateString()}</div>
                          
                          <button 
                            onClick={() => handleDelete(study.id)} 
                            className="absolute top-2 right-2 text-textMuted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                              ✕
                          </button>
                      </div>
                  )
              })}
          </div>
      )}
    </Card>
  );
}