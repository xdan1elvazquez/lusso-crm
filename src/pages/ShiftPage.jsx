import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // 👈 1. Importar Auth
import { getCurrentShift, getShiftInProcess, openShift, preCloseShift, closeShift, getAllShifts } from "@/services/shiftsStorage";
import { getSalesMetricsByShift } from "@/services/salesStorage"; 
import { getExpensesByShift } from "@/services/expensesStorage";
import { getEmployees } from "@/services/employeesStorage";
import { useNotify, useConfirm } from "@/context/UIContext";
import LoadingState from "@/components/LoadingState";

// UI Kit
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import ModalWrapper from "@/components/ui/ModalWrapper";

export default function ShiftPage() {
  const { user } = useAuth(); // 👈 2. Obtener branchId
  const notify = useNotify();
  const confirm = useConfirm();
  
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState(null);
  const [auditShift, setAuditShift] = useState(null);
  const [history, setHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Modales
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [viewShift, setViewShift] = useState(null);

  // Formularios
  const [openForm, setOpenForm] = useState({ user: "", initialCash: "" });
  const [blindCount, setBlindCount] = useState({ cash: "", card: "", transfer: "" });
  const [auditNotes, setAuditNotes] = useState("");

  const [metrics, setMetrics] = useState(null);

  const refreshData = async () => {
      // Si no hay sucursal cargada, no hacemos nada (seguridad)
      if (!user?.branchId) return;

      setLoading(true);
      try {
          // 👈 3. Pasar branchId a todas las consultas
          const [current, process, all, emps] = await Promise.all([
              getCurrentShift(user.branchId),
              getShiftInProcess(user.branchId),
              getAllShifts(user.branchId),
              getEmployees()
          ]);
          setActiveShift(current);
          setAuditShift(process);
          setHistory(all);
          setEmployees(emps);
      } catch (e) {
          console.error(e);
          notify.error("Error al cargar turnos");
      } finally {
          setLoading(false);
      }
  };

  // Recargar cuando el usuario (y su branchId) estén listos
  useEffect(() => { 
      if (user?.branchId) {
          refreshData(); 
      }
  }, [user]);

  useEffect(() => {
      const targetShift = auditShift || activeShift;
      if (!targetShift) { setMetrics(null); return; }

      async function loadMetrics() {
          try {
              const [sales, expenses] = await Promise.all([
                  getSalesMetricsByShift(targetShift.id),
                  getExpensesByShift(targetShift.id)
              ]);
              const expectedCash = Number(targetShift.initialCash) + (sales.incomeByMethod.EFECTIVO || 0) - (expenses.byMethod.EFECTIVO || 0);
              const expectedCard = (sales.incomeByMethod.TARJETA || 0);
              const expectedTransfer = (sales.incomeByMethod.TRANSFERENCIA || 0) - (expenses.byMethod.TRANSFERENCIA || 0);

              setMetrics({ sales, expenses, expected: { cash: expectedCash, card: expectedCard, transfer: expectedTransfer } });
          } catch (error) { console.error(error); }
      }
      loadMetrics();
  }, [activeShift, auditShift]);

  const handleOpen = async () => {
      if (!openForm.user) return notify.error("Selecciona tu usuario");
      if (openForm.initialCash === "") return notify.error("Indica fondo de caja");
      
      try {
          // 👈 4. Crear turno en la sucursal correcta
          await openShift({ 
              user: openForm.user, 
              initialCash: openForm.initialCash 
          }, user.branchId);
          
          await refreshData();
          notify.success("Turno abierto correctamente");
      } catch(e) { notify.error(e.message); }
  };

  const handlePreClose = async () => {
      if (!await confirm({ title: "Iniciar Arqueo", message: "¿Cerrar caja para conteo? Se bloquearán las ventas.", confirmText: "Sí, Cerrar" })) return;
      try {
          await preCloseShift(activeShift.id, blindCount);
          setBlindCount({ cash: "", card: "", transfer: "" }); 
          await refreshData();
          notify.info("Caja cerrada. Esperando auditoría.");
      } catch (e) { notify.error(e.message); }
  };

  const handleFinalClose = async () => {
      if (!metrics || !auditShift) return;
      if(!await confirm({ title: "Cierre Definitivo", message: "¿Aprobar diferencias y cerrar turno?", confirmText: "Aprobar" })) return;

      const declared = auditShift.declared; 
      const diff = {
          cash: declared.cash - metrics.expected.cash,
          card: declared.card - metrics.expected.card,
          transfer: declared.transfer - metrics.expected.transfer
      };

      try {
          await closeShift(auditShift.id, { expected: metrics.expected, declared: declared, difference: diff, notes: auditNotes });
          setAuditNotes("");
          await refreshData();
          notify.success("Turno finalizado.");
      } catch (e) { notify.error(e.message); }
  };

  if (loading && !activeShift && !auditShift) return <LoadingState />;

  return (
    <div className="page-container space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Control de Turnos</h1>
                <p className="text-textMuted text-sm">
                    Gestión de caja en {user.branchId === 'lusso_main' ? 'Matriz' : 'Sucursal'}
                </p>
            </div>
            <Button variant="secondary" onClick={() => setShowHistoryModal(true)}>📜 Historial de Cortes</Button>
        </div>

        {/* MODAL HISTORIAL */}
        {showHistoryModal && (
            <ModalWrapper title="Historial de Cortes" onClose={() => setShowHistoryModal(false)} width="600px">
                <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="text-center py-8 text-textMuted italic">No hay cortes registrados en esta sucursal.</div>
                    ) : (
                        history.map(h => (
                            <div key={h.id} onClick={() => setViewShift(h)} className="p-4 rounded-xl border border-border bg-surface hover:bg-surfaceHighlight cursor-pointer transition-colors flex justify-between items-center group">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-white">{new Date(h.openedAt).toLocaleDateString()}</span>
                                        <Badge color={h.status==="CLOSED" ? "green" : "yellow"}>{h.status}</Badge>
                                    </div>
                                    <div className="text-xs text-textMuted">{h.user} · Apertura: {new Date(h.openedAt).toLocaleTimeString()}</div>
                                </div>
                                {h.difference && (
                                    <div className={`text-sm font-bold ${(h.difference.cash + h.difference.card + h.difference.transfer) === 0 ? "text-emerald-400" : "text-red-400"}`}>
                                        Dif: ${(h.difference.cash + h.difference.card + h.difference.transfer).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </ModalWrapper>
        )}

        {/* MODAL DETALLE */}
        {viewShift && <ShiftDetailModal shift={viewShift} onClose={() => setViewShift(null)} />}

        {/* ESTADO 1: CAJA CERRADA (ABRIR) */}
        {!activeShift && !auditShift && (
            <div className="max-w-md mx-auto mt-10">
                <Card className="border-t-4 border-t-emerald-500 shadow-glow">
                    <div className="text-center mb-6">
                        <div className="text-4xl mb-2">🔐</div>
                        <h2 className="text-xl font-bold text-white">Apertura de Caja</h2>
                        <p className="text-textMuted text-sm">
                            Inicia turno en <span className="text-emerald-400 font-bold">{user.branchId === 'lusso_main' ? 'Lusso Visual' : 'Mundo Óptico'}</span>
                        </p>
                    </div>
                    <div className="space-y-4">
                        <Select label="Usuario Responsable" value={openForm.user} onChange={e => setOpenForm({...openForm, user: e.target.value})}>
                            <option value="">-- Seleccionar --</option>
                            {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                        </Select>
                        <Input label="Fondo Inicial ($)" type="number" value={openForm.initialCash} onChange={e => setOpenForm({...openForm, initialCash: e.target.value})} placeholder="0.00" className="text-lg font-bold text-emerald-400" />
                        <Button onClick={handleOpen} className="w-full py-3 text-base">Iniciar Turno</Button>
                    </div>
                </Card>
            </div>
        )}

        {/* ESTADO 2: TURNO ACTIVO (ARQUEO) */}
        {activeShift && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-l-4 border-l-blue-500">
                    <h3 className="text-lg font-bold text-blue-400 mb-2">🟢 Turno Activo</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-surfaceHighlight/30 rounded-xl border border-border">
                            <div className="text-xs text-textMuted uppercase mb-1">Responsable</div>
                            <div className="text-lg font-bold text-white">{activeShift.user}</div>
                            <div className="text-xs text-textMuted mt-1">Desde: {new Date(activeShift.openedAt).toLocaleString()}</div>
                        </div>
                        <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <div className="text-xs text-blue-300 uppercase mb-1">Fondo Inicial</div>
                            <div className="text-2xl font-bold text-blue-400">${activeShift.initialCash.toLocaleString()}</div>
                        </div>
                    </div>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                    <h3 className="text-lg font-bold text-red-400 mb-2">🔒 Arqueo de Cierre</h3>
                    <p className="text-xs text-textMuted mb-4">Cuenta el dinero físico. Al confirmar, se bloquearán las ventas.</p>
                    <div className="space-y-3">
                        <Input label="Efectivo en Caja" type="number" value={blindCount.cash} onChange={e => setBlindCount({...blindCount, cash: e.target.value})} placeholder="$0.00" />
                        <Input label="Vouchers (Tarjeta)" type="number" value={blindCount.card} onChange={e => setBlindCount({...blindCount, card: e.target.value})} placeholder="$0.00" />
                        <Input label="Transferencias" type="number" value={blindCount.transfer} onChange={e => setBlindCount({...blindCount, transfer: e.target.value})} placeholder="$0.00" />
                        <Button onClick={handlePreClose} variant="danger" className="w-full mt-2">Finalizar Turno</Button>
                    </div>
                </Card>
            </div>
        )}

        {/* ESTADO 3: AUDITORÍA (GERENTE) */}
        {auditShift && metrics && (
            <div className="animate-fadeIn">
                <div className="mb-6 p-4 bg-amber-900/20 border border-amber-500/50 rounded-xl flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h3 className="font-bold text-amber-400">Modo Auditoría</h3>
                        <p className="text-sm text-amber-200/80">Verifica las diferencias antes del cierre definitivo.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2" noPadding>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-surfaceHighlight text-textMuted uppercase text-xs">
                                <tr>
                                    <th className="p-4">Método</th>
                                    <th className="p-4 text-right">Sistema</th>
                                    <th className="p-4 text-right text-blue-400">Declarado</th>
                                    <th className="p-4 text-right">Diferencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                <AuditRow label="Efectivo" expected={metrics.expected.cash} declared={auditShift.declared.cash} />
                                <AuditRow label="Tarjeta" expected={metrics.expected.card} declared={auditShift.declared.card} />
                                <AuditRow label="Transferencia" expected={metrics.expected.transfer} declared={auditShift.declared.transfer} />
                                <tr className="bg-surfaceHighlight/10 font-bold">
                                    <td className="p-4 text-white">TOTAL</td>
                                    <td colSpan={2}></td>
                                    <td className={`p-4 text-right ${calculateTotalDiff(metrics, auditShift) === 0 ? "text-emerald-400" : "text-red-400"}`}>
                                        {calculateTotalDiff(metrics, auditShift) > 0 ? "+" : ""}{calculateTotalDiff(metrics, auditShift).toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Card>

                    <Card>
                        <h3 className="font-bold text-white mb-4">Aprobación</h3>
                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-xs font-bold text-textMuted uppercase mb-1 block">Notas de Auditoría</span>
                                <textarea 
                                    rows={3}
                                    value={auditNotes} 
                                    onChange={e => setAuditNotes(e.target.value)} 
                                    className="w-full bg-background border border-border rounded-xl p-3 text-white focus:border-primary outline-none resize-none text-sm"
                                    placeholder="Justificación de diferencias..."
                                />
                            </label>
                            <Button onClick={handleFinalClose} className="w-full shadow-lg shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-black">
                                ✅ Aprobar y Cerrar
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        )}
    </div>
  );
}

// Helpers y Sub-componentes
const calculateTotalDiff = (metrics, shift) => {
    return (shift.declared.cash - metrics.expected.cash) + 
           (shift.declared.card - metrics.expected.card) + 
           (shift.declared.transfer - metrics.expected.transfer);
};

const AuditRow = ({ label, expected, declared }) => {
    const diff = declared - expected;
    return (
        <tr className="hover:bg-white/5 transition-colors">
            <td className="p-4 text-textMain">{label}</td>
            <td className="p-4 text-right text-textMuted">${expected.toLocaleString()}</td>
            <td className="p-4 text-right text-blue-300 font-medium">${declared.toLocaleString()}</td>
            <td className={`p-4 text-right font-bold ${diff === 0 ? "text-textMuted opacity-50" : diff > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {diff > 0 ? "+" : ""}{diff.toLocaleString()}
            </td>
        </tr>
    );
};

const ShiftDetailModal = ({ shift, onClose }) => {
    const expected = shift.expected || { cash:0, card:0, transfer:0 };
    const declared = shift.declared || { cash:0, card:0, transfer:0 };
    const diff = shift.difference || { cash:0, card:0, transfer:0 };
    const totalDiff = (diff.cash + diff.card + diff.transfer);

    return (
        <ModalWrapper title="Detalle de Corte" onClose={onClose} width="650px">
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm bg-surfaceHighlight/20 p-4 rounded-xl border border-border">
                    <div className="space-y-1">
                        <div className="text-textMuted">Responsable: <strong className="text-white">{shift.user}</strong></div>
                        <div className="text-textMuted">Apertura: {new Date(shift.openedAt).toLocaleString()}</div>
                        <div className="text-textMuted">Cierre: {shift.closedAt ? new Date(shift.closedAt).toLocaleString() : "En curso"}</div>
                    </div>
                    <div className="text-right space-y-1">
                        <div className="text-emerald-400 font-bold text-lg">${shift.initialCash.toLocaleString()}</div>
                        <div className="text-xs text-textMuted uppercase">Fondo Inicial</div>
                        <Badge color={shift.status==="CLOSED"?"green":"yellow"}>{shift.status}</Badge>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-sm">
                        <thead className="bg-surfaceHighlight text-textMuted text-xs uppercase">
                            <tr>
                                <th className="p-3 text-left">Método</th>
                                <th className="p-3 text-right">Sistema</th>
                                <th className="p-3 text-right">Declarado</th>
                                <th className="p-3 text-right">Dif</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            <DetailRow label="Efectivo" sys={expected.cash} dec={declared.cash} diff={diff.cash} />
                            <DetailRow label="Tarjeta" sys={expected.card} dec={declared.card} diff={diff.card} />
                            <DetailRow label="Transferencia" sys={expected.transfer} dec={declared.transfer} diff={diff.transfer} />
                        </tbody>
                        <tfoot className="bg-surfaceHighlight/10 font-bold text-white">
                            <tr>
                                <td className="p-3">TOTAL DIFERENCIA</td>
                                <td colSpan={3} className={`p-3 text-right ${totalDiff === 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {totalDiff > 0 ? "+" : ""}{totalDiff.toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {shift.notes && (
                    <div className="p-4 bg-surfaceHighlight/30 rounded-xl border border-border">
                        <span className="text-xs font-bold text-textMuted uppercase block mb-1">Notas</span>
                        <p className="text-sm text-white italic">{shift.notes}</p>
                    </div>
                )}
                
                <div className="flex justify-end">
                    <Button variant="ghost" onClick={onClose}>Cerrar</Button>
                </div>
            </div>
        </ModalWrapper>
    );
};

const DetailRow = ({ label, sys, dec, diff }) => (
    <tr>
        <td className="p-3 text-textMain">{label}</td>
        <td className="p-3 text-right text-textMuted">${sys.toLocaleString()}</td>
        <td className="p-3 text-right text-white font-medium">${dec.toLocaleString()}</td>
        <td className={`p-3 text-right font-bold ${diff === 0 ? "text-textMuted opacity-30" : diff > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {diff > 0 ? "+" : ""}{diff.toLocaleString()}
        </td>
    </tr>
);