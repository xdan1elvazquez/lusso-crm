import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNotify } from "@/context/UIContext";
import { 
    subscribeToTickets, createTicket, addTicketComment, updateTicketStatus,
    TICKET_PRIORITIES, TICKET_STATUS 
} from "@/services/ticketsStorage";
import { getEmployees } from "@/services/employeesStorage"; 
import { BRANCHES_CONFIG } from "@/utils/branchesConfig";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ModalWrapper from "@/components/ui/ModalWrapper";
import LoadingState from "@/components/LoadingState";

// --- HELPER DE NOTIFICACIONES ---
const sendBrowserNotification = (title, body) => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/vite.svg" }); // Puedes cambiar el icono
    }
};

export default function TicketsPage() {
    const { user, userData, currentBranch } = useAuth();
    const notify = useNotify();
    
    const [tickets, setTickets] = useState([]);
    const [employees, setEmployees] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL"); 
    
    // Referencias para detectar cambios y no notificar en la primera carga
    const prevTicketsRef = useRef([]);
    const isFirstLoad = useRef(true);

    // Modales
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTicket, setNewTicket] = useState({ 
        title: "", description: "", priority: "MEDIUM", targetBranchId: "ALL", assignedToId: "" 
    });

    const [selectedTicket, setSelectedTicket] = useState(null);
    const [commentText, setCommentText] = useState("");

    // 1. PEDIR PERMISO DE NOTIFICACIONES AL MONTAR
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // 2. EFECTO DE CARGA Y SUSCRIPCIÓN CON NOTIFICACIONES
    useEffect(() => {
        setLoading(true);
        isFirstLoad.current = true; // Reset al cambiar sucursal
        
        getEmployees().then(setEmployees).catch(console.error);

        const unsubscribe = subscribeToTickets(currentBranch.id, user.email, (updatedTickets) => {
            // --- LÓGICA DE NOTIFICACIÓN ---
            if (!isFirstLoad.current) {
                // Comparamos con la referencia anterior
                updatedTickets.forEach(newT => {
                    const oldT = prevTicketsRef.current.find(t => t.id === newT.id);

                    // CASO A: Ticket Nuevo que no fui yo
                    if (!oldT && newT.createdBy.email !== user.email) {
                        sendBrowserNotification("🎫 Nuevo Ticket Asignado", `${newT.title} - De: ${newT.createdBy.name}`);
                        const audio = new Audio('/notification.mp3'); // Opcional si tienes sonido
                        audio.play().catch(e => {}); 
                    }

                    // CASO B: Nuevo Comentario (que no sea mío)
                    if (oldT && newT.comments.length > oldT.comments.length) {
                        const lastComment = newT.comments[newT.comments.length - 1];
                        if (lastComment.user.email !== user.email) {
                            sendBrowserNotification("💬 Nueva Respuesta", `${lastComment.user.name} comentó en: ${newT.title}`);
                        }
                    }

                    // CASO C: Cambio de Estado
                    if (oldT && newT.status !== oldT.status && newT.status === "RESOLVED") {
                         sendBrowserNotification("✅ Ticket Resuelto", `El ticket "${newT.title}" ha sido marcado como resuelto.`);
                    }
                });
            } else {
                isFirstLoad.current = false;
            }

            // Actualizamos Estado y Referencia
            prevTicketsRef.current = updatedTickets;
            setTickets(updatedTickets);
            setLoading(false);
            
            // Refrescar modal si está abierto
            if (selectedTicket) {
                const found = updatedTickets.find(t => t.id === selectedTicket.id);
                if (found) setSelectedTicket(found);
            }
        });

        return () => unsubscribe();
    }, [currentBranch, user.email]);

    // Update selected ticket in real time
    useEffect(() => {
        if (selectedTicket) {
            const fresh = tickets.find(t => t.id === selectedTicket.id);
            if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedTicket)) {
                setSelectedTicket(fresh);
            }
        }
    }, [tickets]);


    // --- FILTROS Y HANDLERS (Igual que antes) ---
    const targetEmployees = useMemo(() => {
        if (newTicket.targetBranchId === "ALL") return [];
        return employees.filter(e => {
            const isActive = e.isActive !== false;
            const empBranch = e.branchId || "lusso_main";
            return isActive && empBranch === newTicket.targetBranchId;
        });
    }, [newTicket.targetBranchId, employees]);

    const handleCreate = async () => {
        if (!newTicket.title || !newTicket.description) return notify.info("Título y descripción requeridos");
        try {
            let assignedUser = null;
            if (newTicket.assignedToId) {
                const emp = employees.find(e => e.id === newTicket.assignedToId);
                if (emp) assignedUser = { uid: emp.id, name: emp.name, email: emp.email };
            }

            await createTicket({
                ...newTicket,
                createdBy: { uid: user.uid, name: userData.name, email: user.email },
                fromBranchId: currentBranch.id,
                assignedTo: assignedUser
            });

            setIsCreateOpen(false);
            setNewTicket({ title: "", description: "", priority: "MEDIUM", targetBranchId: "ALL", assignedToId: "" });
            notify.success("Ticket creado");
        } catch (e) { notify.error("Error al crear ticket"); }
    };

    const handleSendComment = async () => {
        if (!commentText.trim()) return;
        try {
            await addTicketComment(selectedTicket.id, userData, commentText);
            setCommentText("");
        } catch (e) { notify.error("Error enviando mensaje"); }
    };

    const handleChangeStatus = async (newStatus) => {
        try {
            await updateTicketStatus(selectedTicket.id, newStatus);
            notify.success(`Estado: ${newStatus}`);
        } catch (e) { notify.error("Error actualizando estado"); }
    };

    // --- RENDER HELPERS ---
    const getPriorityBadge = (p) => {
        const colors = { LOW: "gray", MEDIUM: "blue", HIGH: "orange", URGENT: "red" };
        return <Badge color={colors[p] || "gray"}>{TICKET_PRIORITIES[p]}</Badge>;
    };

    const getStatusColor = (s) => {
        if (s === "OPEN") return "border-l-4 border-l-blue-500";
        if (s === "IN_PROGRESS") return "border-l-4 border-l-yellow-500";
        if (s === "RESOLVED") return "border-l-4 border-l-emerald-500";
        return "border-l-4 border-l-gray-500";
    };

    const filteredTickets = tickets.filter(t => {
        if (filter === "OPEN") return t.status === "OPEN" || t.status === "IN_PROGRESS";
        if (filter === "RESOLVED") return t.status === "RESOLVED" || t.status === "CLOSED";
        return true;
    });

    if (loading && tickets.length === 0) return <LoadingState />;

    return (
        <div className="page-container space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Mesa de Ayuda</h1>
                    <p className="text-textMuted text-sm">Soporte en Tiempo Real ⚡</p>
                </div>
                <div className="flex gap-2">
                    {/* Botón para forzar permisos si el navegador los bloqueó al inicio */}
                    {Notification.permission === "default" && (
                        <Button variant="secondary" onClick={() => Notification.requestPermission()}>
                            🔔 Activar Alertas
                        </Button>
                    )}
                    <Button onClick={() => setIsCreateOpen(true)}>+ Nuevo Ticket</Button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="flex gap-2">
                {["ALL", "OPEN", "RESOLVED"].map(f => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${filter === f ? "bg-primary text-white" : "bg-surfaceHighlight text-textMuted hover:text-white"}`}
                    >
                        {f === "ALL" ? "Todos" : f === "OPEN" ? "Abiertos" : "Resueltos"}
                    </button>
                ))}
            </div>

            {/* LISTA */}
            <div className="grid grid-cols-1 gap-3 animate-fadeIn">
                {filteredTickets.length === 0 && <div className="text-center py-10 text-textMuted">No hay tickets visibles.</div>}
                
                {filteredTickets.map(ticket => {
                    const isAssignedToMe = ticket.assignedTo?.email === user.email;
                    return (
                        <div 
                            key={ticket.id} 
                            onClick={() => setSelectedTicket(ticket)}
                            className={`bg-surface p-4 rounded-xl cursor-pointer hover:bg-surfaceHighlight transition-colors border ${isAssignedToMe ? 'border-primary ring-1 ring-primary/50' : 'border-border'} ${getStatusColor(ticket.status)}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                    {isAssignedToMe && <span title="Asignado a mí">👉</span>}
                                    {ticket.title}
                                </h3>
                                <div className="flex gap-2">
                                    {getPriorityBadge(ticket.priority)}
                                    <Badge color="gray" className="text-[10px]">{new Date(ticket.createdAt).toLocaleDateString()}</Badge>
                                </div>
                            </div>
                            <p className="text-sm text-textMuted line-clamp-2 mb-3">{ticket.description}</p>
                            <div className="flex justify-between items-center text-xs text-textMuted">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                    <span className="flex items-center gap-1">👤 De: {ticket.createdBy.name}</span>
                                    <span className="flex items-center gap-1 text-blue-300">
                                        ➡️ {ticket.targetBranchId === "ALL" ? "Global" : BRANCHES_CONFIG[ticket.targetBranchId]?.name}
                                        {ticket.assignedTo && <span className="text-emerald-400 ml-1 font-bold">(@{ticket.assignedTo.name})</span>}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    💬 {ticket.comments?.length || 0}
                                    <span className={`px-2 py-0.5 rounded ml-2 ${ticket.status==="RESOLVED"?"bg-emerald-500/20 text-emerald-400":"bg-blue-500/20 text-blue-400"}`}>
                                        {TICKET_STATUS[ticket.status]}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODAL CREAR */}
            {isCreateOpen && (
                <ModalWrapper title="Nuevo Ticket" onClose={() => setIsCreateOpen(false)}>
                    <div className="space-y-4">
                        <Input label="Asunto" value={newTicket.title} onChange={e => setNewTicket({...newTicket, title: e.target.value})} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select label="Prioridad" value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value})}>
                                {Object.entries(TICKET_PRIORITIES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                            </Select>
                            <Select label="Destino" value={newTicket.targetBranchId} onChange={e => setNewTicket({...newTicket, targetBranchId: e.target.value, assignedToId: ""})}>
                                <option value="ALL">🏢 General / Todas</option>
                                {Object.values(BRANCHES_CONFIG).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </Select>
                        </div>
                        {newTicket.targetBranchId !== "ALL" && (
                            <div className="bg-surfaceHighlight/30 p-3 rounded-lg border border-border/50">
                                <label className="block text-xs font-bold text-textMuted mb-1">Asignar a Empleado</label>
                                <select 
                                    className="w-full bg-background border border-border rounded-lg p-2 text-sm text-white focus:border-primary outline-none"
                                    value={newTicket.assignedToId}
                                    onChange={e => setNewTicket({...newTicket, assignedToId: e.target.value})}
                                >
                                    <option value="">-- Cualquiera --</option>
                                    {targetEmployees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <textarea 
                            className="w-full bg-background border border-border rounded-lg p-3 text-sm text-white"
                            rows={4} value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                            placeholder="Descripción..."
                        />
                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreate}>Crear</Button>
                        </div>
                    </div>
                </ModalWrapper>
            )}

            {/* MODAL CHAT */}
            {selectedTicket && (
                <ModalWrapper title="Chat del Ticket" onClose={() => setSelectedTicket(null)} maxWidth="max-w-3xl">
                    <div className="flex flex-col h-[70vh]">
                        {/* HEADER */}
                        <div className="bg-surfaceHighlight/20 p-4 rounded-lg mb-4 border border-border">
                            <div className="flex justify-between items-start">
                                <h2 className="text-xl font-bold text-white mb-1">{selectedTicket.title}</h2>
                                {getPriorityBadge(selectedTicket.priority)}
                            </div>
                            <p className="text-sm text-slate-300 mb-3">{selectedTicket.description}</p>
                            <div className="mt-2 flex gap-2">
                                {Object.keys(TICKET_STATUS).map(statusKey => (
                                    <button 
                                        key={statusKey} onClick={() => handleChangeStatus(statusKey)}
                                        className={`px-3 py-1 rounded text-xs border transition-colors ${selectedTicket.status === statusKey ? "bg-white text-black font-bold" : "border-border text-textMuted"}`}
                                    >
                                        {TICKET_STATUS[statusKey]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* MENSAJES */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 p-2 bg-black/20 rounded-lg mb-4">
                            {selectedTicket.comments?.map((c, i) => {
                                const isMe = c.user.email === user.email;
                                return (
                                    <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                        <div className={`max-w-[80%] rounded-lg p-3 text-sm ${isMe ? "bg-blue-600 text-white" : "bg-surfaceHighlight text-slate-200"}`}>
                                            {!isMe && <div className="text-[10px] text-blue-300 font-bold mb-1">{c.user.name}</div>}
                                            {c.text}
                                        </div>
                                        <span className="text-[9px] text-textMuted mt-1">{new Date(c.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                );
                            })}
                            <div id="chat-end" />
                        </div>

                        {/* INPUT */}
                        <div className="flex gap-2 items-end">
                            <textarea 
                                value={commentText} onChange={e => setCommentText(e.target.value)}
                                placeholder="Escribe..."
                                className="flex-1 bg-surface border border-border rounded-lg p-2 text-sm text-white h-12"
                                onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                            />
                            <Button onClick={handleSendComment} className="h-12 px-6">Enviar</Button>
                        </div>
                    </div>
                </ModalWrapper>
            )}
        </div>
    );
}