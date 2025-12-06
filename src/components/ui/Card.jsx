import React from "react";

export default function Card({ children, className = "", noPadding = false }) {
  return (
    <div className={`bg-[#1a1a1a] border border-[#333] rounded-xl shadow-sm overflow-hidden ${noPadding ? "" : "p-5"} ${className}`}>
      {children}
    </div>
  );
}