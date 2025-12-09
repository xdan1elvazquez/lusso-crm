import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // 👈 1. Importar Auth
import { getAllExpenses, createExpense, deleteExpense } from "@/services/expensesStorage";
import { preventNegativeKey, sanitizeMoney, formatMoneyBlur } from "@/utils/inputHandlers";
import LoadingState from "@/components/LoadingState";

// UI Kit
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { useConfirm, useNotify } from "@/context/UIContext";

const CATEGORIES = ["INVENTARIO", "OPERATIVO", "NOMINA", "MARKETING", "MANTENIMIENTO", "COSTO_VENTA", "OTROS"];
const METHODS = ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "CHEQUE"];

export default function ExpensesPage() {
  const { user } = useAuth(); // 👈 2. Obtener usuario
  const confirm = useConfirm();
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  
  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "OPERATIVO",
    method: "EFECTIVO",
    date: new Date().toISOString().slice(0, 10)
  });

  const refresh = async () => {
    // Seguridad: Si no hay branchId, no cargamos nada
    if (!user?.branchId) return;

    setLoading(true);
    try {
        // 👈 3. Filtrar gastos por sucursal
        const data = await getAllExpenses(user.branchId);
        setExpenses(data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // Recargar cuando el usuario esté listo
  useEffect(() => { 
      if (user?.branchId) refresh(); 
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.description) return notify.info("Completa los campos obligatorios");
    
    try {
        // 👈 4. Crear gasto en la sucursal correcta
        await createExpense(form, user.branchId);
        
        setForm({ description: "", amount: "", category: "OPERATIVO", method: "EFECTIVO", date: new Date().toISOString().slice(0, 10) });
        setIsCreating(false);
        refresh();
        notify.success("Gasto registrado");
    } catch (e) {
        notify.error("Error: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if(await confirm({ title: "Eliminar Gasto", message: "¿Estás seguro de borrar este registro?" })) {
      await deleteExpense(id);
      refresh();
      notify.success("Eliminado correctamente");
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-container space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Gastos y Compras</h1>
            <p className="text-textMuted text-sm">
                Salidas de dinero en <strong className="text-white">{user.branchId === 'lusso_main' ? 'Matriz' : 'Sucursal'}</strong>
            </p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "ghost" : "danger"}>
          {isCreating ? "Cancelar" : "- Registrar Salida"}
        </Button>
      </div>

      {isCreating && (
        <Card className="border-t-4 border-t-red-500 shadow-glow animate-fadeIn">
           <h3 className="text-lg font-bold text-red-400 mb-6">Nuevo Egreso</h3>
           <form onSubmit={handleSubmit} className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                      <Input label="Concepto" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ej. Pago de Luz" autoFocus />
                  </div>
                  <Input 
                    label="Monto ($)" 
                    type="number" 
                    value={form.amount} 
                    onKeyDown={preventNegativeKey}
                    onChange={e => setForm({...form, amount: sanitizeMoney(e.target.value)})} 
                    onBlur={e => setForm(f => ({...f, amount: formatMoneyBlur(f.amount)}))}
                    className="text-red-400 font-bold"
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select label="Categoría" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                  <Select label="Método de Pago" value={form.method} onChange={e => setForm({...form, method: e.target.value})}>
                      {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </Select>
                  <Input label="Fecha" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
               </div>

               <div className="flex justify-end pt-4">
                  <Button type="submit" variant="danger" className="w-full md:w-auto px-8">Registrar Gasto</Button>
               </div>
           </form>
        </Card>
      )}

      <div className="grid gap-3">
        {expenses.length === 0 && <div className="text-center py-10 text-textMuted bg-surface rounded-xl border border-border">No hay gastos registrados en esta sucursal.</div>}
        
        {expenses.map(e => (
           <div key={e.id} className="bg-surface border border-border rounded-xl p-4 flex justify-between items-center group hover:border-red-500/30 transition-colors">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-red-900/20 flex items-center justify-center text-red-400 text-lg">
                    💸
                 </div>
                 <div>
                     <div className="font-bold text-white text-lg">{e.description}</div>
                     <div className="flex gap-2 items-center text-xs text-textMuted mt-1">
                        <span>{new Date(e.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <Badge color="gray">{e.category}</Badge>
                        <span>•</span>
                        <span>{e.method}</span>
                     </div>
                 </div>
              </div>
              
              <div className="text-right">
                 <div className="text-xl font-bold text-red-400">- ${Number(e.amount).toLocaleString()}</div>
                 <button onClick={() => handleDelete(e.id)} className="text-textMuted hover:text-red-500 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</button>
              </div>
           </div>
        ))}
      </div>
    </div>
  );
}