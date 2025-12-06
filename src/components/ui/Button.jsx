import React from "react";

export default function Button({ 
  children, 
  onClick, 
  variant = "primary", // primary, secondary, danger, ghost
  type = "button", 
  disabled = false, 
  className = "",
  ...props 
}) {
  const baseStyles = "px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  
  const variants = {
    primary: "bg-primary hover:bg-primaryHover text-white shadow-glow border border-transparent",
    secondary: "bg-surface border border-border text-textMain hover:border-textMuted hover:bg-surfaceHighlight",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/50",
    ghost: "bg-transparent text-textMuted hover:text-white hover:bg-white/5",
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}