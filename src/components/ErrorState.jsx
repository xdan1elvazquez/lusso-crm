import React from "react";

export default function ErrorState({ message = "Algo salió mal.", error }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="text-xl font-bold text-white mb-2">Ocurrió un error</h3>
      <p className="text-red-400 max-w-md">{message}</p>
      {error && <pre className="mt-4 p-4 bg-black/30 rounded text-xs text-textMuted text-left overflow-auto max-w-lg">{String(error)}</pre>}
    </div>
  );
}