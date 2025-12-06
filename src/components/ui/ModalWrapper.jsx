import React, { useEffect } from "react";

export default function ModalWrapper({ children, onClose, title, width = "500px" }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  return (
    // Overlay oscuro fijo con backdrop-blur (ahora sí funcionará)
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Caja del Modal */}
      <div 
        className="bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl flex flex-col max-h-[90vh] w-full"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex justify-between items-center p-4 border-b border-[#333]">
          <h3 className="m-0 text-lg font-semibold text-white">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none bg-transparent border-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-5 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}