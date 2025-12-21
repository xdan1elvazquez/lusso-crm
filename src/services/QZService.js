import qz from 'qz-tray';
import { sha256 } from 'js-sha256';

// Configuración de seguridad para QZ Tray
qz.api.setSha256Type(function(data) { return sha256(data); });

// --- CONEXIÓN ---
export const connectQZ = async () => {
    if (!qz.websocket.isActive()) {
        try { 
            await qz.websocket.connect(); 
        } catch (e) { 
            console.error("Error conectando a QZ Tray:", e); 
            throw e; 
        }
    }
};

// --- HELPER: BUSCAR IMPRESORA TÉRMICA ---
const findThermalPrinter = async () => {
    const printers = await qz.printers.find();
    // Ajusta estos nombres según cómo se llame tu impresora en el sistema
    const myPrinter = printers.find(p => 
        p.includes("WL88S") || 
        p.includes("POS") || 
        p.includes("Epson") || 
        p.includes("Generic") ||
        p.includes("T88")
    );
    if (!myPrinter) throw new Error("No se encontró impresora térmica compatible.");
    return myPrinter;
};

// --- HELPER: ENCABEZADO FISCAL (Común para todos los tickets de cliente) ---
const getFiscalHeader = (branchConfig) => {
    const fiscal = branchConfig?.fiscalData || {};
    const commercialName = branchConfig?.name || "LUSSO VISUAL";
    
    return [
        '\x1B\x40',     // Inicializar
        '\x1B\x61\x01', // Centrar
        
        // 1. Nombre Comercial (Grande)
        '\x1B\x21\x30', 
        `${commercialName}\n`,
        
        // 2. Datos Fiscales (Normal)
        '\x1B\x21\x00', 
        fiscal.taxName ? `${fiscal.taxName}\n` : '',
        fiscal.rfc ? `RFC: ${fiscal.rfc}\n` : '',
        fiscal.taxRegime ? `${fiscal.taxRegime}\n` : '',
        
        // 3. Dirección
        fiscal.address ? `${fiscal.address}\n` : '',
        (fiscal.city || fiscal.cp) ? `CP: ${fiscal.cp || ""} ${fiscal.city || ""}\n` : '',
        fiscal.phone ? `Tel: ${fiscal.phone}\n` : '',
        
        `${new Date().toLocaleString()}\n`,
        '--------------------------------\n'
    ];
};

// =========================================================
// 1. TICKET DE VENTA ESTÁNDAR (Gotas, Accesorios, Varios)
// =========================================================
export const printTicketQZ = async (ticketData, branchConfig) => {
    try {
        await connectQZ();
        const myPrinter = await findThermalPrinter();
        const config = qz.configs.create(myPrinter);

        const header = getFiscalHeader(branchConfig);
        
        const body = [
            '\x1B\x61\x00', // Alineación Izquierda
            `Cliente: ${ticketData.patientName || "Mostrador"}\n`,
            `Folio:   ${ticketData.id ? ticketData.id.slice(0,8).toUpperCase() : "---"}\n`,
            '--------------------------------\n',
            'CANT  DESCRIPCION       IMPORTE\n',
        ];

        // Productos
        if (ticketData.items) {
            ticketData.items.forEach(item => {
               const qty = (item.qty || 1).toString().padEnd(3); 
               const priceVal = (item.qty || 1) * (item.unitPrice || 0);
               const price = `$${priceVal.toFixed(2)}`.padStart(9);
               const desc = (item.description || "Item").substring(0, 18).padEnd(19); 
               body.push(`${qty} ${desc} ${price}\n`);
            });
        }

        const footer = [
            '--------------------------------\n',
            '\x1B\x61\x02', // Derecha
            `TOTAL: $${parseFloat(ticketData.total || 0).toFixed(2)}\n`,
            
            '\x1B\x61\x01', // Centro
            '\n',
            '¡Gracias por su compra!\n',
            'No cambios en micas graduadas\n',
            '\n\n\n\n', 
            '\x1D\x56\x42\x00' // Corte Parcial
        ];

        const data = [...header, ...body, ...footer];
        await qz.print(config, data);
        return true;

    } catch (err) {
        console.error("Fallo QZ Ticket Estándar:", err);
        throw err; 
    }
};

