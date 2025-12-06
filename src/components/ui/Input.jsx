import React from "react";

export default function Input({ label, error, className = "", ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2 ml-1">{label}</label>}
      <input
        className={`
          w-full px-4 py-3 
          bg-background border border-border rounded-xl 
          text-textMain placeholder-textMuted/50 text-sm
          focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/50" : ""}
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-red-400 text-xs mt-1 block ml-1">{error}</span>}
    </div>
  );
}