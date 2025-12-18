import { db } from "@/firebase/config";
import { 
  collection, addDoc, updateDoc, doc, query, where, orderBy, getDocs, arrayUnion 
} from "firebase/firestore";

const COLLECTION = "internal_tickets";

export const TICKET_PRIORITIES = {
    LOW: "Baja",
    MEDIUM: "Media",
    HIGH: "Alta",
    URGENT: "URGENTE 🚨"
};

export const TICKET_STATUS = {
    OPEN: "Abierto",
    IN_PROGRESS: "En Proceso",
    RESOLVED: "Resuelto",
    CLOSED: "Cerrado"
};

// Crear Ticket
export async function createTicket(data) {
    const newTicket = {
        title: data.title,
        description: data.description,
        priority: data.priority || "MEDIUM",
        status: "OPEN",
        
        // Origen
        createdBy: data.createdBy, // { uid, name, email }
        fromBranchId: data.fromBranchId,
        
        // Destino
        targetBranchId: data.targetBranchId || "ALL",
        
        // Asignación
        assignedTo: data.assignedTo || null, // { uid, name, email }
        
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    return await addDoc(collection(db, COLLECTION), newTicket);
}

// Obtener Tickets (Visibilidad Abierta por Sucursal)
export async function getTickets(branchId, userEmail) {
    // 1. Tickets dirigidos a mi sucursal (o globales)
    // Se eliminó la restricción de rol. Si trabajas en la sucursal, ves los tickets de la sucursal.
    const qReceived = query(
        collection(db, COLLECTION),
        where("targetBranchId", "in", [branchId, "ALL"]),
        orderBy("createdAt", "desc")
    );

    // 2. Tickets que YO envié a otras sucursales
    const qSent = query(
        collection(db, COLLECTION),
        where("createdBy.email", "==", userEmail),
        orderBy("createdAt", "desc")
    );

    const [snapRec, snapSent] = await Promise.all([getDocs(qReceived), getDocs(qSent)]);
    
    const all = new Map();
    
    // Unificar listas
    snapRec.docs.forEach(d => all.set(d.id, { id: d.id, ...d.data() }));
    snapSent.docs.forEach(d => all.set(d.id, { id: d.id, ...d.data() }));

    // Convertir a array y reordenar por fecha
    return Array.from(all.values()).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Agregar Comentario
export async function addTicketComment(ticketId, user, text) {
    const ref = doc(db, COLLECTION, ticketId);
    const comment = {
        user: { name: user.name, email: user.email },
        text,
        date: new Date().toISOString()
    };
    
    await updateDoc(ref, {
        comments: arrayUnion(comment),
        updatedAt: new Date().toISOString()
    });
}

// Cambiar Estado
export async function updateTicketStatus(ticketId, status) {
    const ref = doc(db, COLLECTION, ticketId);
    await updateDoc(ref, { 
        status, 
        updatedAt: new Date().toISOString() 
    });
}