// =========================================================
// 2. TICKET PREMIUM ÓPTICO (Lentes con RX y Garantías)
// =========================================================
export const printOpticalTicketQZ = async (saleData, branchConfig) => {
    try {
        await connectQZ();
        const myPrinter = await findThermalPrinter();
        const config = qz.configs.create(myPrinter);

        // A. Preparar RX (Buscamos primer lente)
        const lensItem = saleData.items.find(i => i.kind === 'LENSES' || i.kind === 'CONTACT_LENS');
        const rx = lensItem?.rxSnapshot || {};
        const safeRx = {
            od: rx.od || rx.right || {},
            oi: rx.oi || rx.os || rx.left || {}
        };

        const header = getFiscalHeader(branchConfig);

        const data = [
            ...header,
            
            // Datos Paciente
            '\x1B\x61\x00', // Izquierda
            `PACIENTE: ${saleData.patientName.substring(0, 30)}\n`,
            `FOLIO:    ${saleData.id.slice(0, 8).toUpperCase()}\n`,
            `ATENDIO:  ${saleData.soldBy || "Staff"}\n`,
            '--------------------------------\n',

            // SECCIÓN RX (Estilo Invertido)
            '\x1B\x61\x01', // Centro
            '\x1D\x42\x01', // INVERSE ON
            '   GRADUACION FINAL (RX)    \n', 
            '\x1D\x42\x00', // INVERSE OFF
            '\x1B\x61\x00', // Izquierda
            
            // Tabla RX
            'OJO  ESF    CIL    EJE   ADIC\n',
            '--------------------------------\n'
        ];

        const fNum = (n) => (n || "0.00").toString().padEnd(7);
        const fAx = (n) => (n || "0").toString().padEnd(6);

        data.push(`OD   ${fNum(safeRx.od.sph)}${fNum(safeRx.od.cyl)}${fAx(safeRx.od.axis)}${fNum(safeRx.od.add)}\n`);
        data.push(`OI   ${fNum(safeRx.oi.sph)}${fNum(safeRx.oi.cyl)}${fAx(safeRx.oi.axis)}${fNum(safeRx.oi.add)}\n`);
        
        if (lensItem) {
            data.push(`\n`);
            // data.push(`TIPO: ${lensItem.specs?.design || "Monofocal"}\n`); // Opcional
            data.push(`MAT:  ${lensItem.specs?.material || "CR-39"}\n`);
            if(lensItem.specs?.treatment) data.push(`TRAT: ${lensItem.specs.treatment}\n`);
        }
        
        data.push('--------------------------------\n');

        // Detalle de Compra
        data.push('\x1B\x61\x01'); // Centro
        data.push('\x1D\x42\x01', '      DETALLE DE COMPRA     \n', '\x1D\x42\x00');
        data.push('\x1B\x61\x00'); // Izquierda

        saleData.items.forEach(item => {
            const qty = item.qty || 1;
            let desc = item.description;
            // Simplificamos nombres largos para que quepan
            if (item.kind === 'FRAMES') desc = `ARMAZON: ${item.description}`;
            if (item.kind === 'LENSES') desc = `MICAS OFTALMICAS`;
            
            const price = `$${(qty * item.unitPrice).toFixed(2)}`;
            
            data.push('\x1B\x45\x01'); // Bold ON
            data.push(`${qty} x ${desc.substring(0, 25)}\n`);
            data.push('\x1B\x45\x00'); // Bold OFF
            
            data.push('\x1B\x61\x02'); // Derecha
            data.push(`${price}\n`);
            data.push('\x1B\x61\x00'); // Izquierda
        });

        data.push('--------------------------------\n');

        // Estado de Cuenta
        const total = saleData.total || 0;
        const pagado = saleData.paidAmount || 0;
        const saldo = saleData.balance || 0;

        data.push('\x1B\x61\x02'); // Derecha
        data.push(`TOTAL:      $${total.toFixed(2)}\n`);
        data.push(`A CUENTA:   $${pagado.toFixed(2)}\n`);
        
        // Saldo resaltado
        data.push('\x1B\x45\x01'); // Bold ON
        data.push('\x1D\x21\x11'); // Doble Alto
        data.push(`RESTA:  $${saldo.toFixed(2)}\n`);
        data.push('\x1D\x21\x00'); // Normal
        data.push('\x1B\x45\x00'); // Bold OFF
        
        data.push('--------------------------------\n');

        // Garantías
        data.push('\x1B\x61\x01'); // Centro
        data.push('GARANTIA DE ADAPTACION:\n');
        data.push('30 dias naturales en graduacion.\n');
        data.push('Defectos de fabrica armazon: 90 dias.\n');
        data.push('No aplica en rayaduras o mal uso.\n');
        data.push('\n');
        data.push('¡Gracias por confiarnos su vision!\n');
        
        data.push('\n\n\n\n'); 
        data.push('\x1D\x56\x42\x00'); // Corte

        await qz.print(config, data);
        return true;

    } catch (err) {
        console.error("Error Optical Ticket:", err);
        throw err;
    }
};

