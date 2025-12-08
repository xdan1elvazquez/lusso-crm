import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClientOrders } from "@/services/clientService";
import { getPatientById } from "@/services/patientsStorage"; 
import Card from "@/components/ui/Card";
import LoadingState from "@/components/LoadingState";
import Badge from "@/components/ui/Badge"; 

// Mapeo Amigable
const STATUS_CONFIG = {
  "ON_HOLD": { label: "Validando Orden", step: 1, color: "bg-slate-600" },
  "TO_PREPARE": { label: "En Preparación", step: 2, color: "bg-amber-500" },
  "SENT_TO_LAB": { label: "En Elaboración (Laboratorio)", step: 3, color: "bg-blue-500" },
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
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem("lusso_client_session");
    if (!session) { navigate("/portal/login"); return; }
    const sessionData = JSON.parse(session);
    
    async function fetchData() {
        try {
            const [freshPatient, freshOrders] = await Promise.all([
                getPatientById(sessionData.id),
                getClientOrders(sessionData.id)
            ]);
            
            if (freshPatient) setPatient(freshPatient);
            else setPatient(sessionData); 

            setOrders(freshOrders);
        } catch (error) {
            console.error("Error cargando datos del cliente:", error);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
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
    <div className="space-y-6 animate-fadeIn pb-10">
      
      {/* HEADER + PUNTOS (NUEVO DISEÑO CON QR) */}
      <div className="flex flex-col gap-5 border-b border-white/10 pb-6">
          <div className="flex justify-between items-start">
              <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">Hola, {patient?.firstName}</h2>
                  <p className="text-slate-400 text-sm">Bienvenido a tu espacio Lusso</p>
              </div>
              <button onClick={handleLogout} className="text-xs text-red-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-red-500/50">
                  Cerrar Sesión
              </button>
          </div>

          {/* 💎 TARJETA DE PUNTOS + QR TOGGLE */}
          <div className="bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-500/30 p-5 rounded-2xl shadow-glow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              
              <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-2xl border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                              💎
                          </div>
                          <div>
                              <div className="text-xs text-blue-200 font-bold uppercase tracking-widest mb-0.5">Tus Puntos</div>
                              <div className="text-3xl font-bold text-white text-shadow-sm">
                                  {patient?.points?.toLocaleString() || 0}
                              </div>
                              {/* 👇 LEYENDA AGREGADA */}
                              <div className="text-[10px] text-blue-200/60 mt-1 max-w-[200px] leading-tight">
                                 1 Punto = $1 peso. Válido solo en productos y servicios. No canjeable por efectivo.
                              </div>
                          </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <Badge color="blue" className="border-blue-500/40">Miembro Lusso</Badge>
                      </div>
                  </div>

                  <button 
                    onClick={() => setShowQR(!showQR)}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 flex items-center justify-center gap-2 text-sm text-blue-200 transition-colors"
                  >
                      <span>{showQR ? "Ocultar Tarjeta Digital" : "Mostrar Tarjeta Digital / QR"}</span>
                      <span className="text-lg">📱</span>
                  </button>
                  
                  {showQR && (
                      <div className="mt-4 p-4 bg-white rounded-xl flex flex-col items-center animate-fadeIn text-center">
                          <div className="text-black font-bold text-lg mb-1">Lusso Visual</div>
                          <div className="text-gray-500 text-xs uppercase tracking-widest mb-3">{patient?.firstName} {patient?.lastName}</div>
                          
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${patient?.id}`} 
                            alt="Tu Código QR" 
                            className="w-32 h-32 mb-2"
                          />
                          
                          <div className="text-[10px] text-gray-400 font-mono mt-1">{patient?.id}</div>
                          <p className="text-xs text-gray-500 mt-2 max-w-[200px]">
                              Muestra este código en mostrador para acumular o canjear puntos.
                          </p>
                      </div>
                  )}
              </div>
          </div>
      </div>

      <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          📦 Mis Pedidos
      </h3>

      {orders.length === 0 ? (
          <div className="text-center py-12 opacity-50 bg-slate-900/50 rounded-2xl border border-white/5">
              <div className="text-5xl mb-4">👓</div>
              <p>No tienes pedidos activos.</p>
          </div>
      ) : (
          orders.map(order => {
              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG["ON_HOLD"];
              const progress = Math.min((status.step / 5) * 100, 100);
              
              const frames = order.saleDetails?.items.filter(i => i.kind === "FRAMES") || [];
              const lenses = order.saleDetails?.items.filter(i => i.kind === "LENSES") || [];
              const hasDetails = frames.length > 0 || lenses.length > 0;

              return (
                  <Card key={order.id} className="relative overflow-hidden bg-slate-900 border-slate-800 shadow-xl" noPadding>
                      
                      <div className="p-6 pb-2">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-bold text-white uppercase tracking-wider">{status.label}</span>
                              <span className="text-xs text-slate-400 font-mono">{progress}%</span>
                          </div>
                          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
                              <div 
                                className={`h-full ${status.color} transition-all duration-1000 ease-out animate-progress-stripes relative`} 
                                style={{ width: `${progress}%` }}
                              >
                                  <div className="absolute inset-0 bg-white/20"></div>
                              </div>
                          </div>
                      </div>

                      <div className="p-6 pt-4 space-y-6">
                          
                          {frames.map((frame, idx) => (
                              <div key={`frame-${idx}`} className="flex justify-between items-start">
                                  <div>
                                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Armazón</div>
                                      <div className="text-white text-lg font-medium leading-tight">{frame.description}</div>
                                  </div>
                                  <div className="text-emerald-400 font-bold">${frame.price.toLocaleString()}</div>
                              </div>
                          ))}

                          {lenses.map((lens, idx) => (
                              <div key={`lens-${idx}`} className="border-t border-white/5 pt-4">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Micas / Lentes</div>
                                          <div className="text-white text-base">
                                              {lens.specs?.design || "Monofocal"} {lens.specs?.material} {lens.specs?.treatment}
                                          </div>
                                      </div>
                                      <div className="text-emerald-400 font-bold">${lens.price.toLocaleString()}</div>
                                  </div>
                                  
                                  <div className="mt-3">
                                      <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Tu Graduación</div>
                                      {renderRx(lens.rx || order.rxNotes)} 
                                  </div>
                              </div>
                          ))}

                          {!hasDetails && (
                              <div className="text-center text-slate-500 text-sm py-4 italic">
                                  Detalles no disponibles. <br/>Ref: {order.type}
                              </div>
                          )}

                      </div>

                      {/* FOOTER - AHORA MUESTRA CAJA */}
                      <div className="bg-slate-950/50 p-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-500">
                          <span className="font-bold text-slate-400">
                              {order.saleDetails?.boxNumber ? `Caja #${order.saleDetails.boxNumber}` : `Orden #${order.id.slice(0,6).toUpperCase()}`}
                          </span>
                          <span>Fecha: {new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                  </Card>
              );
          })
      )}
    </div>
  );
}