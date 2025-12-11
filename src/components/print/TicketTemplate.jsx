import React from 'react';

// Eliminamos props por ahora para probar
const TicketTemplate = () => {
  
  // DATOS FALSOS PARA PRUEBA DE IMPRESIÓN
  const dummySale = {
    id: "PRUEBA-123",
    patientName: "JUAN PEREZ (PRUEBA)",
    total: 1500.00,
    items: [
      { qty: 1, description: "Lente Prueba", unitPrice: 500 },
      { qty: 1, description: "Armazón Rayban", unitPrice: 1000 }
    ]
  };

  return (
    <div 
      id="printable-ticket" 
      // CAMBIO: Quitamos "hidden" o "off-screen" temporalmente.
      // Quiero que veas el ticket al final de tu página web.
      className="block" 
      style={{ 
        width: '58mm', // Ancho fijo para simular papel
        padding: '5px', 
        fontFamily: 'monospace', 
        fontSize: '11px', 
        color: 'black', 
        background: 'white',
        border: '1px solid red' // Borde rojo para que lo ubiques en pantalla
      }}
    >
      
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>LUSSO VISUAL</h2>
        <div style={{ fontSize: '10px' }}>Ticket de Prueba</div>
        <div style={{ marginTop: '5px' }}>{new Date().toLocaleString()}</div>
      </div>

      <hr style={{ borderTop: '1px dashed black', margin: '5px 0' }} />

      {/* ITEMS DE PRUEBA */}
      {dummySale.items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
          <span>{item.qty} x {item.description}</span>
          <span>${item.unitPrice}</span>
        </div>
      ))}

      <hr style={{ borderTop: '1px dashed black', margin: '10px 0' }} />

      {/* TOTAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
        <span>TOTAL:</span>
        <span>${dummySale.total}</span>
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '20px', fontWeight: 'bold' }}>
        SI PUEDES LEER ESTO,<br/>LA IMPRESIÓN FUNCIONA.
      </div>

    </div>
  );
};

export default TicketTemplate;