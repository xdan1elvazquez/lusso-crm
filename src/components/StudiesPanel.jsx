import React, { useState, useEffect } from "react";
import { createStudy, deleteStudy, getStudiesByPatient } from "@/services/studiesStorage";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ModalWrapper from "@/components/ui/ModalWrapper"; // 👈 Usamos el Modal
import LoadingState from "@/components/LoadingState";
import { FileText, Image, Video, Music, Trash2, Eye } from "lucide-react"; // Iconos opcionales para mejor look

const FILE_TYPES = [
  { id: "IMAGE", label: "Imagen", icon: "🖼️" },
  { id: "PDF", label: "PDF", icon: "📄" },
  { id: "VIDEO", label: "Video", icon: "🎥" },
  { id: "AUDIO", label: "Audio", icon: "🎵" },
];

export default function StudiesPanel({ patientId, consultationId = null, className = "" }) {
  const [loading, setLoading] = useState(true);
  const [studies, setStudies] = useState([]);
  
  // Modal State
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
    // Aquí iría tu lógica real de subida a Firebase Storage si la tuvieras
    await createStudy({ patientId, consultationId, ...form, url: "https://via.placeholder.com/150" });
    setForm({ name: "", type: "IMAGE", url: "", notes: "" });
    setIsUploading(false); // Cierra modal
    refreshData();
  };

  const handleDelete = async (id) => { if(confirm("¿Eliminar archivo?")) { await deleteStudy(id); refreshData(); } };

  return (
    <Card className={`border-t-4 border-t-purple-500 flex flex-col ${className}`}>
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4 p-4 border-b border-border bg-surfaceHighlight/5 shrink-0">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
            📁 {consultationId ? "Estudios Consulta" : "Expediente Digital"}
        </h3>
        <Button onClick={() => setIsUploading(true)} variant="primary" size="sm">
            + Adjuntar
        </Button>
      </div>

      {/* LISTA DE ARCHIVOS */}
      {loading ? <LoadingState /> : (
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {studies.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-textMuted opacity-50">
                      <p className="text-sm">Sin documentos adjuntos.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {studies.map(study => {
                          const typeInfo = FILE_TYPES.find(t => t.id === study.type) || FILE_TYPES[0];
                          return (
                              <div key={study.id} className="bg-surface border border-border rounded-xl p-4 relative group hover:border-purple-500/50 transition-colors flex flex-col items-center text-center">
                                  <div className="text-3xl mb-3 grayscale group-hover:grayscale-0 transition-all">{typeInfo.icon}</div>
                                  <div className="font-bold text-white text-xs truncate w-full" title={study.name}>{study.name}</div>
                                  <div className="text-[10px] text-textMuted mt-1">{new Date(study.createdAt).toLocaleDateString()}</div>
                                  
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded p-1">
                                      <button className="text-blue-300 hover:text-white"><Eye size={14}/></button>
                                      <button onClick={() => handleDelete(study.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              )}
          </div>
      )}

      {/* 🟢 MODAL DE SUBIDA */}
      {isUploading && (
          <ModalWrapper title="Adjuntar Nuevo Estudio" onClose={() => setIsUploading(false)} width="500px">
              <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                      <Input label="Nombre del Archivo / Estudio" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus placeholder="Ej. OCT Macular, Receta externa..." />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <Select label="Tipo de Archivo" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                          {FILE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                      </Select>
                      {/* Simulación de input file */}
                      <div className="flex flex-col justify-end">
                          <label className="block text-xs font-bold text-textMuted uppercase mb-1">Archivo</label>
                          <div className="border border-dashed border-border rounded-lg h-10 flex items-center justify-center text-xs text-textMuted cursor-pointer hover:bg-white/5">
                              Seleccionar...
                          </div>
                      </div>
                  </div>

                  <Input label="Notas Adicionales" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Descripción breve..." />
                  
                  <div className="pt-4 border-t border-border flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => setIsUploading(false)} type="button">Cancelar</Button>
                      <Button type="submit" variant="primary">Guardar Registro</Button>
                  </div>
              </form>
          </ModalWrapper>
      )}
    </Card>
  );
}