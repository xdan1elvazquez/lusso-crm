// src/components/consultation/ODOSEditor.jsx
import React from "react";

const textareaStyle = { width: "100%", padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, resize: "vertical" };

const EyeColumn = ({ eyeLabel, value, onChange, onChipClick, onFileClick, options }) => (
    <div style={{flex:1}}>
        <div style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
            <div style={{fontWeight:"bold", color: eyeLabel==="OD"?"#60a5fa":"#4ade80"}}>{eyeLabel}</div>
            <button type="button" onClick={onFileClick} style={{fontSize:16, cursor:"pointer", background:"none", border:"none"}} title="Adjuntar Foto/PDF">📎</button>
        </div>
        <textarea rows={2} value={value} onChange={e => onChange(e.target.value)} style={textareaStyle} placeholder={`Detalles ${eyeLabel}...`} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>{options && options.map(opt => (<button key={opt} type="button" onClick={() => onChipClick(opt)} style={{fontSize:"0.75em", padding:"2px 8px", background:"#333", border:"1px solid #444", color:"#ccc", borderRadius:10, cursor:"pointer"}}>+ {opt}</button>))}</div>
    </div>
);

export default function ODOSEditor({ title, dataOD, dataOS, options, onUpdate, onAddFile }) {
    const appendText = (eye, text) => { const current = eye === 'od' ? dataOD : dataOS; onUpdate(eye, current ? `${current}, ${text}` : text); };
    const handleFile = (eye) => { const fakeUrl = prompt("Simulación: Ingresa nombre del archivo o URL:", "foto.jpg"); if(fakeUrl) onAddFile(eye, fakeUrl); };
    return (
        <div style={{ background: "#222", padding: 12, borderRadius: 8, border: "1px solid #333" }}>
            <div style={{fontSize:14, fontWeight:"bold", color:"#ddd", marginBottom:10}}>{title}</div>
            <div style={{display:"flex", gap:15}}>
                <EyeColumn eyeLabel="OD" value={dataOD} onChange={v => onUpdate('od', v)} onChipClick={t => appendText('od', t)} onFileClick={() => handleFile('od')} options={options} />
                <EyeColumn eyeLabel="OS" value={dataOS} onChange={v => onUpdate('os', v)} onChipClick={t => appendText('os', t)} onFileClick={() => handleFile('os')} options={options} />
            </div>
        </div>
    );
}