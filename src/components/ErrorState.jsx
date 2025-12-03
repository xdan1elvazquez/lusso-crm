// src/components/ErrorState.jsx
import React from "react";

export default function ErrorState({ error }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "#f87171" }}>
      <div style={{ fontSize: "2em", marginBottom: 10 }}>⚠️</div>
      <p>Ocurrió un error</p>
      <small>{error}</small>
    </div>
  );
}