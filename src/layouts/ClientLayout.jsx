import React from "react";
import { Outlet } from "react-router-dom";

export default function ClientLayout() {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Navbar Minimalista solo para el cliente */}
      <header className="h-16 border-b border-white/10 flex items-center justify-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="text-xl font-bold tracking-tight">
            Lusso <span className="text-blue-500">Tracker</span>
          </div>
      </header>

      <main className="max-w-md mx-auto p-6">
        <Outlet />
      </main>

      <footer className="text-center py-8 text-xs text-slate-600">
        © Lusso Visual. Tu visión, nuestro compromiso.
      </footer>
    </div>
  );
}