import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AppLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error al salir:", error);
    }
  };

  const navLinkClass = ({ isActive }) => `
    group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 text-sm font-medium mb-1 overflow-hidden
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
          flex-shrink-0 flex flex-col border-r border-border bg-[#050b1d] 
          transition-[width] duration-200 ease-in-out
          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
        {/* Header Sidebar */}
        <div className={`h-16 flex items-center border-b border-border/50 flex-shrink-0 ${isCollapsed ? "justify-center" : "justify-between px-6"}`}>
          {!isCollapsed ? (
            <div className="text-lg font-bold tracking-wide text-white overflow-hidden whitespace-nowrap">
              Lusso <span className="text-primary">CRM</span>
            </div>
          ) : (
            <div className="text-xl font-bold text-primary">L</div>
          )}

          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-textMuted hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? "»" : "«"}
          </button>
        </div>

        {/* Navegación Scrolleable */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6 overflow-x-hidden">
          
          <NavSection title="Clínica" collapsed={isCollapsed}>
            <NavLink to="dashboard" className={navLinkClass} title="Dashboard">
                <span className="text-lg flex-shrink-0">📊</span> {!isCollapsed && <span className="whitespace-nowrap">Dashboard</span>}
            </NavLink>
            <NavLink to="patients" className={navLinkClass} title="Pacientes">
                <span className="text-lg flex-shrink-0">👥</span> {!isCollapsed && <span className="whitespace-nowrap">Pacientes</span>}
            </NavLink>
            <NavLink to="statistics" className={navLinkClass} title="Estadísticas">
                <span className="text-lg flex-shrink-0">📈</span> {!isCollapsed && <span className="whitespace-nowrap">Estadísticas</span>}
            </NavLink>
          </NavSection>

          <NavSection title="Ventas" collapsed={isCollapsed}>
            <NavLink to="sales" className={navLinkClass} title="Punto de Venta">
                <span className="text-lg flex-shrink-0">🛒</span> {!isCollapsed && <span className="whitespace-nowrap">Punto de Venta</span>}
            </NavLink>
            <NavLink to="work-orders" className={navLinkClass} title="Trabajos">
                <span className="text-lg flex-shrink-0">👓</span> {!isCollapsed && <span className="whitespace-nowrap">Trabajos</span>}
            </NavLink>
            <NavLink to="sales-history" className={navLinkClass} title="Historial">
                <span className="text-lg flex-shrink-0">📑</span> {!isCollapsed && <span className="whitespace-nowrap">Historial</span>}
            </NavLink>
          </NavSection>

          <NavSection title="Logística" collapsed={isCollapsed}>
            <NavLink to="inventory" className={navLinkClass} title="Inventario">
                <span className="text-lg flex-shrink-0">📦</span> {!isCollapsed && <span className="whitespace-nowrap">Inventario</span>}
            </NavLink>
            <NavLink to="labs" className={navLinkClass} title="Laboratorios">
                <span className="text-lg flex-shrink-0">🧪</span> {!isCollapsed && <span className="whitespace-nowrap">Laboratorios</span>}
            </NavLink>
            <NavLink to="suppliers" className={navLinkClass} title="Proveedores">
                <span className="text-lg flex-shrink-0">🏭</span> {!isCollapsed && <span className="whitespace-nowrap">Proveedores</span>}
            </NavLink>
          </NavSection>

          <NavSection title="Finanzas" collapsed={isCollapsed}>
            <NavLink to="finance" className={navLinkClass} title="Finanzas">
                <span className="text-lg flex-shrink-0">💰</span> {!isCollapsed && <span className="whitespace-nowrap">Finanzas</span>}
            </NavLink>
            <NavLink to="receivables" className={navLinkClass} title="Por Cobrar">
                <span className="text-lg flex-shrink-0">💳</span> {!isCollapsed && <span className="whitespace-nowrap">Por Cobrar</span>}
            </NavLink>
            <NavLink to="payables" className={navLinkClass} title="Por Pagar">
                <span className="text-lg flex-shrink-0">📉</span> {!isCollapsed && <span className="whitespace-nowrap">Por Pagar</span>}
            </NavLink>
            <NavLink to="expenses" className={navLinkClass} title="Gastos">
                <span className="text-lg flex-shrink-0">💸</span> {!isCollapsed && <span className="whitespace-nowrap">Gastos</span>}
            </NavLink>
            <NavLink to="payroll" className={navLinkClass} title="Nómina">
                <span className="text-lg flex-shrink-0">👥</span> {!isCollapsed && <span className="whitespace-nowrap">Nómina</span>}
            </NavLink>
          </NavSection>

          <NavSection title="Admin" collapsed={isCollapsed}>
            <NavLink to="shifts" className={navLinkClass} title="Cortes de Caja">
                <span className="text-lg flex-shrink-0">🔐</span> {!isCollapsed && <span className="whitespace-nowrap">Turnos / Caja</span>}
            </NavLink>
            <NavLink to="team" className={navLinkClass} title="Equipo">
                <span className="text-lg flex-shrink-0">🧷</span> {!isCollapsed && <span className="whitespace-nowrap">Equipo</span>}
            </NavLink>
          </NavSection>

        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface/30 flex-shrink-0 overflow-hidden">
          <button 
            onClick={handleLogout}
            title="Cerrar Sesión"
            className={`
              w-full py-2 rounded-lg border border-border bg-surface hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors text-xs font-medium text-textMuted flex items-center justify-center gap-2
              ${isCollapsed ? "px-0" : "px-3"}
            `}
          >
            <span className="flex-shrink-0">🚪</span>
            {!isCollapsed && <span className="whitespace-nowrap">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-20 flex-shrink-0">
           <h2 className="text-sm font-medium text-textMuted">Panel de Administración</h2>
           <div className="text-xs text-textMuted border border-border px-3 py-1 rounded-full bg-surface">
              {new Date().toLocaleDateString()}
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavSection({ title, collapsed, children }) {
  return (
    <div>
      {!collapsed && (
        <div className="text-xs font-bold text-textMuted/50 uppercase tracking-wider mb-2 px-3 animate-[fadeIn_0.2s]">
          {title}
        </div>
      )}
      {collapsed && <div className="h-px bg-border/50 mx-4 my-2" />}
      {children}
    </div>
  );
}