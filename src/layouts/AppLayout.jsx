import { NavLink, Outlet } from "react-router-dom";
import "./appLayout.css";

export default function AppLayout() {
  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">Lusso CRM</div>

        <nav className="nav">
          <NavLink to="/dashboard" className={({ isActive }) => "navItem" + (isActive ? " active" : "")}>
            Dashboard
          </NavLink>
          <NavLink to="/patients" className={({ isActive }) => "navItem" + (isActive ? " active" : "")}>
            Patients
          </NavLink>
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
