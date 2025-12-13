import { getBranchConfig } from "@/utils/branchesConfig";

/**
 * Envía notificación de CAMBIO DE ESTADO (Work Order)
 * Selecciona automáticamente el flujo de n8n según la sucursal.
 */
export async function sendOrderStatusNotification(order, patient) {
  try {
    // 1. Obtener configuración de la sucursal de la orden
    const branchConfig = getBranchConfig(order.branchId || "lusso_main");
    const webhookUrl = branchConfig.whatsappConfig?.statusWebhook;

    if (!webhookUrl) {
        console.warn(`⚠️ No hay webhook de ESTADO configurado para la sucursal ${order.branchId}`);
        return false;
    }

    // 2. Preparar Payload
    const payload = {
      phone: patient.phone, // Ya viene normalizado +521...
      patientName: `${patient.firstName} ${patient.lastName}`,
      orderId: order.id,
      status: order.status,
      branchName: branchConfig.name,
      messageType: "ORDER_UPDATE"
    };

    // 3. Enviar a n8n
    console.log(`📤 Enviando aviso a n8n (${branchConfig.name})...`);
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(err => console.error("Error webhook n8n:", err));

    return true;

  } catch (error) {
    console.error("Error preparando notificación:", error);
    return false;
  }
}

/**
 * Envía notificación de TICKET PDF (Venta)
 * 🟢 ACTUALIZADO: Recibe Base64 en lugar de URL
 */
export async function sendTicketPdf(sale, patient, pdfBase64) {
  try {
    const branchConfig = getBranchConfig(sale.branchId || "lusso_main");
    const webhookUrl = branchConfig.whatsappConfig?.ticketWebhook;

    if (!webhookUrl) {
        console.warn(`⚠️ No hay webhook de TICKET configurado para la sucursal ${sale.branchId}`);
        return false;
    }

    const payload = {
        phone: patient.phone,
        patientName: sale.patientName,
        saleId: sale.id,
        pdfBase64: pdfBase64, // 👈 CAMBIO CLAVE: Enviamos el archivo codificado aquí
        total: sale.total,
        branchName: branchConfig.name,
        messageType: "TICKET_PDF"
    };

    console.log(`📤 Enviando PDF Base64 a n8n (${branchConfig.name})...`);
    
    // Enviamos el payload (que ahora incluye el archivo)
    fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).catch(err => console.error("Error webhook ticket:", err));

    return true;

  } catch (error) {
    console.error(error);
    return false;
  }
}