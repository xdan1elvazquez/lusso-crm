import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AppLayout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  // Estado del menú
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
   * ESTILO DE LOS LINKS
   * Truco visual:
   * - Cuando está abierto: gap-3 y padding normal.
   * - Cuando está cerrado: gap-0 y padding extra a la izquierda para "empujar" el icono al centro visual de la barra de 80px.
   */
  const navLinkClass = ({ isActive }) => `
    group flex items-center px-3 py-3 rounded-xl transition-all duration-300 text-sm font-medium mb-1 overflow-hidden whitespace-nowrap
    ${isCollapsed ? "gap-0 pl-5" : "gap-3"} 
    ${isActive 
      ? "bg-blue-600/10 text-white border-l-2 border-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
      : "text-textMuted hover:bg-white/5 hover:text-white border-l-2 border-transparent"
    }
  `;

  // Clase para ocultar el texto suavemente
  const textClass = `transition-all duration-300 ease-in-out ${isCollapsed ? "opacity-0 w-0 translate-x-10" : "opacity-100 w-auto translate-x-0"}`;

  return (
    <div className="flex h-screen w-full bg-background text-textMain overflow-hidden">
      
      {/* SIDEBAR (CONTENEDOR PADRE)
          Se encoge suavemente de w-64 a w-20.
      */}
      <aside 
        className={`
          flex-shrink-0 border-r border-border bg-[#050b1d] z-20
          transition-[width] duration-300 ease-out
          ${isCollapsed ? "w-20" : "w-64"}
          overflow-hidden flex flex-col
        `}
      >
        {/* HEADER (Flexible) */}
        <div className="h-20 flex items-center relative flex-shrink-0 px-4">
             {/* Logo Texto: Se desvanece */}
             <div className={`absolute left-5 transition-all duration-300 ${isCollapsed ? "opacity-0 -translate-x-10" : "opacity-100 translate-x-0"}`}>
                <div className="text-xl font-bold tracking-tight text-white whitespace-nowrap">
                   Lusso <span className="text-primary">CRM</span>
                </div>
             </div>

             {/* Logo Mini (L): Aparece al centro */}
             <div className={`absolute left-0 right-0 flex justify-center transition-all duration-300 ${isCollapsed ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
                <span className="text-2xl font-bold text-primary">L</span>
             </div>

             {/* Botón Toggle: Se mueve */}
             <button 
               onClick={() => setIsCollapsed(!isCollapsed)}
               className={`
                 text-textMuted hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all absolute z-30
                 ${isCollapsed ? "top-14 left-1/2 -translate-x-1/2 scale-75 bg-[#050b1d] border border-border" : "right-2 top-1/2 -translate-y-1/2"}
               `}
               title={isCollapsed ? "Expandir" : "Colapsar"}
             >
               {isCollapsed ? "»" : "«"}
             </button>
        </div>

        {/* ⚠️ MÁSCARA DE ESTABILIDAD ⚠️
            Este div interno mantiene el ancho fijo de 256px (w-64).
            Evita que Chrome recalcule el layout del texto al encogerse.
        */}
        <div className="flex-1 overflow-hidden relative w-full">
            <div className="w-64 h-full flex flex-col absolute top-0 left-0 overflow-y-auto custom-scrollbar p-3">
            
            <NavSection title="Clínica" collapsed={isCollapsed}>
              <NavLink to="dashboard" className={navLinkClass} title={isCollapsed ? "Dashboard" : ""}>
                  <span className="text-xl min-w-[24px] text-center">📊</span> 
                  <span className={textClass}>Dashboard</span>
              </NavLink>
              <NavLink to="patients" className={navLinkClass} title={isCollapsed ? "Pacientes" : ""}>
                  <span className="text-xl min-w-[24px] text-center">👥</span> 
                  <span className={textClass}>Pacientes</span>
              </NavLink>
              <NavLink to="statistics" className={navLinkClass} title={isCollapsed ? "Estadísticas" : ""}>
                  <span className="text-xl min-w-[24px] text-center">📈</span> 
                  <span className={textClass}>Estadísticas</span>
              </NavLink>
            </NavSection>

            <NavSection title="Ventas" collapsed={isCollapsed}>
              <NavLink to="sales" className={navLinkClass} title={isCollapsed ? "Punto de Venta" : ""}>
                  <span className="text-xl min-w-[24px] text-center">🛒</span> 
                  <span className={textClass}>Punto de Venta</span>
              </NavLink>
              <NavLink to="work-orders" className={navLinkClass} title={isCollapsed ? "Trabajos" : ""}>
                  <span className="text-xl min-w-[24px] text-center">👓</span> 
                  <span className={textClass}>Trabajos</span>
              </NavLink>
              <NavLink to="sales-history" className={navLinkClass} title={isCollapsed ? "Historial" : ""}>
                  <span className="text-xl min-w-[24px] text-center">📑</span> 
                  <span className={textClass}>Historial</span>
              </NavLink>
            </NavSection>

            <NavSection title="Logística" collapsed={isCollapsed}>
              <NavLink to="inventory" className={navLinkClass} title={isCollapsed ? "Inventario" : ""}>
                  <span className="text-xl min-w-[24px] text-center">📦</span> 
                  <span className={textClass}>Inventario</span>
              </NavLink>
              <NavLink to="labs" className={navLinkClass} title={isCollapsed ? "Laboratorios" : ""}>
                  <span className="text-xl min-w-[24px] text-center">🧪</span> 
                  <span className={textClass}>Laboratorios</span>
              </NavLink>
              <NavLink to="suppliers" className={navLinkClass} title={isCollapsed ? "Proveedores" : ""}>
                  <span className="text-xl min-w-[24px] text-center">🏭</span> 
                  <span className={textClass}>Proveedores</span>
              </NavLink>
            </NavSection>

            <NavSection title="Finanzas" collapsed={isCollapsed}>
              <NavLink to="finance" className={navLinkClass} title={isCollapsed ? "Finanzas" : ""}>
                  <span className="text-xl min-w-[24px] text-center">💰</span> 
                  <span className={textClass}>Finanzas</span>
              </NavLink>
              <NavLink to="receivables" className={navLinkClass} title={isCollapsed ? "Por Cobrar" : ""}>
                  <span className="text-xl min-w-[24px] text-center">💳</span> 
                  <span className={textClass}>Por Cobrar</span>
              </NavLink>
              <NavLink to="payables" className={navLinkClass} title={isCollapsed ? "Por Pagar" : ""}>
                  <span className="text-xl min-w-[24px] text-center">📉</span> 
                  <span className={textClass}>Por Pagar</span>
              </NavLink>
              <NavLink to="expenses" className={navLinkClass} title={isCollapsed ? "Gastos" : ""}>
                  <span className="text-xl min-w-[24px] text-center">💸</span> 
                  <span className={textClass}>Gastos</span>
              </NavLink>
              <NavLink to="payroll" className={navLinkClass} title={isCollapsed ? "Nómina" : ""}>
                  <span className="text-xl min-w-[24px] text-center">👥</span> 
                  <span className={textClass}>Nómina</span>
              </NavLink>
            </NavSection>

            <NavSection title="Admin" collapsed={isCollapsed}>
              <NavLink to="shifts" className={navLinkClass} title={isCollapsed ? "Cortes de Caja" : ""}>
                  <span className="text-xl min-w-[24px] text-center">🔐</span> 
                  <span className={textClass}>Cortes de Caja</span>
              </NavLink>
              <NavLink to="team" className={navLinkClass} title={isCollapsed ? "Equipo" : ""}>
                  <span className="text-xl min-w-[24px] text-center">🧷</span> 
                  <span className={textClass}>Equipo</span>
              </NavLink>
            </NavSection>

            {/* Footer User */}
            <div className="mt-auto pt-6 pb-2">
                <button 
                    onClick={handleLogout}
                    title="Cerrar Sesión"
                    className={`
                      w-full py-3 rounded-lg border border-border bg-surface hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all text-xs font-medium text-textMuted flex items-center
                      ${isCollapsed ? "gap-0 pl-5" : "gap-4 px-3"}
                    `}
                >
                    <span className="text-xl min-w-[24px] text-center">🚪</span>
                    <span className={textClass}>Cerrar Sesión</span>
                </button>
            </div>

          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative h-full transition-all duration-300">
        <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-20 flex-shrink-0">
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

// Componente para Títulos de Sección
function NavSection({ title, collapsed, children }) {
  return (
    <div className="mb-2">
      {/* El título se desvanece al cerrar */}
      <div className={`text-[10px] font-bold text-textMuted/40 uppercase tracking-widest mb-2 px-3 transition-all duration-300 overflow-hidden ${collapsed ? "h-0 opacity-0 mb-0" : "h-auto opacity-100"}`}>
        {title}
      </div>
      {/* Línea separadora cuando está colapsado */}
      {collapsed && <div className="h-px bg-border/30 mx-4 my-3" />}
      
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}