import React, { useState, useEffect } from "react";
import { createStudy, deleteStudy, getStudiesByPatient } from "@/services/studiesStorage";

const FILE_TYPES = [
  { id: "IMAGE", label: "Imagen (JPG/PNG)", icon: "🖼️" },
  { id: "PDF", label: "Documento (PDF)", icon: "📄" },
  { id: "VIDEO", label: "Video (MP4)", icon: "🎥" },
  { id: "AUDIO", label: "Audio (MP3)", icon: "🎵" },
];

export default function StudiesPanel({ patientId, consultationId = null }) {
  const [loading, setLoading] = useState(true);
  const [studies, setStudies] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    type: "IMAGE",
    url: "", 
    notes: ""
  });

  const refreshData = async () => {
      setLoading(true);
      try {
          const data = await getStudiesByPatient(patientId);
          // Si estamos en una consulta específica, filtramos aquí
          if (consultationId) {
              setStudies(data.filter(s => s.consultationId === consultationId));
          } else {
              setStudies(data);
          }
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => { refreshData(); }, [patientId, consultationId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.name) return alert("Escribe un nombre para el estudio");

    await createStudy({
        patientId,
        consultationId,
        ...form,
        url: form.url || "https://via.placeholder.com/150" 
    });

    setForm({ name: "", type: "IMAGE", url: "", notes: "" });
    setIsUploading(false);
    refreshData();
  };

  const handleDelete = async (id) => {
      if(confirm("¿Eliminar estudio?")) {
          await deleteStudy(id);
          refreshData();
      }
  };

  return (
    <section style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
        <h3 style={{ margin: 0, color: "#e5e7eb", fontSize: "1.1em" }}>
            {consultationId ? "Estudios de esta Consulta" : "Expediente de Estudios y Gabinete"}
        </h3>
        <button 
            onClick={() => setIsUploading(!isUploading)}
            style={{ background: isUploading ? "#333" : "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: "0.9em" }}
        >
            {isUploading ? "Cancelar" : "+ Adjuntar Estudio"}
        </button>
      </div>

      {isUploading && (
          <form onSubmit={handleUpload} style={{ background: "#111", padding: 15, borderRadius: 8, border: "1px dashed #555", marginBottom: 20, display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                  <label style={{fontSize:12, color:"#aaa"}}>Nombre del Estudio
                     <input autoFocus value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej. OCT Macular OD" style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4, marginTop:4}} />
                  </label>
                  <label style={{fontSize:12, color:"#aaa"}}>Tipo
                     <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4, marginTop:4}}>
                        {FILE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                     </select>
                  </label>
              </div>
              <label style={{fontSize:12, color:"#aaa"}}>Notas / Descripción
                 <textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Hallazgos..." style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4, marginTop:4}} />
              </label>
              
              <div style={{fontSize:11, color:"#666", fontStyle:"italic"}}>* En esta demo, solo guardamos el registro. En producción aquí iría la subida real del archivo.</div>

              <button type="submit" style={{ background: "#4ade80", color: "black", border: "none", padding: "8px", borderRadius: 4, fontWeight: "bold", cursor: "pointer", marginTop:5 }}>
                  Guardar Registro
              </button>
          </form>
      )}

      {loading ? <div style={{padding:20, color:"#666"}}>Cargando estudios...</div> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 15 }}>
              {studies.length === 0 && <p style={{ opacity: 0.5, fontSize: 13 }}>No hay estudios adjuntos.</p>}
              
              {studies.map(study => {
                  const typeInfo = FILE_TYPES.find(t => t.id === study.type) || FILE_TYPES[0];
                  return (
                      <div key={study.id} style={{ background: "#111", border: "1px solid #333", borderRadius: 8, padding: 12, position: "relative" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                              <span style={{ fontSize: "2em" }}>{typeInfo.icon}</span>
                              <button onClick={() => handleDelete(study.id)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer" }}>✕</button>
                          </div>
                          <div style={{ fontWeight: "bold", fontSize: "0.95em", color: "#ddd" }}>{study.name}</div>
                          <div style={{ fontSize: "0.8em", color: "#888", marginTop: 4 }}>{new Date(study.createdAt).toLocaleDateString()}</div>
                          {study.notes && <div style={{ fontSize: "0.8em", color: "#aaa", marginTop: 6, fontStyle: "italic", background:"#222", padding:4, borderRadius:4 }}>"{study.notes}"</div>}
                          
                          {study.consultationId && !consultationId && (
                              <div style={{ position: "absolute", top: 10, right: 30, fontSize: "0.7em", background: "#1e3a8a", color: "#bfdbfe", padding: "2px 6px", borderRadius: 4 }}>
                                  En Consulta
                              </div>
                          )}
                      </div>
                  )
              })}
          </div>
      )}
    </section>
  );
}