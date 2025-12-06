import React from "react";

export default function Badge({ children, color = "gray", className = "" }) {
  const colors = {
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    yellow: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    gray: "bg-slate-700/30 text-slate-400 border-slate-600/30",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${colors[color] || colors.gray} ${className}`}>
      {children}
    </span>
  );
}