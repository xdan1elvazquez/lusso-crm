import React, { useState, useEffect, useMemo } from "react";
import { getPatients } from "@/services/patientsStorage";
import { sendToN8n, WEBHOOK_EVENTS } from "@/services/webhookService";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function GrowthPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [activeTab, setActiveTab] = useState("birthdays"); // birthdays | recall | referrals
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getPatients();
    setPatients(data);
    setLoading(false);
  };

  // 🎂 LÓGICA CUMPLEAÑOS (Mes Actual)
  const birthdayList = useMemo(() => {
    const currentMonth = new Date().getMonth(); // 0-11
    return patients.filter(p => {
        if (!p.dob) return false;
        const dobMonth = new Date(p.dob).getMonth(); // Asume formato YYYY-MM-DD
        return dobMonth === currentMonth;
    });
  }, [patients]);

  // 🔄 LÓGICA RECALL (Les toca examen este mes)
  const recallList = useMemo(() => {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7); // "2023-10"
    
    return patients.filter(p => {
        if (!p.nextRecallDate) return false;
        // Comparamos si la fecha de recall cae en este mes
        return p.nextRecallDate.startsWith(currentMonth);
    });
  }, [patients]);

  // 🚀 ENVÍO A N8N
  const handleSendCampaign = async (list, type) => {
    if (!confirm(`¿Enviar mensaje a ${list.length} pacientes?`)) return;
    setProcessing(true);

    // Enviamos uno por uno o en lote según prefieras. 
    // Aquí mandamos el lote completo para que n8n lo itere (más eficiente).
    const endpoint = type === 'birthday' ? WEBHOOK_EVENTS.BIRTHDAY : WEBHOOK_EVENTS.RECALL;
    
    const payload = {
        count: list.length,
        patients: list.map(p => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            phone: p.phone,
            email: p.email,
            referralCode: p.referralCode // Para que lo compartan
        }))
    };

    const success = await sendToN8n(endpoint, payload);
    
    if (success) alert("🚀 Campaña enviada a n8n correctamente.");
    else alert("⚠️ Hubo un error de conexión con n8n.");
    
    setProcessing(false);
  };

  if (loading) return <div className="p-8 text-white">Cargando inteligencia...</div>;

  return (
    <div className="h-full flex flex-col space-y-6">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-white">🚀 Growth Center</h1>
            <p className="text-slate-400">Automatización de Retención y Lealtad</p>
        </div>
      </header>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex gap-4 border-b border-slate-700">
          <button onClick={() => setActiveTab("birthdays")} className={`pb-3 px-4 font-medium transition-colors ${activeTab === "birthdays" ? "text-primary border-b-2 border-primary" : "text-slate-400"}`}>
              🎂 Cumpleañeros ({birthdayList.length})
          </button>
          <button onClick={() => setActiveTab("recall")} className={`pb-3 px-4 font-medium transition-colors ${activeTab === "recall" ? "text-amber-400 border-b-2 border-amber-400" : "text-slate-400"}`}>
              🔄 Recall Examen ({recallList.length})
          </button>
      </div>

      <div className="flex-1 overflow-hidden">
          
          {/* VISTA CUMPLEAÑOS */}
          {activeTab === "birthdays" && (
              <Card className="h-full flex flex-col bg-slate-800 border-slate-700">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                      <div>
                          <h3 className="text-white font-bold">Festejados del Mes</h3>
                          <p className="text-xs text-slate-400">Pacientes que cumplen años en el mes actual.</p>
                      </div>
                      <Button 
                        disabled={birthdayList.length === 0 || processing}
                        onClick={() => handleSendCampaign(birthdayList, 'birthday')}
                        className="bg-pink-600 hover:bg-pink-500"
                      >
                          🎁 Enviar Felicitación ({birthdayList.length})
                      </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                      {birthdayList.length === 0 ? (
                          <p className="text-center text-slate-500 mt-10">No hay cumpleañeros este mes.</p>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {birthdayList.map(p => (
                                  <div key={p.id} className="p-3 bg-slate-700/50 rounded-lg flex justify-between items-center">
                                      <div>
                                          <div className="font-bold text-white">{p.firstName} {p.lastName}</div>
                                          <div className="text-xs text-pink-300">🎂 {p.dob}</div>
                                      </div>
                                      <Badge>{p.phone || "Sin Cel"}</Badge>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </Card>
          )}

          {/* VISTA RECALL */}
          {activeTab === "recall" && (
              <Card className="h-full flex flex-col bg-slate-800 border-slate-700">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                      <div>
                          <h3 className="text-white font-bold">Recordatorio Anual</h3>
                          <p className="text-xs text-slate-400">Pacientes que compraron hace 1 año.</p>
                      </div>
                      <Button 
                        disabled={recallList.length === 0 || processing}
                        onClick={() => handleSendCampaign(recallList, 'recall')}
                        className="bg-amber-600 hover:bg-amber-500"
                      >
                          📢 Enviar Recordatorio ({recallList.length})
                      </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                       {/* NOTA PARA EL USUARIO */}
                       {patients.some(p => !p.nextRecallDate) && (
                           <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg text-xs text-blue-200">
                               ℹ️ <strong>Tip:</strong> El sistema calculará la fecha de "Recall" automáticamente en las próximas ventas.
                               Para pacientes antiguos, se irá llenando conforme vuelvan a comprar.
                           </div>
                       )}

                      {recallList.length === 0 ? (
                          <p className="text-center text-slate-500 mt-10">No hay pacientes agendados para recall este mes.</p>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {recallList.map(p => (
                                  <div key={p.id} className="p-3 bg-slate-700/50 rounded-lg flex justify-between items-center">
                                      <div>
                                          <div className="font-bold text-white">{p.firstName} {p.lastName}</div>
                                          <div className="text-xs text-amber-300">📅 Toca: {p.nextRecallDate?.slice(0,10)}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-[10px] text-slate-400">Última Compra</div>
                                        <div className="text-xs text-white">{p.lastSaleDate?.slice(0,10) || "?"}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </Card>
          )}

      </div>
    </div>
  );
}