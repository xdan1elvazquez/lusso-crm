// src/utils/TicketHelper.js
import { printTicketQZ, printOpticalTicketQZ } from '../services/QZService'; 

export const imprimirTicket = async (venta, branchConfig) => {
  if (!venta) return;

  // ============================================================
  // 1. INTENTO PRIORITARIO: QZ TRAY (USB DIRECTO / RAW)
  // ============================================================
  try {
    // 🔍 ANÁLISIS INTELIGENTE DE LA VENTA
    // Detectamos si la venta incluye productos ópticos (Lentes, L.C., Armazones)
    // o si algún item requiere laboratorio explícitamente.
    const esVentaOptica = venta.items.some(i => 
        i.kind === 'LENSES' || 
        i.kind === 'CONTACT_LENS' || 
        i.kind === 'FRAMES' ||
        i.requiresLab === true
    );

    if (esVentaOptica) {
        // ✅ MODO PREMIUM CLÍNICO:
        // Incluye Tabla de Rx, Desglose de Lente/Armazón y Garantías de Salud Visual
        await printOpticalTicketQZ(venta, branchConfig);
        console.log("✅ Impresión ÓPTICA exitosa vía QZ Tray");
    } else {
        // 🛒 MODO ESTÁNDAR (Simplificado):
        // Para gotas, accesorios o servicios generales
        await printTicketQZ(venta, branchConfig);
        console.log("✅ Impresión ESTÁNDAR exitosa vía QZ Tray");
    }
    
    return; // ¡Éxito! Terminamos aquí, no abrimos ventana web.

  } catch (error) {
    // Si llegamos aquí es porque estamos en iPad/Móvil o QZ está cerrado.
    // Continuamos al método Web (Fallback) sin detener el flujo.
    console.warn("⚠️ QZ Tray no disponible o falló. Usando impresión Web (Fallback).", error);
  }

  // ============================================================
  // 2. FALLBACK: IMPRESIÓN WEB ESTÁNDAR (HTML / PDF)
  // ============================================================
  // Este código se ejecuta solo si QZ Tray falló o no está disponible.
  // Genera un ticket HTML legalmente válido para imprimir desde el navegador.

  const commercialName = branchConfig?.name || "LUSSO VISUAL";
  const fiscal = branchConfig?.fiscalData || {}; // Datos Fiscales Dinámicos
  
  const fecha = new Date().toLocaleString();
  const total = parseFloat(venta.total || 0).toFixed(2);
  
  // Generamos las filas de productos (HTML)
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

  // Pagos (HTML)
  const pagosHtml = (venta.payments || []).map(p => `
    <div style="display: flex; justify-content: space-between; font-size: 10px;">
       <span>${p.method}:</span>
       <span>$${parseFloat(p.amount).toFixed(2)}</span>
    </div>
  `).join('');

  // Definimos el HTML completo del Ticket (Diseño Web Legal)
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
            width: 72mm; /* Ancho seguro estándar */
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed black; margin: 5px 0; }
          .flex { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; border-bottom: 1px solid black; }
          .small { font-size: 10px; }
          .tiny { font-size: 9px; }
          
          /* Ocultar header/footer del navegador al imprimir */
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
          // Autoprint y cerrar (comentado close para pruebas)
          window.onload = function() {
            window.print();
            // window.close(); 
          }
        </script>
      </body>
    </html>
  `;

  // Abrimos ventana emergente
  const ventanaImpresion = window.open('', 'PRINT', 'height=600,width=400');
  
  if (ventanaImpresion) {
    ventanaImpresion.document.write(ticketHtml);
    ventanaImpresion.document.close(); // Necesario para terminar carga
    ventanaImpresion.focus(); // Enfocar para asegurar impresión
  } else {
    alert("Por favor permite las ventanas emergentes (Pop-ups) para imprimir.");
  }
};