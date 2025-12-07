import React, { useState, useEffect, useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// --- CONFIGURACIÓN MAESTRA DE NAVEGACIÓN ---
// Aquí definimos todas las rutas posibles del sistema
const ALL_APPS = [
  // Clínica
  { id: "dashboard", to: "dashboard", label: "Dashboard", icon: "📊", category: "Clínica" },
  { id: "patients", to: "patients", label: "Pacientes", icon: "👥", category: "Clínica" },
  { id: "statistics", to: "statistics", label: "Estadísticas", icon: "📈", category: "Clínica" },
  
  // Ventas
  { id: "sales", to: "sales", label: "Punto de Venta", icon: "🛒", category: "Ventas" },
  { id: "work-orders", to: "work-orders", label: "Trabajos", icon: "👓", category: "Ventas" },
  { id: "sales-history", to: "sales-history", label: "Historial", icon: "📑", category: "Ventas" },

  // Logística
  { id: "inventory", to: "inventory", label: "Inventario", icon: "📦", category: "Logística" },
  { id: "labs", to: "labs", label: "Laboratorios", icon: "🧪", category: "Logística" },
  { id: "suppliers", to: "suppliers", label: "Proveedores", icon: "🏭", category: "Logística" },

  // Finanzas
  { id: "finance", to: "finance", label: "Finanzas", icon: "💰", category: "Finanzas" },
  { id: "receivables", to: "receivables", label: "Por Cobrar", icon: "💳", category: "Finanzas" },
  { id: "payables", to: "payables", label: "Por Pagar", icon: "📉", category: "Finanzas" },
  { id: "expenses", to: "expenses", label: "Gastos", icon: "💸", category: "Finanzas" },
  { id: "payroll", to: "payroll", label: "Nómina", icon: "👥", category: "Finanzas" },

  // Admin
  { id: "shifts", to: "shifts", label: "Cortes Caja", icon: "🔐", category: "Admin" },
  { id: "team", to: "team", label: "Equipo", icon: "🧷", category: "Admin" },
];

// Favoritos por defecto (si es la primera vez que entras)
const DEFAULT_PINS = ["dashboard", "patients", "sales", "work-orders"];

export default function AppLayout() {
  const navigate = useNavigate();
  const { logout, user, userData } = useAuth(); // 👈 Agregado userData

  // Estado de Favoritos (Persistente en LocalStorage)
  const [pinnedIds, setPinnedIds] = useState(() => {
      const saved = localStorage.getItem("lusso_pinned_apps");
      return saved ? JSON.parse(saved) : DEFAULT_PINS;
  });

  const [isAppsMenuOpen, setIsAppsMenuOpen] = useState(false);

  // Guardar favoritos cuando cambien
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
          if (prev.includes(appId)) return prev.filter(id => id !== appId); // Des-fijar
          if (prev.length >= 7) { alert("Máximo 7 favoritos en la barra."); return prev; } // Límite visual
          return [...prev, appId]; // Fijar
      });
  };

  // Separar Apps en "Fijadas" y "Categorizadas para el menú"
  const pinnedApps = useMemo(() => {
      // Mantiene el orden en que fueron fijados o el orden original
      return ALL_APPS.filter(app => pinnedIds.includes(app.id));
  }, [pinnedIds]);

  const appsByCategory = useMemo(() => {
      const groups = {};
      ALL_APPS.forEach(app => {
          if (!groups[app.category]) groups[app.category] = [];
          groups[app.category].push(app);
      });
      return groups;
  }, []);

  const navLinkClass = ({ isActive }) => `
    flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium whitespace-nowrap
    ${isActive 
      ? "bg-primary text-white shadow-glow" 
      : "text-textMuted hover:bg-white/10 hover:text-white"
    }
  `;

  return (
    <div className="flex flex-col h-screen w-full bg-background text-textMain overflow-hidden">
      
      {/* --- TOPBAR FIJA --- */}
      <header className="h-16 bg-[#050b1d] border-b border-border flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-50 relative">
        
        {/* IZQUIERDA: Logo + Favoritos */}
        <div className="flex items-center gap-6 overflow-hidden">
            {/* Logo / Nombre de Usuario */}
            <div className="text-xl font-bold tracking-tight text-white select-none flex-shrink-0">
              {userData?.name || <>Lusso <span className="text-primary">CRM</span></>}
            </div>

            {/* Separador */}
            <div className="h-6 w-px bg-border hidden md:block"></div>
            
            {/* Barra de Favoritos (Tu menú personalizado) */}
            <nav className="hidden md:flex items-center gap-1 overflow-hidden">
                {pinnedApps.map(app => (
                    <NavLink key={app.id} to={app.to} className={navLinkClass}>
                        <span className="text-lg">{app.icon}</span>
                        <span>{app.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>

        {/* DERECHA: Menú de Aplicaciones y Perfil */}
        <div className="flex items-center gap-3">
            
            {/* BOTÓN APPS (El "Start Menu") */}
            <div className="relative">
                <button 
                    onClick={() => setIsAppsMenuOpen(!isAppsMenuOpen)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isAppsMenuOpen ? "bg-primary text-white" : "hover:bg-white/10 text-textMuted hover:text-white"}`}
                >
                    <span className="text-xl grid place-items-center">
                        {/* Icono Grid 9 puntos */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z"/></svg>
                    </span>
                    <span className="text-sm font-bold hidden sm:inline">Apps</span>
                </button>

                {/* --- MEGA MENÚ DESPLEGABLE --- */}
                {isAppsMenuOpen && (
                    <>
                        {/* Overlay invisible para cerrar al hacer click fuera */}
                        <div className="fixed inset-0 z-40" onClick={() => setIsAppsMenuOpen(false)}></div>
                        
                        <div className="absolute top-full right-0 mt-3 w-[320px] sm:w-[400px] bg-[#0f172a] border border-border rounded-2xl shadow-2xl z-50 p-4 animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[80vh] overflow-hidden">
                            <div className="flex justify-between items-center mb-4 px-2 border-b border-border pb-2">
                                <span className="text-xs font-bold text-textMuted uppercase tracking-wider">Menú de Aplicaciones</span>
                                <span className="text-[10px] text-textMuted bg-surfaceHighlight px-2 py-1 rounded">
                                    📌 Fija tus apps favoritas
                                </span>
                            </div>

                            <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-6">
                                {Object.entries(appsByCategory).map(([category, apps]) => (
                                    <div key={category}>
                                        <h4 className="text-xs font-bold text-primary mb-2 px-2">{category}</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {apps.map(app => {
                                                const isPinned = pinnedIds.includes(app.id);
                                                return (
                                                    <div key={app.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-default">
                                                        {/* Link Navegación */}
                                                        <NavLink 
                                                            to={app.to} 
                                                            onClick={() => setIsAppsMenuOpen(false)}
                                                            className="flex items-center gap-3 flex-1 min-w-0"
                                                        >
                                                            <span className="text-xl">{app.icon}</span>
                                                            <span className="text-sm text-textMain font-medium truncate group-hover:text-white transition-colors">{app.label}</span>
                                                        </NavLink>

                                                        {/* Botón Pin */}
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); togglePin(app.id); }}
                                                            className={`p-1.5 rounded-md transition-all ${isPinned ? "text-primary bg-primary/10 opacity-100" : "text-textMuted opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10"}`}
                                                            title={isPinned ? "Quitar de barra" : "Fijar en barra"}
                                                        >
                                                            {/* Icono Chincheta/Pin */}
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

            {/* Perfil Usuario */}
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg cursor-pointer" title={user?.email}>
                {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            
            <button onClick={handleLogout} className="text-textMuted hover:text-red-400 transition-colors p-2" title="Salir">
                🚪
            </button>
        </div>
      </header>

      {/* --- CONTENIDO --- */}
      <main className="flex-1 overflow-y-auto bg-background p-6 custom-scrollbar relative">
        <div className="max-w-7xl mx-auto">
            <Outlet />
        </div>
      </main>

    </div>
  );
}