// =========================================================
// 3. ORDEN DE TALLER / LABORATORIO (Interno)
// =========================================================
export const printWorkOrderQZ = async (workOrderData, branchConfig) => {
    try {
        await connectQZ();
        const myPrinter = await findThermalPrinter();
        const config = qz.configs.create(myPrinter);
        
        const { patientName, boxNumber, rx, lens, frame, id } = workOrderData;
        const commercialName = branchConfig?.name || "LUSSO VISUAL";

        const data = [
            '\x1B\x40', 
            '\x1B\x61\x01', // Centro
            '\x1B\x21\x30', // Grande
            'ORDEN DE TRABAJO\n',
            '\x1B\x21\x00', // Normal
            `${commercialName}\n`,
            `${new Date().toLocaleString()}\n`,
            '--------------------------------\n',
            
            '\x1B\x61\x00', // Izquierda
            '\x1B\x45\x01', // Bold ON
            `PACIENTE: ${patientName.substring(0, 20)}\n`,
            `CAJA: #${boxNumber || "S/N"}\n`, 
            `FOLIO: ${id.slice(0,8)}\n`,
            '\x1B\x45\x00', // Bold OFF
            '--------------------------------\n',

            '\x1B\x61\x01', // Centro
            'RX FINAL\n',
            '\x1B\x61\x00', // Izquierda
            'EYE  SPH    CYL    EJE   ADD\n',
        ];

        const fmt = (val) => (val || "0.00").toString().padEnd(7);
        const fmtAxis = (val) => (val || "0").toString().padEnd(5);

        if (rx.od) data.push(`OD   ${fmt(rx.od.sph)}${fmt(rx.od.cyl)}${fmtAxis(rx.od.axis)}${fmt(rx.od.add)}\n`);
        if (rx.oi) data.push(`OI   ${fmt(rx.oi.sph)}${fmt(rx.oi.cyl)}${fmtAxis(rx.oi.axis)}${fmt(rx.oi.add)}\n`);

        data.push(`\nDIP LEJOS: ${rx.dip || "--"} mm\n`);
        data.push('--------------------------------\n');

        data.push('\x1B\x45\x01'); 
        data.push('LENTE / MICA:\n');
        data.push('\x1B\x45\x00'); 
        data.push(`DISENO:   ${lens.design || "Monofocal"}\n`);
        data.push(`MATERIAL: ${lens.material || "CR-39"}\n`);
        data.push(`TRATAM:   ${lens.treatment || "N/A"}\n`);
        data.push('--------------------------------\n');

        data.push('\x1B\x45\x01'); 
        data.push('ARMAZON:\n');
        data.push('\x1B\x45\x00'); 
        if (frame) {
            data.push(`MODELO: ${frame.description || "Propio"}\n`);
        } else {
            data.push('ARMAZON PROPIO DEL CLIENTE\n');
        }

        data.push('\n\n\n\n'); 
        data.push('\x1D\x56\x42\x00');

        await qz.print(config, data);
        return true;
    } catch (err) {
        console.error("Error WorkOrder:", err);
        throw err;
    }
};

// =========================================================
// 4. IMPRESIÓN DE TICKET RAW (NUEVO: Para Cotizaciones)
// =========================================================
export const printRawTicketQZ = async (data) => {
    try {
        await connectQZ();
        const myPrinter = await findThermalPrinter();
        const config = qz.configs.create(myPrinter);
        await qz.print(config, data);
        return true;
    } catch (err) {
        console.error("Error Raw Ticket:", err);
        throw err;
    }
};