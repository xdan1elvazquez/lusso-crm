// src/components/LoadingState.jsx
import React from "react";

export default function LoadingState() {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
      <div style={{ fontSize: "2em", marginBottom: 10 }}>⏳</div>
      <p>Cargando datos...</p>
    </div>
  );
}