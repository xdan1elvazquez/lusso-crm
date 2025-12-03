import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext"; // 👈 Usamos el hook de Auth
import "./appLayout.css";

export default function AppLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth(); // 👈 Extraemos la función logout de Firebase

  const handleLogout = async () => {
    try {
      await logout(); // Cerramos sesión en Firebase
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error al salir:", error);
    }
  };

  const linkClass = ({ isActive }) => "navItem" + (isActive ? " active" : "");

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">Lusso CRM</div>

        <nav className="nav">
          <NavLink to="sales" className={linkClass}>🛒 Punto de Venta</NavLink>
          <NavLink to="expenses" className={linkClass}>💸 Gastos</NavLink>
          <NavLink to="receivables" className={linkClass}>💳 Cobranza</NavLink>
          <NavLink to="finance" className={linkClass}>💰 Finanzas</NavLink>
          <NavLink to="dashboard" className={linkClass}>🗂️ Dashboard</NavLink>
          <NavLink to="patients" className={linkClass}>👤 Pacientes</NavLink>
          <NavLink to="sales-history" className={linkClass}>📋 Historial Ventas</NavLink>
          <NavLink to="work-orders" className={linkClass}>👓 Ordenes de trabajo</NavLink>
          <NavLink to="labs" className={linkClass}>🧪 Laboratorios</NavLink>
          <NavLink to="inventory" className={linkClass}>🧰 Inventario</NavLink>
          <NavLink to="suppliers" className={linkClass}>📦 Proveedores</NavLink>
          <NavLink to="statistics" className={linkClass}>📊 Estadísticas</NavLink>
          <NavLink to="shifts" className={linkClass}>🔐 Control Turnos</NavLink>
          <NavLink to="team" className={linkClass}>🧷 Equipo</NavLink>
        </nav>

        <div className="sidebarBottom">
          <button type="button" className="logoutBtn" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}