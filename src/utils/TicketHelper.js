import { printTicketQZ, printOpticalTicketQZ } from '../services/QZService'; 

// 🟢 IMPORTS PARA WHATSAPP (Sin Firebase Storage)
import { jsPDF } from "jspdf";
import { sendTicketPdf } from "@/services/whatsappService";

export const imprimirTicket = async (venta, branchConfig) => {
  if (!venta) return;

  // ============================================================
  // 1. INTENTO PRIORITARIO: QZ TRAY (USB DIRECTO / RAW)
  // ============================================================
  try {
    const esVentaOptica = venta.items.some(i => 
        i.kind === 'LENSES' || 
        i.kind === 'CONTACT_LENS' || 
        i.kind === 'FRAMES' ||
        i.requiresLab === true
    );

    if (esVentaOptica) {
        await printOpticalTicketQZ(venta, branchConfig);
        console.log("✅ Impresión ÓPTICA exitosa vía QZ Tray");
    } else {
        await printTicketQZ(venta, branchConfig);
        console.log("✅ Impresión ESTÁNDAR exitosa vía QZ Tray");
    }
    
    return; 

  } catch (error) {
    console.warn("⚠️ QZ Tray no disponible o falló. Usando impresión Web (Fallback).", error);
  }

  // ============================================================
  // 2. FALLBACK: IMPRESIÓN WEB ESTÁNDAR (HTML / PDF)
  // ============================================================

  const commercialName = branchConfig?.name || "LUSSO VISUAL";
  const fiscal = branchConfig?.fiscalData || {}; 
  
  const fecha = new Date().toLocaleString();
  const total = parseFloat(venta.total || 0).toFixed(2);
  
  const itemsHtml = (venta.items || []).map(item => `
    <tr style="vertical-align: top;">
      <td style="padding-top: 4px;">${item.qty}</td>
      <td style="padding-top: 4px; padding-right: 2px;">
        ${item.description}
        ${item.specs ? `<div style="font-size: 9px; font-style: italic;">[${item.specs.material}]</div>` : ''}
      </td>
      <td style="text-align: right; padding-top: 4px;">$${(item.qty * item.unitPrice).toFixed(2)}</td>
    </tr>
  `).join('');

  const pagosHtml = (venta.payments || []).map(p => `
    <div style="display: flex; justify-content: space-between; font-size: 10px;">
       <span>${p.method}:</span>
       <span>$${parseFloat(p.amount).toFixed(2)}</span>
    </div>
  `).join('');

  const ticketHtml = `
    <html>
      <head>
        <title>Ticket de Venta</title>
        <style>
          body { 
            margin: 0; 
            padding: 5px; 
            font-family: 'Courier New', monospace; 
            font-size: 11px; 
            color: black;
            width: 72mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed black; margin: 5px 0; }
          .flex { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; border-bottom: 1px solid black; }
          .small { font-size: 10px; }
          .tiny { font-size: 9px; }
          @media print {
            @page { margin: 0; size: auto; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 16px;">${commercialName}</div>
        
        <div class="center small" style="margin-top: 4px;">
            ${fiscal.taxName ? `<div>${fiscal.taxName}</div>` : ''}
            ${fiscal.rfc ? `<div>RFC: ${fiscal.rfc}</div>` : ''}
            ${fiscal.taxRegime ? `<div class="tiny">${fiscal.taxRegime}</div>` : ''}
        </div>

        <div class="center tiny" style="margin-top: 4px;">
            ${fiscal.address ? `<div>${fiscal.address}</div>` : ''}
            ${(fiscal.cp || fiscal.city) ? `<div>CP: ${fiscal.cp || ""} ${fiscal.city || ""}</div>` : ''}
            ${fiscal.phone ? `<div>Tel: ${fiscal.phone}</div>` : ''}
        </div>
        
        <div class="center small" style="margin-top: 5px;">${fecha}</div>
        <div class="center bold">Folio: ${venta.id ? venta.id.slice(0, 8).toUpperCase() : '---'}</div>
        
        <div class="line"></div>
        
        <div><strong>Cliente:</strong> ${venta.patientName || "Mostrador"}</div>
        
        <div class="line"></div>
        
        <table>
          <thead>
            <tr>
              <th width="10%">C</th>
              <th width="65%">Desc</th>
              <th width="25%" style="text-align: right;">$</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="line"></div>
        
        <div class="flex" style="font-size: 14px; font-weight: bold;">
          <span>TOTAL:</span>
          <span>$${total}</span>
        </div>
        
        <div style="margin-top: 5px; border-top: 1px solid #ddd; padding-top: 2px;">
          ${pagosHtml}
        </div>
        
        <div class="line"></div>
        
        <div class="center" style="font-size: 10px; margin-top: 10px;">
          <p>¡Gracias por su compra!</p>
          <p class="tiny">No cambios en micas graduadas.</p>
          <p class="tiny">Este ticket es un comprobante simplificado de venta al público en general.</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  const ventanaImpresion = window.open('', 'PRINT', 'height=600,width=400');
  
  if (ventanaImpresion) {
    ventanaImpresion.document.write(ticketHtml);
    ventanaImpresion.document.close(); 
    ventanaImpresion.focus(); 
  } else {
    alert("Por favor permite las ventanas emergentes (Pop-ups) para imprimir.");
  }
};

/**
 * 🟢 FUNCIÓN ACTUALIZADA (Plan B): Envía PDF en Base64 directo a N8N
 * Sin subir a Firebase Storage para evitar errores CORS.
 */
export const enviarTicketWhatsapp = async (venta, paciente, branchConfig) => {
    // Validaciones
    if (!paciente?.phone) {
        alert("El paciente no tiene celular registrado.");
        return;
    }

    if (!branchConfig?.whatsappConfig?.ticketWebhook) {
        alert("Esta sucursal no tiene configurado el envío por WhatsApp.");
        return;
    }

    try {
        // 1. GENERAR PDF (Igual que antes)
        const doc = new jsPDF({
            unit: 'mm',
            format: [80, 250] // Formato largo tipo ticket
        });
        
        const margen = 5;
        let y = 10;
        const fiscal = branchConfig.fiscalData || {}; // Obtenemos datos fiscales
        
        // --- ENCABEZADO FISCAL ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(branchConfig.name || "ÓPTICA", 40, y, { align: "center" });
        y += 5;
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");

        if (fiscal.taxName) {
            doc.text(fiscal.taxName, 40, y, { align: "center" });
            y += 4;
        }
        if (fiscal.rfc) {
            doc.text(`RFC: ${fiscal.rfc}`, 40, y, { align: "center" });
            y += 4;
        }
        if (fiscal.taxRegime) {
            doc.setFontSize(7);
            doc.text(fiscal.taxRegime, 40, y, { align: "center" });
            doc.setFontSize(8);
            y += 4;
        }
        
        const direccion = fiscal.address || branchConfig.address || "";
        if (direccion) {
            const splitDir = doc.splitTextToSize(direccion, 70); 
            doc.text(splitDir, 40, y, { align: "center" });
            y += (splitDir.length * 3.5) + 1;
        }
        
        const telefono = fiscal.phone || branchConfig.phone || "";
        if (telefono) {
            doc.text(`Tel: ${telefono}`, 40, y, { align: "center" });
            y += 5;
        }

        // --- DATOS VENTA ---
        doc.text(new Date().toLocaleString(), 40, y, { align: "center" });
        y += 5;
        
        doc.setFont("helvetica", "bold");
        doc.text(`Folio: ${venta.id.slice(0,8).toUpperCase()}`, 40, y, { align: "center" });
        doc.setFont("helvetica", "normal");
        y += 5;
        
        doc.text("------------------------------------------------", 40, y, { align: "center" });
        y += 5;

        // --- ITEMS ---
        doc.setFontSize(9);
        (venta.items || []).forEach(item => {
            const desc = `${item.qty} x ${item.description}`;
            const splitDesc = doc.splitTextToSize(desc, 50);
            doc.text(splitDesc, margen, y);
            
            const precio = `$${(item.qty * item.unitPrice).toFixed(2)}`;
            doc.text(precio, 75, y, { align: "right" });
            
            y += (splitDesc.length * 4) + 2;
        });

        doc.text("------------------------------------------------", 40, y, { align: "center" });
        y += 5;

        // --- TOTALES ---
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL: $${Number(venta.total).toFixed(2)}`, 75, y, { align: "right" });
        
        // 2. CONVERTIR A BASE64 (Aquí está el cambio clave)
        // Generamos el string completo codificado
        const base64String = doc.output('datauristring');

        // 3. ENVIAR A N8N DIRECTO (Sin subir a nube)
        console.log("Enviando Ticket Base64 a n8n...");
        await sendTicketPdf(venta, paciente, base64String);

        alert("✅ Ticket enviado a procesar por WhatsApp.");

    } catch (error) {
        console.error("Error en flujo WhatsApp:", error);
        alert("Error al enviar el ticket. Revisa la consola.");
    }
};