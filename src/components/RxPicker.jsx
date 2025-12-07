import React from "react";
import { SPH_VALUES, CYL_VALUES, ADD_VALUES, AXIS_VALUES, PD_VALUES, normalizeRxValue } from "../utils/rxOptions";
// Solo cambiamos los estilos nativos por componentes o clases
import Select from "@/components/ui/Select"; 

export default function RxPicker({ value, onChange }) {
  const rx = normalizeRxValue(value);

  // --- LÓGICA ORIGINAL INTACTA ---
  const handleEye = (eye) => (field) => (e) => {
    const raw = e.target.value;
    const num = raw === "" ? null : Number(raw);
    const nextEye = { ...rx[eye], [field]: Number.isNaN(num) ? null : num };
    
    // Regla de negocio: Si cil es 0, eje es null
    const next = {
      ...rx,
      [eye]: field === "cyl" && num === 0 ? { ...nextEye, axis: null } : nextEye,
    };
    onChange(next);
  };

  const handlePd = (field) => (e) => {
    const raw = e.target.value;
    const num = raw === "" ? null : Number(raw);
    onChange({
      ...rx,
      pd: { ...rx.pd, [field]: Number.isNaN(num) ? null : num },
    });
  };

  const handleNotes = (e) => {
    onChange({ ...rx, notes: e.target.value });
  };
  // ------------------------------

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <EyeRow label="OD" eye={rx.od} onChange={handleEye("od")} color="text-blue-400" />
        <EyeRow label="OS" eye={rx.os} onChange={handleEye("os")} color="text-green-400" />
      </div>

      <div className="grid grid-cols-2 gap-4 bg-surfaceHighlight/20 p-3 rounded-lg border border-border">
        <SelectField label="DP Distancia" options={PD_VALUES} value={rx.pd.distance} onChange={handlePd("distance")} />
        <SelectField label="DP Cercana" options={PD_VALUES} value={rx.pd.near} onChange={handlePd("near")} />
      </div>

      <div>
        <span className="text-xs font-bold text-textMuted uppercase mb-1 block">Notas Rx</span>
        <textarea 
            rows={2} 
            value={rx.notes} 
            onChange={handleNotes} 
            className="w-full bg-background border border-border rounded-lg p-2 text-sm text-white outline-none focus:border-primary resize-none"
        />
      </div>
    </div>
  );
}

function EyeRow({ label, eye, onChange, color }) {
  // Nota: Eliminamos la línea que ocultaba el Axis visualmente, 
  // pero la lógica de datos se mantiene en handleEye.
  return (
    <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr] gap-2 items-end">
      <strong className={`self-center text-sm font-bold ${color}`}>{label}</strong>
      
      <SelectField label="SPH" options={SPH_VALUES} value={eye.sph} onChange={onChange("sph")} />
      <SelectField label="CYL" options={CYL_VALUES} value={eye.cyl} onChange={onChange("cyl")} />
      <SelectField label="AXIS" options={AXIS_VALUES} value={eye.axis} onChange={onChange("axis")} />
      <SelectField label="ADD" options={ADD_VALUES} value={eye.add} onChange={onChange("add")} allowEmpty />
    </div>
  );
}

function SelectField({ label, options, value, onChange, allowEmpty = true }) {
  return (
    <label className="block">
      <span className="block text-[10px] text-textMuted text-center mb-0.5">{label}</span>
      <select 
        value={value ?? ""} 
        onChange={onChange} 
        className="w-full bg-surface border border-border rounded px-1 py-1.5 text-xs text-white outline-none focus:border-primary text-center appearance-none cursor-pointer"
      >
        <option value="">{allowEmpty ? "-" : "0.00"}</option>
        {options.map((v) => (
          <option key={v} value={v}>
            {typeof v === "number" ? v.toFixed(2) : v}
          </option>
        ))}
      </select>
    </label>
  );
}