import React from "react";

export default function Button({ 
  children, 
  onClick, 
  variant = "primary", // primary, danger, ghost, outline
  type = "button", 
  disabled = false, 
  className = "",
  ...props 
}) {
  const baseStyles = "px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20",
    danger: "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5",
    outline: "bg-transparent border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white"
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}