/**
 * src/services/webhookService.js
 * Servicio centralizado para conectar Lusso CRM con tus flujos de n8n.
 * Diseño "Fire & Forget" para no bloquear la pantalla de ventas si n8n tarda.
 */

// ⚠️ IMPORTANTE: Cambia esto por tu URL base de n8n o usa variables de entorno
const N8N_BASE_URL = import.meta.env.VITE_N8N_URL || "https://tu-instancia-n8n.com"; 

export const WEBHOOK_EVENTS = {
  NEW_PATIENT: "/webhook/new-patient-welcome", // Bienvenida + Link de referido
  BIRTHDAY: "/webhook/send-birthday",          // Tu flujo de cumpleaños
  RECALL: "/webhook/send-recall",              // Tu flujo de examen anual
  NPS_SURVEY: "/webhook/send-nps"              // Tu encuesta de satisfacción
};

/**
 * Dispara un flujo en n8n
 * @param {string} endpoint - La ruta del webhook (ej: /webhook/new-patient)
 * @param {object} payload - Los datos del paciente o venta
 */
export async function sendToN8n(endpoint, payload) {
  if (!endpoint) return;

  try {
    const url = `${N8N_BASE_URL}${endpoint}`;
    
    // Enviamos sin 'await' bloqueante para que la UI siga rápida
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Source": "LussoCRM-Premium"
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        ...payload
      })
    }).then(res => {
        if (!res.ok) console.warn(`⚠️ n8n respondió ${res.status} en ${endpoint}`);
    }).catch(err => {
        console.warn("⚠️ No se pudo contactar con n8n:", err);
    });

    return true;
  } catch (error) {
    console.error("Error crítico en webhookService:", error);
    return false;
  }
}