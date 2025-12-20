import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ==========================================
// 1. GENERADOR DE TICKET DE VENTA (SERIALIZADO)
// ==========================================
export const generateSalePDF = (sale, branchConfig, patient) => {
  const doc = new jsPDF();
  
  // 1. INTENTAR DATOS FISCALES REALES (BD), SI NO, USAR CONFIG ESTÁTICA
  const fiscal = branchConfig?.fiscalData || {};
  
  // Nombre: Prioridad Fiscal > Nombre Comercial > Default
  const branchName = fiscal.taxName || branchConfig?.name || "Lusso Optometría";
  
  // Dirección: Construir desde datos fiscales si existen
  let fullAddress = branchConfig?.address || "";
  if (fiscal.address) {
      fullAddress = `${fiscal.address}${fiscal.city ? `, ${fiscal.city}` : ""}${fiscal.cp ? ` C.P. ${fiscal.cp}` : ""}`;
  }

  // Detección simple de color
  const isLusso = branchConfig?.id === "lusso_main" || branchConfig?.colors?.primary?.includes("blue") || branchConfig?.colors?.primary?.includes("#05");
  const primaryColor = isLusso ? [23, 37, 84] : [6, 78, 59]; 

  // --- HEADER ---
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor); 
  doc.text(branchName, 14, 20);
  
  // Dirección debajo del nombre
  if (fullAddress) {
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(fullAddress, 14, 25);
  }
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  
  // 🟢 FOLIO SERIALIZADO: Si existe 'folio', lo usa. Si no, usa el ID viejo (legacy support).
  const folioDisplay = sale.folio || sale.id.slice(0, 8).toUpperCase();
  doc.text(`Folio Venta: ${folioDisplay}`, 14, 33);
  doc.text(`Fecha: ${new Date(sale.createdAt).toLocaleDateString()}`, 14, 38);

  // --- DATOS CLIENTE ---
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Datos del Paciente:", 14, 50);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`${patient.firstName} ${patient.lastName}`, 14, 56);
  if (patient.phone) doc.text(`Tel: ${patient.phone}`, 14, 61);

  // --- TABLA DE PRODUCTOS ---
  const itemsBody = sale.items.map(item => [
    item.description || "Producto",
    item.qty,
    `$${Number(item.unitPrice).toFixed(2)}`,
    `$${(item.qty * item.unitPrice).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 70,
    head: [['Descripción', 'Cant', 'Precio Unit.', 'Importe']],
    body: itemsBody,
    theme: 'grid',
    headStyles: { fillColor: primaryColor },
    styles: { fontSize: 9 },
  });

  // --- TOTALES Y PAGOS ---
  let finalY = doc.lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.text(`Subtotal: $${Number(sale.subtotalGross || sale.total).toFixed(2)}`, 140, finalY);
  doc.text(`Total Venta: $${Number(sale.total).toFixed(2)}`, 140, finalY + 5);
  
  const totalPaid = (sale.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
  const balance = sale.total - totalPaid;

  doc.setFont(undefined, 'bold');
  doc.text(`Abonado: $${totalPaid.toFixed(2)}`, 140, finalY + 12);
  
  if (balance > 0.01) {
    doc.setTextColor(200, 0, 0); 
    doc.text(`Restante: $${balance.toFixed(2)}`, 140, finalY + 17);
  } else {
    doc.setTextColor(0, 150, 0); 
    doc.text(`Estado: PAGADO`, 140, finalY + 17);
  }

  // --- PIE DE PAGINA ---
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Este documento es un comprobante simplificado.", 14, 280);
  
  doc.save(`Ticket_${branchName.split(" ")[0]}_${folioDisplay}.pdf`);
};

// ==================================================
// 2. GENERADOR DE CONSENTIMIENTO INFORMADO (NOM-024)
// ==================================================
export const generateInformedConsentPDF = (patient, branchConfig) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // 1. OBTENER DATOS REALES (BD - fiscalData)
  const fiscal = branchConfig?.fiscalData || {};

  // Nombre
  const branchNameRaw = fiscal.taxName || branchConfig?.name || "CLÍNICA VISUAL";
  const branchName = branchNameRaw.toUpperCase();
  
  // Dirección
  let branchAddress = branchConfig?.address || "Ciudad de México";
  if (fiscal.address) {
      const parts = [
          fiscal.address,
          fiscal.city,
          fiscal.cp ? `C.P. ${fiscal.cp}` : null
      ].filter(Boolean);
      branchAddress = parts.join(", ");
  }

  // Ciudad corta
  const cityShort = fiscal.city || branchAddress.split(",")[0] || "Ciudad de México";

  // FECHA Y HORA ACTUAL
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-MX", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' });

  // --- 1. ENCABEZADO ---
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(branchName, margin, margin); 
  doc.setFontSize(8);
  doc.text(branchAddress, margin, margin + 5);

  doc.setFontSize(10);
  doc.text(`Expediente: ${patient.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, margin, { align: "right" });

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("CARTA DE CONSENTIMIENTO INFORMADO", pageWidth / 2, margin + 20, { align: "center" });
  doc.setFontSize(12);
  doc.text("PARA ATENCIÓN OPTOMÉTRICA GENERAL", pageWidth / 2, margin + 27, { align: "center" });

  // --- 2. DATOS DEL PACIENTE ---
  const startY = margin + 40;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  doc.text(`Lugar y Fecha: ${cityShort}, a ${dateStr}. Hora: ${timeStr}.`, margin, startY);
  
  doc.setFont("helvetica", "bold");
  doc.text("PACIENTE:", margin, startY + 10);
  doc.setFont("helvetica", "normal");
  doc.text(`${patient.firstName} ${patient.lastName}`, margin + 25, startY + 10);

  doc.setFont("helvetica", "bold");
  doc.text("CURP:", margin, startY + 18);
  doc.setFont("helvetica", "normal");
  const curpText = patient.curp || "_________________________ (Por llenar)";
  doc.text(curpText, margin + 25, startY + 18);

  doc.setFont("helvetica", "bold");
  doc.text("EDAD:", pageWidth - margin - 40, startY + 18);
  doc.setFont("helvetica", "normal");
  
  let age = "N/D";
  if (patient.dob) {
      const diff = Date.now() - new Date(patient.dob).getTime();
      const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      age = years + " años";
  }
  doc.text(age, pageWidth - margin - 25, startY + 18);

  // --- 3. CUERPO LEGAL ---
  const bodyY = startY + 30;
  doc.setFontSize(10);
  
  const textLines = [
      "YO, EL PACIENTE (o responsable legal, en caso de menores de edad):",
      "",
      `1. AUTORIZACIÓN DE EXPLORACIÓN: Autorizo al personal clínico de ${branchName}, así como a su equipo técnico, auxiliar y en formación bajo supervisión, para realizar el interrogatorio clínico (historia clínica), exámenes de agudeza visual, refracción, tonometría y exploración física del ojo necesarias para mi diagnóstico. Entiendo que la atención es brindada por el equipo profesional de esta institución.`,
      "",
      "2. NATURALEZA NO INVASIVA: Entiendo que estos procedimientos son de carácter CLÍNICO Y DIAGNÓSTICO, no quirúrgicos. Su objetivo es evaluar mi salud visual y determinar la corrección óptica o tratamiento necesario.",
      "",
      "3. USO DE FÁRMACOS (Si aplica): Comprendo que, de ser necesario para un mejor diagnóstico, se me podrían aplicar gotas oftálmicas (anestesia o dilatadores). Se me ha explicado que los dilatadores causan visión borrosa y sensibilidad a la luz por unas horas, por lo que se me recomienda no conducir inmediatamente después.",
      "",
      "4. VERACIDAD: Declaro que los datos proporcionados sobre mis antecedentes médicos y alergias son verdaderos, eximiendo a la institución de responsabilidad por omisiones de mi parte.",
      "",
      "5. PRIVACIDAD: Autorizo el tratamiento de mis datos personales (incluyendo mi CURP y expediente clínico) conforme a la NOM-024-SSA3-2010, exclusivamente para fines de atención médica."
  ];

  let currentY = bodyY;
  textLines.forEach(line => {
      if (line === "") {
          currentY += 5;
      } else {
          const splitText = doc.splitTextToSize(line, contentWidth);
          doc.text(splitText, margin, currentY);
          currentY += (splitText.length * 5) + 2; 
      }
  });

  // --- 4. FIRMAS ---
  const signatureY = pageHeight - 50;
  const centerX = pageWidth / 2;
  const lineLength = 80;
  
  doc.line(centerX - (lineLength/2), signatureY, centerX + (lineLength/2), signatureY); 
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("FIRMA DE CONFORMIDAD DEL PACIENTE", centerX, signatureY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(patient.curp || "CURP: __________________", centerX, signatureY + 12, { align: "center" });

  // PIE DE PÁGINA
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`${branchName} - ${branchAddress}`, centerX, pageHeight - 10, { align: "center" });

  doc.autoPrint();
  const blob = doc.output("bloburl");
  window.open(blob, "_blank");
};