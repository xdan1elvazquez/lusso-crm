import React from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export default function InterconsultationForm({ data, onChange }) {
    if (!data.required) {
        return (
            <button 
                type="button"
                onClick={() => onChange({ ...data, required: true, createdAt: new Date().toISOString() })} 
                className="w-full py-3 border border-dashed border-blue-500/40 text-blue-400 rounded-xl hover:bg-blue-500/10 transition-colors text-sm font-medium"
            >
                + Solicitar Interconsulta / Derivación
            </button>
        );
    }
    
    return (
        <div className="bg-blue-900/10 border border-blue-500/30 rounded-xl p-4 animate-fadeIn">
            <div className="flex justify-between items-center mb-4 border-b border-blue-500/20 pb-2">
                <h4 className="font-bold text-blue-300">Solicitud de Interconsulta</h4>
                <button 
                    onClick={() => onChange({ ...data, required: false })} 
                    className="text-xs text-red-400 hover:text-red-300 underline"
                >
                    Cancelar
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input 
                    label="Especialidad / Profesional Destino" 
                    value={data.to} 
                    onChange={e => onChange({ ...data, to: e.target.value })} 
                    placeholder="Ej. Retina, Medicina Interna..." 
                    className="bg-surface/50 border-blue-500/30 focus:border-blue-400"
                />
                <Select 
                    label="Urgencia" 
                    value={data.urgency} 
                    onChange={e => onChange({ ...data, urgency: e.target.value })}
                    className="bg-surface/50 border-blue-500/30 focus:border-blue-400"
                >
                    <option value="NORMAL">Normal / Ordinaria</option>
                    <option value="URGENTE">Urgente</option>
                </Select>
            </div>
            
            <label className="block mb-2">
                <span className="text-xs font-bold text-blue-300/80 uppercase mb-1 block">Motivo de Envío</span>
                <textarea 
                    rows={3} 
                    value={data.reason} 
                    onChange={e => onChange({ ...data, reason: e.target.value })} 
                    className="w-full bg-surface/50 border border-blue-500/30 rounded-xl p-3 text-textMain focus:border-blue-400 outline-none resize-none text-sm" 
                    placeholder="Describir hallazgo y motivo..." 
                />
            </label>
            
            <div className="text-right mt-2 text-xs text-blue-300/60">
                Estado: {data.status} · Solicitada: {new Date(data.createdAt).toLocaleDateString()}
            </div>
        </div>
    );
}