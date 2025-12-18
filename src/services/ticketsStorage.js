import { db } from "@/firebase/config";
import { 
  collection, addDoc, updateDoc, doc, query, where, orderBy, onSnapshot, arrayUnion 
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

// Crear Ticket (Igual que antes)
export async function createTicket(data) {
    const newTicket = {
        title: data.title,
        description: data.description,
        priority: data.priority || "MEDIUM",
        status: "OPEN",
        
        createdBy: data.createdBy, 
        fromBranchId: data.fromBranchId,
        targetBranchId: data.targetBranchId || "ALL",
        assignedTo: data.assignedTo || null, 
        
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    return await addDoc(collection(db, COLLECTION), newTicket);
}

// 🟢 SUSCRIPCIÓN EN TIEMPO REAL
// En lugar de pedir los datos una vez, nos "suscribimos" a ellos.
export function subscribeToTickets(branchId, userEmail, onUpdate) {
    
    // 1. Tickets para mi sucursal
    const qReceived = query(
        collection(db, COLLECTION),
        where("targetBranchId", "in", [branchId, "ALL"]),
        orderBy("createdAt", "desc")
    );

    // 2. Tickets que yo envié
    const qSent = query(
        collection(db, COLLECTION),
        where("createdBy.email", "==", userEmail),
        orderBy("createdAt", "desc")
    );

    // Almacenamos los resultados en memoria para unirlos
    let receivedDocs = [];
    let sentDocs = [];

    // Función para mezclar y notificar
    const mergeAndNotify = () => {
        const all = new Map();
        receivedDocs.forEach(d => all.set(d.id, d));
        sentDocs.forEach(d => all.set(d.id, d));
        
        const sorted = Array.from(all.values()).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        onUpdate(sorted);
    };

    // Escuchamos ambos canales
    const unsubRec = onSnapshot(qReceived, (snap) => {
        receivedDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        mergeAndNotify();
    });

    const unsubSent = onSnapshot(qSent, (snap) => {
        sentDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        mergeAndNotify();
    });

    // Devolvemos una función para cancelar la suscripción cuando salgamos de la página
    return () => {
        unsubRec();
        unsubSent();
    };
}

// Agregar Comentario (Igual)
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

// Cambiar Estado (Igual)
export async function updateTicketStatus(ticketId, status) {
    const ref = doc(db, COLLECTION, ticketId);
    await updateDoc(ref, { 
        status, 
        updatedAt: new Date().toISOString() 
    });
}