import qz from 'qz-tray';
import { sha256 } from 'js-sha256'; // O usa una librería de hash estándar si ya tienes

// Configuración de seguridad (Necesaria para quitar alertas molestas en producción,
// pero para pruebas locales la versión gratis te pedirá permiso una vez).
qz.api.setSha256Type(function(data) {
    return sha256(data);
});

export const connectQZ = async () => {
    if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
    }
};

export const printTicketQZ = async (ticketData) => {
    try {
        await connectQZ();
        
        // 1. Busca la impresora automáticamente
        // Intenta encontrar la que tenga "WL88S", "POS", "Epson" o "88" en el nombre
        const printers = await qz.printers.find();
        const myPrinter = printers.find(p => p.includes("WL88S") || p.includes("POS") || p.includes("Epson"));
        
        if (!myPrinter) throw new Error("No se encontró la impresora térmica");

        const config = qz.configs.create(myPrinter);

        // 2. DISEÑO DEL TICKET (Comandos ESC/POS)
        // \x1B\x40 = Reset
        // \x1B\x61\x01 = Centrar
        // \x1B\x21\x08 = Negrita (Emphasized)
        // \x1B\x64\x02 = Saltar 2 líneas
        
        const data = [
            '\x1B\x40', // Init
            '\x1B\x61\x01', // Center
            '\x1B\x21\x30', // Double Height + Width (Título Grande)
            'LUSSO VISUAL\n',
            '\x1B\x21\x00', // Normal text
            'Optica & Consultorio\n',
            `${new Date().toLocaleString()}\n`,
            '\x1B\x61\x00', // Left align
            '--------------------------------\n',
            `Cliente: ${ticketData.patientName}\n`,
            `Folio:   ${ticketData.id}\n`,
            '--------------------------------\n',
            // Headers
            'CANT  DESCRIPCION       IMPORTE\n',
        ];

        // Productos
        ticketData.items.forEach(item => {
           // Truco para alinear columnas con espacios
           const qty = item.qty.toString().padEnd(4); // 4 espacios para cantidad
           const price = `$${(item.qty * item.unitPrice).toFixed(2)}`.padStart(9);
           // Recortamos descripción si es muy larga para que quepa
           const desc = item.description.substring(0, 16).padEnd(17); 
           
           data.push(`${qty} ${desc} ${price}\n`);
        });

        data.push('--------------------------------\n');
        
        // Totales
        data.push('\x1B\x61\x02'); // Right align
        data.push(`TOTAL: $${ticketData.total.toFixed(2)}\n`);
        data.push('\x1B\x61\x01'); // Center align
        data.push('\n');
        data.push('¡Gracias por su compra!\n');
        data.push('No cambios en micas graduadas\n');
        data.push('\n\n\n'); // Espacio final
        data.push('\x1D\x56\x42\x00'); // CUT PAPER (Corte total)
        
        // Opcional: Abrir cajón
        // data.push('\x1B\x70\x00\x19\xFA'); 

        // 3. ENVIAR A IMPRIMIR
        await qz.print(config, data);
        
        return true;

    } catch (err) {
        console.error("Error QZ:", err);
        throw err; // Lanzamos error para que el frontend sepa que falló
    }
};