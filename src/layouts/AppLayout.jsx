import React, { useState, useEffect, useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/utils/rbacConfig"; // 👈 IMPORTAR

// --- CONFIGURACIÓN MAESTRA DE NAVEGACIÓN ---
// Agregamos la propiedad 'permission' a cada item
const ALL_APPS = [
  // Clínica
  { id: "dashboard", to: "dashboard", label: "Dashboard", icon: "📊", category: "Clínica", permission: PERMISSIONS.VIEW_DASHBOARD },
  { id: "patients", to: "patients", label: "Pacientes", icon: "👥", category: "Clínica", permission: PERMISSIONS.VIEW_PATIENTS },
  { id: "statistics", to: "statistics", label: "Estadísticas", icon: "📈", category: "Clínica", permission: PERMISSIONS.VIEW_STATISTICS },
  
  // Ventas
  { id: "sales", to: "sales", label: "Punto de Venta", icon: "🛒", category: "Ventas", permission: PERMISSIONS.VIEW_SALES },
  { id: "work-orders", to: "work-orders", label: "Trabajos", icon: "👓", category: "Ventas", permission: PERMISSIONS.VIEW_WORK_ORDERS },
  { id: "sales-history", to: "sales-history", label: "Historial", icon: "📑", category: "Ventas", permission: PERMISSIONS.VIEW_SALES_HISTORY },

  // Logística
  { id: "inventory", to: "inventory", label: "Inventario", icon: "📦", category: "Logística", permission: PERMISSIONS.VIEW_INVENTORY },
  { id: "labs", to: "labs", label: "Laboratorios", icon: "🧪", category: "Logística", permission: PERMISSIONS.VIEW_LABS },
  { id: "suppliers", to: "suppliers", label: "Proveedores", icon: "🏭", category: "Logística", permission: PERMISSIONS.VIEW_SUPPLIERS },

  // Finanzas
  { id: "finance", to: "finance", label: "Finanzas", icon: "💰", category: "Finanzas", permission: PERMISSIONS.VIEW_FINANCE },
  { id: "receivables", to: "receivables", label: "Por Cobrar", icon: "💳", category: "Finanzas", permission: PERMISSIONS.VIEW_RECEIVABLES },
  { id: "payables", to: "payables", label: "Por Pagar", icon: "📉", category: "Finanzas", permission: PERMISSIONS.VIEW_PAYABLES },
  { id: "expenses", to: "expenses", label: "Gastos", icon: "💸", category: "Finanzas", permission: PERMISSIONS.VIEW_EXPENSES },
  { id: "payroll", to: "payroll", label: "Nómina", icon: "👥", category: "Finanzas", permission: PERMISSIONS.VIEW_PAYROLL },

  // Admin
  { id: "shifts", to: "shifts", label: "Cortes Caja", icon: "🔐", category: "Admin", permission: PERMISSIONS.VIEW_SHIFTS },
  { id: "team", to: "team", label: "Equipo", icon: "🧷", category: "Admin", permission: PERMISSIONS.VIEW_ADMIN_TEAM },
];

const DEFAULT_PINS = ["dashboard", "patients", "sales", "work-orders"];

export default function AppLayout() {
  const navigate = useNavigate();
  const { logout, user, userData, currentBranch, can } = useAuth(); // 👈 Traemos 'can'

  const [pinnedIds, setPinnedIds] = useState(() => {
      const saved = localStorage.getItem("lusso_pinned_apps");
      return saved ? JSON.parse(saved) : DEFAULT_PINS;
  });

  const [isAppsMenuOpen, setIsAppsMenuOpen] = useState(false);

  useEffect(() => {
      localStorage.setItem("lusso_pinned_apps", JSON.stringify(pinnedIds));
  }, [pinnedIds]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) { console.error(error); }
  };

  const togglePin = (appId) => {
      setPinnedIds(prev => {
          if (prev.includes(appId)) return prev.filter(id => id !== appId);
          if (prev.length >= 7) { alert("Máximo 7 favoritos en la barra."); return prev; }
          return [...prev, appId];
      });
  };

  // --- FILTRO DE SEGURIDAD ---
  // Solo mostramos las apps para las que el usuario tiene permiso (can(app.permission))
  // OJO: Si app.permission es undefined, asumimos que es público o no restringido (opcional, aquí asumo todo restringido)
  const authorizedApps = useMemo(() => {
      return ALL_APPS.filter(app => can(app.permission));
  }, [can]); // Se recalcula si cambian permisos

  const pinnedApps = useMemo(() => {
      // Solo mostrar pins si además están autorizados
      return authorizedApps.filter(app => pinnedIds.includes(app.id));
  }, [pinnedIds, authorizedApps]);

  const appsByCategory = useMemo(() => {
      const groups = {};
      authorizedApps.forEach(app => { // Usamos authorizedApps
          if (!groups[app.category]) groups[app.category] = [];
          groups[app.category].push(app);
      });
      return groups;
  }, [authorizedApps]);

  const navLinkClass = ({ isActive }) => `
    flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium whitespace-nowrap
    ${isActive 
      ? `${currentBranch.colors.button} text-white shadow-glow` 
      : "text-slate-400 hover:bg-white/10 hover:text-white"
    }
  `;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 text-slate-100 overflow-hidden">
      <header className={`h-16 ${currentBranch.colors.primary} border-b border-white/10 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-50 relative transition-colors duration-300`}>
        <div className="flex items-center gap-6 overflow-hidden">
            <div className="flex items-center gap-2 select-none flex-shrink-0">
               {currentBranch.logo ? (
                 <img src={currentBranch.logo} alt="Logo" className="h-8 w-auto object-contain" />
               ) : (
                 <span className="text-xl font-bold tracking-tight text-white">{currentBranch.name}</span>
               )}
            </div>
            <div className="h-6 w-px bg-white/20 hidden md:block"></div>
            <nav className="hidden md:flex items-center gap-1 overflow-hidden">
                {pinnedApps.map(app => (
                    <NavLink key={app.id} to={app.to} className={navLinkClass}>
                        <span className="text-lg">{app.icon}</span>
                        <span>{app.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
        <div className="flex items-center gap-3">
            <div className="relative">
                <button onClick={() => setIsAppsMenuOpen(!isAppsMenuOpen)} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isAppsMenuOpen ? "bg-white/20 text-white" : "hover:bg-white/10 text-slate-400 hover:text-white"}`}>
                    <span className="text-xl grid place-items-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z"/></svg>
                    </span>
                    <span className="text-sm font-bold hidden sm:inline">Apps</span>
                </button>
                {isAppsMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsAppsMenuOpen(false)}></div>
                        <div className="absolute top-full right-0 mt-3 w-[320px] sm:w-[400px] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 p-4 animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[80vh] overflow-hidden">
                            <div className="flex justify-between items-center mb-4 px-2 border-b border-slate-800 pb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Menú de Aplicaciones</span>
                                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded">📌 Fija tus apps favoritas</span>
                            </div>
                            <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-6">
                                {Object.entries(appsByCategory).map(([category, apps]) => (
                                    <div key={category}>
                                        <h4 className={`text-xs font-bold ${currentBranch.colors.accent} mb-2 px-2`}>{category}</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {apps.map(app => {
                                                const isPinned = pinnedIds.includes(app.id);
                                                return (
                                                    <div key={app.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-default">
                                                        <NavLink to={app.to} onClick={() => setIsAppsMenuOpen(false)} className="flex items-center gap-3 flex-1 min-w-0">
                                                            <span className="text-xl">{app.icon}</span>
                                                            <span className="text-sm text-slate-200 font-medium truncate group-hover:text-white transition-colors">{app.label}</span>
                                                        </NavLink>
                                                        <button onClick={(e) => { e.stopPropagation(); togglePin(app.id); }} className={`p-1.5 rounded-md transition-all ${isPinned ? "text-white bg-white/20 opacity-100" : "text-slate-600 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10"}`} title={isPinned ? "Quitar de barra" : "Fijar en barra"}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M16 3l-4 4-2.5-2.5L8 6l2.5 2.5L5 14l-2 5 5-2 5.5-5.5L16 14l1.5-1.5-2.5-2.5L19 6l-3-3z"/></svg>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
            <div className="flex flex-col items-end leading-tight mr-2 hidden sm:block">
                <span className="text-xs font-bold text-white">{userData?.name}</span>
                <span className="text-[10px] text-slate-400">{currentBranch.name}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold text-white shadow-lg cursor-pointer border border-white/20" title={user?.email}>
                {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors p-2" title="Salir">🚪</button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto bg-slate-900 p-6 custom-scrollbar relative">
        <div className="max-w-7xl mx-auto"><Outlet /></div>
      </main>
    </div>
  );
}