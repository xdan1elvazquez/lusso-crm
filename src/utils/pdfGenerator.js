import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateSalePDF = (sale, branchConfig, patient) => {
  const doc = new jsPDF();
  const branchName = branchConfig?.name || "Lusso Optometría";
  const primaryColor = branchConfig?.colors?.primary?.includes("blue") ? [23, 37, 84] : [50, 50, 50]; // Fallback simple de color

  // --- HEADER ---
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor); // Usar color de la sucursal si es posible parsearlo, o negro
  doc.text(branchName, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Folio Venta: ${sale.id.slice(0, 8).toUpperCase()}`, 14, 28);
  doc.text(`Fecha: ${new Date(sale.createdAt).toLocaleDateString()}`, 14, 33);

  // --- DATOS CLIENTE ---
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Datos del Paciente:", 14, 45);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`${patient.firstName} ${patient.lastName}`, 14, 51);
  if (patient.phone) doc.text(`Tel: ${patient.phone}`, 14, 56);

  // --- TABLA DE PRODUCTOS ---
  const itemsBody = sale.items.map(item => [
    item.description || "Producto",
    item.qty,
    `$${Number(item.unitPrice).toFixed(2)}`,
    `$${(item.qty * item.unitPrice).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 65,
    head: [['Descripción', 'Cant', 'Precio Unit.', 'Importe']],
    body: itemsBody,
    theme: 'grid',
    headStyles: { fillColor: primaryColor },
    styles: { fontSize: 9 },
  });

  // --- TOTALES Y PAGOS ---
  let finalY = doc.lastAutoTable.finalY + 10;
  
  // Resumen financiero
  doc.setFontSize(10);
  doc.text(`Subtotal: $${Number(sale.subtotalGross || sale.total).toFixed(2)}`, 140, finalY);
  doc.text(`Total Venta: $${Number(sale.total).toFixed(2)}`, 140, finalY + 5);
  
  // Calcular pagado
  const totalPaid = (sale.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
  const balance = sale.total - totalPaid;

  doc.setFont(undefined, 'bold');
  doc.text(`Abonado: $${totalPaid.toFixed(2)}`, 140, finalY + 12);
  
  if (balance > 0.01) {
    doc.setTextColor(200, 0, 0); // Rojo para deuda
    doc.text(`Restante: $${balance.toFixed(2)}`, 140, finalY + 17);
  } else {
    doc.setTextColor(0, 150, 0); // Verde para pagado
    doc.text(`Estado: PAGADO`, 140, finalY + 17);
  }

  // --- PIE DE PAGINA ---
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Este documento es un comprobante simplificado.", 14, 280);
  
  // Descargar
  doc.save(`Ticket_Lusso_${sale.id.slice(0,6)}.pdf`);
};