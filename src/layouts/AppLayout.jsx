import React from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { clearToken } from "../auth";
import "./appLayout.css";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true, state: { from: location.pathname } });
  };

  const linkClass = ({ isActive }) => "navItem" + (isActive ? " active" : "");

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">Lusso CRM</div>

        <nav className="nav">
          <NavLink to="dashboard" className={linkClass}>
            Dashboard
          </NavLink>

          <NavLink to="patients" className={linkClass}>
            Pacientes
          </NavLink>

          <NavLink to="work-orders" className={linkClass}>
            Work Orders
          </NavLink>

          {/* 👈 NUEVO LINK */}
          <NavLink to="inventory" className={linkClass}>
            Inventario
          </NavLink>
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
