// src/utils/TicketHelper.js

export const imprimirTicket = (venta) => {
  // 1. Configuramos el contenido HTML como texto puro.
  // Esto garantiza que NINGÚN estilo de tu dashboard interfiera.
  
  if (!venta) return;

  const branchName = "LUSSO VISUAL"; // O obtenlo de tu config
  const fecha = new Date().toLocaleString();
  const total = parseFloat(venta.total || 0).toFixed(2);
  
  // Generamos las filas de productos
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

  // Pagos
  const pagosHtml = (venta.payments || []).map(p => `
    <div style="display: flex; justify-content: space-between; font-size: 10px;">
       <span>${p.method}:</span>
       <span>$${parseFloat(p.amount).toFixed(2)}</span>
    </div>
  `).join('');

  // 2. Definimos el HTML completo del Ticket
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
            width: 58mm; /* Ancho estándar térmica */
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed black; margin: 5px 0; }
          .flex { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; border-bottom: 1px solid black; }
          
          /* Ocultar header/footer del navegador al imprimir */
          @media print {
            @page { margin: 0; size: auto; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 16px;">${branchName}</div>
        <div class="center" style="font-size: 10px;">Óptica & Consultorio</div>
        <div class="center" style="font-size: 10px; margin-top: 4px;">${fecha}</div>
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
          <p style="font-size: 9px;">No cambios en micas graduadas.</p>
        </div>
        
        <script>
          // Autoprint y cerrar
          window.onload = function() {
            window.print();
            // window.close(); // Descomenta esto si quieres que se cierre sola
          }
        </script>
      </body>
    </html>
  `;

  // 3. Abrimos una ventana emergente o iframe
  const ventanaImpresion = window.open('', 'PRINT', 'height=600,width=400');
  
  if (ventanaImpresion) {
    ventanaImpresion.document.write(ticketHtml);
    ventanaImpresion.document.close(); // Necesario para que termine de cargar
    ventanaImpresion.focus(); // Enfocar para asegurar que imprima
  } else {
    alert("Por favor permite las ventanas emergentes (Pop-ups) para imprimir.");
  }
};