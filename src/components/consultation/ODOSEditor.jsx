import React from "react";

const EyeColumn = ({ eyeLabel, value, onChange, onChipClick, onFileClick, options }) => (
    <div className="flex-1 bg-surface border border-border rounded-xl p-3">
        <div className="flex justify-between items-center mb-2">
            <div className={`font-bold text-sm ${eyeLabel==="OD" ? "text-blue-400" : "text-green-400"}`}>
                {eyeLabel === "OD" ? "Ojo Derecho (OD)" : "Ojo Izquierdo (OI)"}
            </div>
            <button 
                type="button" 
                onClick={onFileClick} 
                className="text-textMuted hover:text-white p-1 rounded hover:bg-white/10" 
                title="Adjuntar Foto/PDF"
            >
                📎
            </button>
        </div>
        
        <textarea 
            rows={2} 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            className="w-full bg-background border border-border rounded-lg p-2 text-sm text-white focus:border-primary outline-none resize-y"
            placeholder={`Detalles ${eyeLabel}...`} 
        />
        
        {options && (
            <div className="flex flex-wrap gap-2 mt-2">
                {options.map(opt => (
                    <button 
                        key={opt} 
                        type="button" 
                        onClick={() => onChipClick(opt)} 
                        className="text-[10px] px-2 py-1 bg-surfaceHighlight border border-border rounded text-textMuted hover:text-white hover:border-primary transition-colors"
                    >
                        + {opt}
                    </button>
                ))}
            </div>
        )}
    </div>
);

export default function ODOSEditor({ title, dataOD, dataOS, options, onUpdate, onAddFile }) {
    const appendText = (eye, text) => { 
        const current = eye === 'od' ? dataOD : dataOS; 
        onUpdate(eye, current ? `${current}, ${text}` : text); 
    };
    
    const handleFile = (eye) => { 
        const fakeUrl = prompt("Simulación: Ingresa nombre del archivo o URL:", "foto.jpg"); 
        if(fakeUrl) onAddFile(eye, fakeUrl); 
    };

    return (
        <div className="mb-4">
            {title && <div className="text-xs font-bold text-textMuted uppercase mb-2 ml-1">{title}</div>}
            <div className="flex flex-col md:flex-row gap-4">
                <EyeColumn 
                    eyeLabel="OD" 
                    value={dataOD} 
                    onChange={v => onUpdate('od', v)} 
                    onChipClick={t => appendText('od', t)} 
                    onFileClick={() => handleFile('od')} 
                    options={options} 
                />
                <EyeColumn 
                    eyeLabel="OS" 
                    value={dataOS} 
                    onChange={v => onUpdate('os', v)} 
                    onChipClick={t => appendText('os', t)} 
                    onFileClick={() => handleFile('os')} 
                    options={options} 
                />
            </div>
        </div>
    );
}