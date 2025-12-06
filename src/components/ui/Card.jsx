import React from "react";

export default function Card({ children, className = "", noPadding = false }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl shadow-sm overflow-hidden ${noPadding ? "" : "p-6"} ${className}`}>
      {children}
    </div>
  );
}