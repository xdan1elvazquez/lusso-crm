import React, { useState, useEffect } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

export default function WorkOrderEditForm({ wo, labs, employees, onSave, onCancel }) {
  const [form, setForm] = useState({
      courier: "", receivedBy: "", jobMadeBy: "", talladoBy: "", baseCost: 0, labCost: 0
  });

  const getPrice = (labId, type) => {
      if (!labId || labId === "INTERNAL") return 0;
      const lab = labs.find(l => l.id === labId || l.name === labId);
      const svc = lab?.services?.find(s => s.type === type);
      return svc ? Number(svc.price) : 0;
  };

  useEffect(() => {
      const currentTotal = Number(wo.labCost) || 0;
      const bisel = getPrice(wo.jobMadeBy, "BISEL");
      const tallado = getPrice(wo.talladoBy, "TALLADO");
      setForm({
          courier: wo.courier || "",
          receivedBy: wo.receivedBy || "",
          jobMadeBy: wo.jobMadeBy || "",
          talladoBy: wo.talladoBy || "",
          baseCost: Math.max(0, currentTotal - bisel - tallado),
          labCost: currentTotal
      });
  }, [wo]);

  const handleChange = (field, val) => {
      setForm(prev => {
          const next = { ...prev, [field]: val };
          if (["baseCost", "jobMadeBy", "talladoBy"].includes(field)) {
              const b = Number(next.baseCost) || 0;
              const bi = getPrice(next.jobMadeBy, "BISEL");
              const ta = getPrice(next.talladoBy, "TALLADO");
              next.labCost = b + bi + ta;
          }
          return next;
      });
  };

  const handleSubmit = () => {
      const resolveName = (id) => labs.find(l => l.id === id)?.name || (id === "INTERNAL" ? "Taller Interno" : id);
      const mainLabId = (form.talladoBy && form.talladoBy !== "INTERNAL") ? form.talladoBy : 
                        (form.jobMadeBy && form.jobMadeBy !== "INTERNAL") ? form.jobMadeBy : "";
      
      onSave({
          ...form,
          jobMadeBy: resolveName(form.jobMadeBy),
          talladoBy: resolveName(form.talladoBy),
          labId: mainLabId,
          labName: resolveName(mainLabId) || "Taller Interno"
      });
  };

  return (
    <div className="bg-surfaceHighlight/20 p-4 rounded-xl border border-border mt-3 animate-fadeIn">
        <h4 className="font-bold text-blue-400 mb-4 text-sm">Editar Detalles de Trabajo</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
            <Input label="Mensajería" value={form.courier} onChange={e=>handleChange("courier",e.target.value)} />
            <Select label="Recibe" value={form.receivedBy} onChange={e=>handleChange("receivedBy",e.target.value)}>
                <option value="">--</option>
                {employees.map(e=><option key={e.id} value={e.name}>{e.name}</option>)}
            </Select>
            
            <Select label="Servicio Bisel" value={form.jobMadeBy} onChange={e=>handleChange("jobMadeBy",e.target.value)}>
                <option value="">--</option>
                <option value="INTERNAL">Interno ($0)</option>
                {labs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
            
            <Select label="Servicio Tallado" value={form.talladoBy} onChange={e=>handleChange("talladoBy",e.target.value)}>
                <option value="">--</option>
                <option value="INTERNAL">Interno ($0)</option>
                {labs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
        </div>
        
        <div className="flex justify-between items-end border-t border-border pt-4">
            <div className="w-32">
                <Input label="Costo Material Base" type="number" value={form.baseCost} onChange={e=>handleChange("baseCost",e.target.value)} />
            </div>
            <div className="text-right mb-2">
                <div className="text-xs text-textMuted uppercase font-bold">Costo Total</div>
                <div className="text-xl font-bold text-red-400">${form.labCost}</div>
            </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
            <Button variant="primary" onClick={handleSubmit}>Guardar Cambios</Button>
        </div>
    </div>
  );
}