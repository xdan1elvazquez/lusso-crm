import React, { useState, useEffect } from "react";
import { getLoyaltySettings, updateLoyaltySettings } from "@/services/settingsStorage";
import ModalWrapper from "@/components/ui/ModalWrapper";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoyaltyManager({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({ 
      enabled: true, 
      pointsName: "Puntos",
      conversionRate: 1.0,
      earningRates: { GLOBAL: 5, EFECTIVO: 5, TARJETA: 2, TRANSFERENCIA: 5 }, 
      referralBonusPercent: 2 
  });

  useEffect(() => {
      getLoyaltySettings().then((data) => {
          // Aseguramos que existan los campos para evitar errores
          setConfig({
              ...data,
              earningRates: { 
                  GLOBAL: 5, EFECTIVO: 5, TARJETA: 2, TRANSFERENCIA: 5, 
                  ...(data.earningRates || {}) 
              }
          });
          setLoading(false);
      });
  }, []);

  const handleRateChange = (method, val) => {
      setConfig(prev => ({
          ...prev,
          earningRates: { ...prev.earningRates, [method]: parseFloat(val) || 0 }
      }));
  };

  const handleSave = async () => {
      await updateLoyaltySettings(config);
      alert("✅ Reglas de lealtad actualizadas correctamente.");
      onClose();
  };

  return (
    <ModalWrapper title="💎 Configuración de Puntos y Lealtad" onClose={onClose} width="600px">
        <div className="space-y-6">
            
            {/* ACTIVAR / DESACTIVAR */}
            <div className="p-4 bg-surfaceHighlight/30 rounded-xl border border-border flex justify-between items-center">
                <div>
                    <h4 className="text-white font-bold">Sistema de Puntos</h4>
                    <p className="text-xs text-textMuted">Si desactivas, no se darán puntos en nuevas ventas.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={config.enabled} onChange={e => setConfig({...config, enabled: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {/* SECCIÓN 1: RECOMPENSA AL COMPRADOR (Por método de pago) */}
            <div className="bg-surface border border-border rounded-xl p-4">
                <h4 className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2">
                    🛒 Recompensa por Compra Propia (% Cashback en Puntos)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-textMuted uppercase mb-1">Efectivo</label>
                        <div className="relative">
                            <input type="number" value={config.earningRates.EFECTIVO} onChange={e => handleRateChange("EFECTIVO", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white font-bold focus:border-emerald-500 outline-none" />
                            <span className="absolute right-3 top-2 text-textMuted">%</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-textMuted uppercase mb-1">Transferencia</label>
                        <div className="relative">
                            <input type="number" value={config.earningRates.TRANSFERENCIA} onChange={e => handleRateChange("TRANSFERENCIA", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white font-bold focus:border-emerald-500 outline-none" />
                            <span className="absolute right-3 top-2 text-textMuted">%</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-textMuted uppercase mb-1">Tarjeta (Comisión)</label>
                        <div className="relative">
                            <input type="number" value={config.earningRates.TARJETA} onChange={e => handleRateChange("TARJETA", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white font-bold focus:border-emerald-500 outline-none" />
                            <span className="absolute right-3 top-2 text-textMuted">%</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-textMuted uppercase mb-1">Global / Otro</label>
                        <div className="relative">
                            <input type="number" value={config.earningRates.GLOBAL} onChange={e => handleRateChange("GLOBAL", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white font-bold focus:border-emerald-500 outline-none" />
                            <span className="absolute right-3 top-2 text-textMuted">%</span>
                        </div>
                    </div>
                </div>
                <p className="text-[10px] text-textMuted mt-2 italic">* Define qué porcentaje del total de la venta se le regresa al paciente en puntos según cómo pague.</p>
            </div>

            {/* SECCIÓN 2: RECOMPENSA POR REFERIDOS */}
            <div className="bg-surface border border-border rounded-xl p-4">
                <h4 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2">
                    🤝 Recompensa al Padrino / Referente
                </h4>
                <div className="flex items-center gap-4">
                    <div className="w-32">
                        <label className="block text-xs text-textMuted uppercase mb-1">Porcentaje</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={config.referralBonusPercent} 
                                onChange={e => setConfig({...config, referralBonusPercent: parseFloat(e.target.value) || 0})} 
                                className="w-full bg-background border border-amber-500/50 rounded-lg px-3 py-2 text-amber-400 font-bold focus:border-amber-400 outline-none text-lg" 
                            />
                            <span className="absolute right-3 top-3 text-amber-400/50">%</span>
                        </div>
                    </div>
                    <div className="flex-1 text-xs text-textMuted">
                        <p>
                            Cuando <strong>Sabina</strong> compre $4,000, su padrino <strong>Cristian</strong> recibirá el <span className="text-amber-400 font-bold">{config.referralBonusPercent}%</span> de esa compra.
                        </p>
                        <p className="mt-1 opacity-70">
                            (Ejemplo: $4,000 x {config.referralBonusPercent}% = {4000 * (config.referralBonusPercent/100)} puntos para Cristian).
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end pt-2 border-t border-border">
                <Button onClick={handleSave} className="px-8 shadow-lg shadow-blue-500/20">Guardar Configuración</Button>
            </div>
        </div>
    </ModalWrapper>
  );
}