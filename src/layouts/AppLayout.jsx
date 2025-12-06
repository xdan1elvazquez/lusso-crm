import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AppLayout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  // Estado para controlar si está colapsado
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error al salir:", error);
    }
  };

  /**
   * Estilo de Links (Dark Mode) adaptativo
   */
  const navLinkClass = ({ isActive }) => `
    group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium mb-1
    ${isActive 
      ? "bg-blue-500/10 text-white border-l-2 border-primary" 
      : "text-textMuted hover:bg-white/5 hover:text-white border-l-2 border-transparent"
    }
    ${isCollapsed ? "justify-center px-0" : ""} 
  `;

  return (
    <div className="flex h-screen w-full bg-background text-textMain overflow-hidden">
      
      {/* SIDEBAR */}
      <aside 
        className={`
          flex flex-col border-r border-border bg-[#050b1d] transition-all duration-300 ease-in-out
          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
        {/* Header Sidebar con Botón Toggle */}
        <div className={`h-16 flex items-center border-b border-border/50 ${isCollapsed ? "justify-center" : "justify-between px-6"}`}>
          
          {/* Logo - Lógica de visualización */}
          {!isCollapsed ? (
            <div className="text-lg font-bold tracking-wide text-white whitespace-nowrap overflow-hidden">
              Lusso <span className="text-primary">CRM</span>
            </div>
          ) : (
            <div className="text-xl font-bold text-primary">L</div>
          )}

          {/* Botón Colapsar */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-textMuted hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? "»" : "«"}
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
          
          <NavSection title="Clínica" collapsed={isCollapsed}>
            <NavLink to="dashboard" className={navLinkClass} title="Dashboard">
              <span className="text-lg">📊</span> 
              {!isCollapsed && <span className="whitespace-nowrap">Dashboard</span>}
            </NavLink>
            <NavLink to="patients" className={navLinkClass} title="Pacientes">
              <span className="text-lg">👥</span>
              {!isCollapsed && <span className="whitespace-nowrap">Pacientes</span>}
            </NavLink>
            <NavLink to="work-orders" className={navLinkClass} title="Trabajos">
              <span className="text-lg">👓</span>
              {!isCollapsed && <span className="whitespace-nowrap">Trabajos</span>}
            </NavLink>
          </NavSection>

          <NavSection title="Ventas" collapsed={isCollapsed}>
            <NavLink to="sales" className={navLinkClass} title="Punto de Venta">
              <span className="text-lg">🛒</span>
              {!isCollapsed && <span className="whitespace-nowrap">Punto de Venta</span>}
            </NavLink>
            <NavLink to="sales-history" className={navLinkClass} title="Historial">
              <span className="text-lg">📑</span>
              {!isCollapsed && <span className="whitespace-nowrap">Historial</span>}
            </NavLink>
            <NavLink to="receivables" className={navLinkClass} title="Cobranza">
              <span className="text-lg">💳</span>
              {!isCollapsed && <span className="whitespace-nowrap">Cobranza</span>}
            </NavLink>
          </NavSection>

          <NavSection title="Gestión" collapsed={isCollapsed}>
            <NavLink to="inventory" className={navLinkClass} title="Inventario">
              <span className="text-lg">📦</span>
              {!isCollapsed && <span className="whitespace-nowrap">Inventario</span>}
            </NavLink>
            <NavLink to="finance" className={navLinkClass} title="Finanzas">
              <span className="text-lg">💰</span>
              {!isCollapsed && <span className="whitespace-nowrap">Finanzas</span>}
            </NavLink>
            <NavLink to="expenses" className={navLinkClass} title="Gastos">
              <span className="text-lg">💸</span>
              {!isCollapsed && <span className="whitespace-nowrap">Gastos</span>}
            </NavLink>
            <NavLink to="shifts" className={navLinkClass} title="Turnos">
              <span className="text-lg">🔐</span>
              {!isCollapsed && <span className="whitespace-nowrap">Turnos</span>}
            </NavLink>
          </NavSection>
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-border bg-surface/30">
          <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-surfaceHighlight flex items-center justify-center text-xs font-bold border border-border text-textMuted flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            
            {!isCollapsed && (
              <div className="overflow-hidden">
                <div className="text-sm font-medium truncate text-white max-w-[120px]" title={user?.email}>
                  {user?.email}
                </div>
                <div className="text-xs text-textMuted">Conectado</div>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
            title="Cerrar Sesión"
            className={`
              w-full py-2 rounded-lg border border-border bg-surface hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors text-xs font-medium text-textMuted flex items-center justify-center gap-2
              ${isCollapsed ? "px-0" : "px-3"}
            `}
          >
            <span>🚪</span>
            {!isCollapsed && "Cerrar Sesión"}
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative transition-all duration-300">
        
        {/* Topbar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
           <h2 className="text-sm font-medium text-textMuted">Panel de Administración</h2>
           <div className="text-xs text-textMuted border border-border px-3 py-1 rounded-full bg-surface">
              {new Date().toLocaleDateString()}
           </div>
        </header>

        {/* Scroll Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Componente auxiliar para títulos de sección que desaparecen
function NavSection({ title, collapsed, children }) {
  return (
    <div>
      {!collapsed && (
        <div className="text-xs font-bold text-textMuted/50 uppercase tracking-wider mb-2 px-3 animate-fadeIn">
          {title}
        </div>
      )}
      {/* Si está colapsado, mostramos una línea separadora sutil en lugar del título */}
      {collapsed && <div className="h-px bg-border/50 mx-4 my-2" />}
      {children}
    </div>
  );
}