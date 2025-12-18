import React, { useState, useRef, useEffect } from "react";
import { useNotifications } from "@/context/NotificationsContext";
import { useNavigate } from "react-router-dom";
import { Bell, AlertTriangle, AlertCircle, Info, Check } from "lucide-react";

export default function NotificationBell() {
  const { unreadCount, alerts, refresh } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavigate = (route) => {
    setIsOpen(false);
    navigate(route);
  };

  const getIcon = (type) => {
    switch(type) {
        case "CRITICAL": return <AlertCircle size={18} className="text-red-500" />;
        case "URGENT": return <AlertTriangle size={18} className="text-amber-500" />;
        case "WARNING": return <AlertTriangle size={18} className="text-yellow-500" />;
        default: return <Info size={18} className="text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* ÍCONO DE CAMPANA */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* MENÚ DESPLEGABLE */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn origin-top-right">
          <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Centro de Alertas</span>
            <button onClick={refresh} className="text-[10px] text-blue-400 hover:text-blue-300">Actualizar</button>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {alerts.length === 0 ? (
                <div className="p-6 text-center text-slate-500 flex flex-col items-center gap-2">
                    <Check size={24} className="text-emerald-500/50" />
                    <p className="text-sm">Todo en orden.</p>
                </div>
            ) : (
                alerts.map((alert, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => handleNavigate(alert.route)}
                        className="p-4 hover:bg-white/5 cursor-pointer border-b border-slate-800/50 last:border-0 transition-colors group"
                    >
                        <div className="flex gap-3">
                            <div className="mt-0.5">{getIcon(alert.type)}</div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-200 group-hover:text-white">{alert.title}</h4>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{alert.message}</p>
                                <span className="text-[10px] text-slate-600 mt-2 block">
                                    {alert.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                    </div>
                ))
            )}
          </div>
          
          {alerts.length > 0 && (
            <div className="p-2 bg-slate-950 border-t border-slate-800 text-center">
                <span className="text-[10px] text-slate-500">Revisa los módulos correspondientes para resolver.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}