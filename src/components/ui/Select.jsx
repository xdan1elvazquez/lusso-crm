import React from "react";

export default function Select({ label, children, className = "", ...props }) {
  return (
    <label className="block w-full">
      {label && <span className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">{label}</span>}
      <select
        className={`
          w-full px-3 py-2.5 
          bg-slate-900 border border-slate-700 rounded-lg 
          text-white text-sm
          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
          transition-colors duration-200
          appearance-none cursor-pointer
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}