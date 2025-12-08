import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClientOrders } from "@/services/clientService";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/LoadingState";

// Mapeo Amigable
const STATUS_CONFIG = {
  "ON_HOLD": { label: "Validando Orden", step: 1, color: "bg-slate-600" },
  "TO_PREPARE": { label: "En Preparación", step: 2, color: "bg-amber-500" },
  "SENT_TO_LAB": { label: "En Elaboración (Laboratorio)", step: 3, color: "bg-blue-500" }, // Texto cambiado
  "QUALITY_CHECK": { label: "Control de Calidad", step: 4, color: "bg-purple-500" },
  "READY": { label: "Listo para Entrega", step: 5, color: "bg-emerald-500" },
  "DELIVERED": { label: "Entregado", step: 6, color: "bg-slate-700" },
  "CANCELLED": { label: "Cancelado", step: 0, color: "bg-red-500" }
};

export default function ClientTrackerPage() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = sessionStorage.getItem("lusso_client_session");
    if (!session) { navigate("/portal/login"); return; }
    const pData = JSON.parse(session);
    setPatient(pData);

    getClientOrders(pData.id)
        .then(setOrders)
        .catch(console.error)
        .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
      sessionStorage.removeItem("lusso_client_session");
      navigate("/portal/login");
  };

  const renderRx = (rx) => {
      if (!rx || (!rx.od && !rx.os)) return null;
      return (
          <div className="mt-3 bg-white/5 rounded-lg p-3 text-xs font-mono border border-white/10">
              <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                  <span className="font-bold text-blue-300">OD (Derecho)</span>
                  <span>{rx.od?.sph} / {rx.od?.cyl} x {rx.od?.axis}° {rx.od?.add ? `Add ${rx.od.add}` : ''}</span>
              </div>
              <div className="flex justify-between">
                  <span className="font-bold text-green-300">OI (Izquierdo)</span>
                  <span>{rx.os?.sph} / {rx.os?.cyl} x {rx.os?.axis}° {rx.os?.add ? `Add ${rx.os.add}` : ''}</span>
              </div>
          </div>
      );
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <div className="flex justify-between items-end border-b border-white/10 pb-4">
          <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Hola, {patient?.firstName}</h2>
              <p className="text-slate-400 text-sm">Estado de tus pedidos</p>
          </div>
          <button onClick={handleLogout} className="text-xs text-red-400 hover:text-white transition-colors">Cerrar Sesión</button>
      </div>

      {orders.length === 0 ? (
          <div className="text-center py-12 opacity-50">
              <div className="text-5xl mb-4">👓</div>
              <p>No tienes pedidos activos.</p>
          </div>
      ) : (
          orders.map(order => {
              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG["ON_HOLD"];
              const progress = Math.min((status.step / 5) * 100, 100);
              
              // Buscamos los items relevantes en la venta relacionada
              const frames = order.saleDetails?.items.filter(i => i.kind === "FRAMES") || [];
              const lenses = order.saleDetails?.items.filter(i => i.kind === "LENSES") || [];
              
              // Si no hay detalle de venta (orden manual), usamos fallbacks
              const hasDetails = frames.length > 0 || lenses.length > 0;

              return (
                  <Card key={order.id} className="relative overflow-hidden bg-slate-900 border-slate-800 shadow-2xl" noPadding>
                      
                      {/* BARRA DE ESTADO ANIMADA */}
                      <div className="p-6 pb-2">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-bold text-white uppercase tracking-wider">{status.label}</span>
                              <span className="text-xs text-slate-400 font-mono">{progress}%</span>
                          </div>
                          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden relative">
                              <div 
                                className={`h-full ${status.color} transition-all duration-1000 ease-out animate-progress-stripes relative`} 
                                style={{ width: `${progress}%` }}
                              >
                                  <div className="absolute inset-0 bg-white/20"></div>
                              </div>
                          </div>
                      </div>

                      <div className="p-6 pt-4 space-y-6">
                          
                          {/* SECCIÓN ARMAZÓN */}
                          {frames.map((frame, idx) => (
                              <div key={`frame-${idx}`} className="flex justify-between items-start">
                                  <div>
                                      <div className="text-xs text-slate-500 uppercase font-bold mb-1">Armazón</div>
                                      <div className="text-white text-lg font-medium leading-tight">{frame.description}</div>
                                  </div>
                                  <div className="text-emerald-400 font-bold">${frame.price.toLocaleString()}</div>
                              </div>
                          ))}

                          {/* SECCIÓN MICAS + GRADUACIÓN */}
                          {lenses.map((lens, idx) => (
                              <div key={`lens-${idx}`} className="border-t border-white/5 pt-4">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <div className="text-xs text-slate-500 uppercase font-bold mb-1">Micas / Lentes</div>
                                          <div className="text-white text-base">
                                              {/* Construimos descripción amigable */}
                                              {lens.specs?.design || "Monofocal"} {lens.specs?.material} {lens.specs?.treatment}
                                          </div>
                                      </div>
                                      <div className="text-emerald-400 font-bold">${lens.price.toLocaleString()}</div>
                                  </div>
                                  
                                  {/* Graduación del Cliente */}
                                  <div className="mt-3">
                                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Tu Graduación</div>
                                      {renderRx(lens.rx || order.rxNotes)} 
                                  </div>
                              </div>
                          ))}

                          {/* FALLBACK SI NO HAY DETALLES (Orden Legacy) */}
                          {!hasDetails && (
                              <div className="text-center text-slate-500 text-sm py-4 italic">
                                  Detalles del producto no disponibles para esta orden.
                                  <br/>Ref: {order.type}
                              </div>
                          )}

                      </div>

                      {/* FOOTER FECHA */}
                      <div className="bg-slate-950/50 p-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-500">
                          <span>Orden #{order.id.slice(0,6).toUpperCase()}</span>
                          <span>Fecha: {new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                  </Card>
              );
          })
      )}
    </div>
  );
}