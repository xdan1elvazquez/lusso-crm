// src/components/consultation/AttachmentsPanel.jsx
import React, { useState } from "react";

const styles = {
  container: { marginTop: 20, background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  list: { display: "grid", gap: 10 },
  item: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111", padding: "10px", borderRadius: 6, border: "1px solid #333" },
  preview: { width: 40, height: 40, objectFit: "cover", borderRadius: 4, marginRight: 10, background: "#333" },
  fileInfo: { flex: 1 },
  actions: { display: "flex", gap: 10 }
};

export default function AttachmentsPanel({ attachments = [], onUpdate }) {
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", type: "IMAGE" });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.name) return alert("Nombre requerido");
    
    // Simulación de archivo
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
      // Aquí iría la lógica de subida a Firebase Storage
      setForm({ ...form, name: file.name, url: URL.createObjectURL(file), type: file.type.includes("image") ? "IMAGE" : "DOC" });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={{ margin: 0, color: "#e5e7eb", fontSize: "1.1em" }}>📎 Adjuntos (OCT, Campos, Fotos)</h3>
        <button onClick={() => setIsUploading(!isUploading)} style={{ background: "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>+ Adjuntar</button>
      </div>

      {isUploading && (
        <div style={{ background: "#111", padding: 15, borderRadius: 8, marginBottom: 15, border: "1px dashed #555" }}>
          <div style={{ display: "grid", gap: 10 }}>
            <input type="file" onChange={handleFileSelect} style={{ color: "white" }} />
            <input placeholder="Nombre (ej. OCT OD)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
            <div style={{fontSize:11, color:"#666"}}>* En esta demo, se usa una URL local temporal.</div>
            <button onClick={handleAdd} style={{ background: "#064e3b", color: "#4ade80", border: "1px solid #4ade80", padding: "8px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>Guardar</button>
          </div>
        </div>
      )}

      <div style={styles.list}>
        {attachments.length === 0 && <p style={{ color: "#666", fontStyle: "italic", fontSize: "0.9em" }}>Sin adjuntos.</p>}
        {attachments.map(file => (
          <div key={file.id} style={styles.item}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {file.type === "IMAGE" ? <img src={file.url} style={styles.preview} alt="preview" /> : <div style={{...styles.preview, display:"flex", alignItems:"center", justifyContent:"center"}}>📄</div>}
              <div style={styles.fileInfo}>
                <div style={{ fontWeight: "bold", color: "#ddd", fontSize: "0.9em" }}>{file.name}</div>
                <div style={{ fontSize: "0.8em", color: "#888" }}>{new Date(file.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div style={styles.actions}>
              <a href={file.url} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", fontSize: "0.9em", textDecoration: "none" }}>Ver</a>
              <button onClick={() => handleRemove(file.id)} style={{ color: "#f87171", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}