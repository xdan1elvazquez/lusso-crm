import React from "react";
import { Outlet } from "react-router-dom";

export default function ClientLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* 🟢 ESTE ES EL DIV TOP (ENCABEZADO FIJO) */}
      <header className="h-14 border-b border-white/10 flex items-center justify-center bg-slate-900/80 backdrop-blur-md fixed top-0 w-full z-50 shadow-lg">
        <div className="font-bold text-lg tracking-[0.2em] uppercase text-white/90">
          TrackerVisual
        </div>
      </header>

      {/* CONTENIDO DE LAS PÁGINAS (Login / Tracker) */}
      <main className="pt-20 px-4 pb-10 max-w-3xl mx-auto animate-fadeIn">
        <Outlet />
      </main>
      
    </div>
  );
}