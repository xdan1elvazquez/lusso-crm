import React from "react";
import {
  SPH_VALUES,
  CYL_VALUES,
  ADD_VALUES,
  AXIS_VALUES,
  PD_VALUES,
  normalizeRxValue,
} from "../utils/rxOptions";

export default function RxPicker({ value, onChange }) {
  const rx = normalizeRxValue(value);

  const handleEye = (eye) => (field) => (e) => {
    const raw = e.target.value;
    const num = raw === "" ? null : Number(raw);
    const nextEye = { ...rx[eye], [field]: Number.isNaN(num) ? null : num };
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

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <EyeRow label="OD" eye={rx.od} onChange={handleEye("od")} />
        <EyeRow label="OS" eye={rx.os} onChange={handleEye("os")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>PD Distancia</span>
          <select value={rx.pd.distance ?? ""} onChange={handlePd("distance")}>
            <option value="">(sin valor)</option>
            {PD_VALUES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>PD Cercana</span>
          <select value={rx.pd.near ?? ""} onChange={handlePd("near")}>
            <option value="">(sin valor)</option>
            {PD_VALUES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label style={{ display: "grid", gap: 4 }}>
        <span>Notas Rx</span>
        <textarea rows={2} value={rx.notes} onChange={handleNotes} />
      </label>
    </div>
  );
}

function EyeRow({ label, eye, onChange }) {
  // ELIMINAMOS ESTA LÍNEA QUE LO OCULTABA:
  // const showAxis = (eye?.cyl ?? null) !== null && Number(eye.cyl) !== 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "70px repeat(auto-fit, minmax(120px, 1fr))", gap: 8, alignItems: "end" }}>
      <strong style={{ alignSelf: "center" }}>{label}</strong>
      
      <SelectField label="SPH" options={SPH_VALUES} value={eye.sph} onChange={onChange("sph")} />
      
      <SelectField label="CYL" options={CYL_VALUES} value={eye.cyl} onChange={onChange("cyl")} />
      
      {/* AHORA SIEMPRE SE MUESTRA */}
      <SelectField label="AXIS" options={AXIS_VALUES} value={eye.axis} onChange={onChange("axis")} />
      
      <SelectField label="ADD" options={ADD_VALUES} value={eye.add} onChange={onChange("add")} allowEmpty />
    </div>
  );
}

function SelectField({ label, options, value, onChange, allowEmpty = true }) {
  return (
    <label style={{ display: "grid", gap: 2 }}>
      <span style={{ fontSize: 12, opacity: 0.8 }}>{label}</span>
      <select value={value ?? ""} onChange={onChange}>
        <option value="">{allowEmpty ? "(sin valor)" : "0.00"}</option>
        {options.map((v) => (
          <option key={v} value={v}>
            {typeof v === "number" ? v.toFixed(2) : v}
          </option>
        ))}
      </select>
    </label>
  );
}
