import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function AttachmentsPanel({ attachments = [], onUpdate }) {
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", type: "IMAGE" });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.name) return alert("Nombre requerido");
    
    const newFile = {
      id: crypto.randomUUID(),
      name: form.name,
      url: form.url || "https://via.placeholder.com/150",
      type: form.type,
      createdAt: new Date().toISOString(),
      size: "Simulado" 
    };

    onUpdate([...attachments, newFile]);
    setForm({ name: "", url: "", type: "IMAGE" });
    setIsUploading(false);
  };

  const handleRemove = (id) => {
    if (confirm("¿Eliminar adjunto?")) {
      onUpdate(attachments.filter(a => a.id !== id));
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, name: file.name, url: URL.createObjectURL(file), type: file.type.includes("image") ? "IMAGE" : "DOC" });
    }
  };

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">📎 Adjuntos (OCT, Campos, Fotos)</h3>
        <Button onClick={() => setIsUploading(!isUploading)} variant={isUploading ? "ghost" : "primary"}>
            {isUploading ? "Cancelar" : "+ Adjuntar"}
        </Button>
      </div>

      {isUploading && (
        <div className="bg-surfaceHighlight/10 p-4 rounded-xl border border-dashed border-border mb-4 animate-fadeIn">
          <div className="grid gap-4">
            <input type="file" onChange={handleFileSelect} className="text-sm text-textMuted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primaryHover" />
            <Input placeholder="Nombre (ej. OCT OD)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <div className="text-xs text-textMuted">* En esta demo, se usa una URL local temporal.</div>
            <div className="text-right">
                <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">Guardar</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {attachments.length === 0 && <p className="text-textMuted italic text-sm col-span-full text-center py-4">Sin adjuntos.</p>}
        
        {attachments.map(file => (
          <div key={file.id} className="bg-surface border border-border rounded-xl p-3 flex items-center gap-3 relative group hover:border-primary/50 transition-colors">
            <div className="w-10 h-10 rounded bg-black/40 flex items-center justify-center overflow-hidden flex-shrink-0">
               {file.type === "IMAGE" ? <img src={file.url} className="w-full h-full object-cover" alt="preview" /> : <span className="text-xl">📄</span>}
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm truncate" title={file.name}>{file.name}</div>
                <div className="text-[10px] text-textMuted">{new Date(file.createdAt).toLocaleDateString()}</div>
            </div>
            <div className="flex gap-2">
                <a href={file.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-white text-xs">Ver</a>
                <button onClick={() => handleRemove(file.id)} className="text-textMuted hover:text-red-400 text-xs">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}