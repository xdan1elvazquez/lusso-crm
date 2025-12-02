import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const UIContext = createContext();

export function UIProvider({ children }) {
  // --- TOAST STATE ---
  const [toasts, setToasts] = useState([]);
  
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000); // Auto-dismiss 3s
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- CONFIRM STATE ---
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: "", message: "" });
  const confirmResolver = useRef(null);

  const confirm = useCallback(({ title = "Confirmar", message, confirmText = "Aceptar", cancelText = "Cancelar" }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText
      });
      confirmResolver.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setConfirmState({ ...confirmState, isOpen: false });
    if (confirmResolver.current) confirmResolver.current(true);
  };

  const handleCancel = () => {
    setConfirmState({ ...confirmState, isOpen: false });
    if (confirmResolver.current) confirmResolver.current(false);
  };

  // --- EXPOSED API ---
  const notify = {
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error"),
    info: (msg) => addToast(msg, "info"),
  };

  return (
    <UIContext.Provider value={{ notify, confirm }}>
      {children}
      
      {/* RENDER TOASTS */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            background: "#222", 
            border: `1px solid ${t.type === "error" ? "#f87171" : t.type === "success" ? "#4ade80" : "#60a5fa"}`,
            color: "white", padding: "12px 16px", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            fontSize: "0.9em", minWidth: 200, animation: "fadeIn 0.2s"
          }}>
            <div style={{fontWeight: "bold", marginBottom: 2, textTransform: "uppercase", fontSize: "0.8em", color: t.type === "error" ? "#f87171" : t.type === "success" ? "#4ade80" : "#60a5fa"}}>{t.type}</div>
            {t.message}
          </div>
        ))}
      </div>

      {/* RENDER CONFIRM MODAL */}
      {confirmState.isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)",
          zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #444", maxWidth: 400, width: "90%" }}>
            <h3 style={{ marginTop: 0, color: "#e5e7eb" }}>{confirmState.title}</h3>
            <p style={{ color: "#ccc", marginBottom: 25, whiteSpace: "pre-wrap" }}>{confirmState.message}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={handleCancel} style={{ background: "transparent", color: "#aaa", border: "1px solid #444", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>
                {confirmState.cancelText || "Cancelar"}
              </button>
              <button onClick={handleConfirm} style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}>
                {confirmState.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </UIContext.Provider>
  );
}

// Hooks personalizados
export const useNotify = () => useContext(UIContext).notify;
export const useConfirm = () => useContext(UIContext).confirm;