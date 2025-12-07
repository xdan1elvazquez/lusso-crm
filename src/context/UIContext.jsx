import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const UIContext = createContext();

export function UIProvider({ children }) {
  // --- TOAST STATE ---
  const [toasts, setToasts] = useState([]);
  
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000); 
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

  const notify = {
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error"),
    info: (msg) => addToast(msg, "info"),
  };

  return (
    <UIContext.Provider value={{ notify, confirm }}>
      {children}
      
      {/* RENDER TOASTS */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3">
        {toasts.map((t) => (
          <div key={t.id} className={`
            min-w-[280px] p-4 rounded-xl shadow-2xl border text-sm animate-fadeIn
            ${t.type === "error" ? "bg-red-950/90 border-red-500/50 text-red-100" : 
              t.type === "success" ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-100" : 
              "bg-slate-900/90 border-blue-500/50 text-blue-100"}
          `}>
            <div className="font-bold text-xs uppercase mb-1 opacity-80">{t.type}</div>
            {t.message}
          </div>
        ))}
      </div>

      {/* RENDER CONFIRM MODAL */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-border max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">{confirmState.title}</h3>
            <p className="text-textMuted mb-6 whitespace-pre-wrap">{confirmState.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={handleCancel} className="px-4 py-2 rounded-lg text-sm border border-border text-textMuted hover:text-white hover:bg-white/5 transition-colors">
                {confirmState.cancelText || "Cancelar"}
              </button>
              <button onClick={handleConfirm} className="px-4 py-2 rounded-lg text-sm bg-primary hover:bg-primaryHover text-white font-bold transition-colors shadow-glow">
                {confirmState.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}

export const useNotify = () => useContext(UIContext).notify;
export const useConfirm = () => useContext(UIContext).confirm;