import { useState, useEffect } from "react";
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, ROLES } from "@/services/employeesStorage";
import { createAuthUser } from "@/utils/authAdmin"; 
import LoadingState from "@/components/LoadingState";
import FiscalSettings from "@/components/settings/FiscalSettings"; // 👈 1. IMPORTAR COMPONENTE FISCAL

// 👇 UI Kit
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { useConfirm, useNotify } from "@/context/UIContext";

export default function TeamPage() {
  const confirm = useConfirm();
  const notify = useNotify();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("TEAM"); // 👈 2. ESTADO PARA PESTAÑAS
  
  // Estado del formulario
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    role: "SALES", 
    commissionPercent: "", 
    baseSalary: "" 
  });

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
        return notify.info("Nombre, Email y Contraseña son requeridos");
    }

    try {
        notify.info("Creando usuario de acceso...");
        
        // 1. Crear Auth
        await createAuthUser(form.email, form.password);

        // 2. Guardar en DB
        const { password, ...employeeData } = form;
        await createEmployee(employeeData);

        setForm({ name: "", email: "", password: "", role: "SALES", commissionPercent: "", baseSalary: "" });
        setIsCreating(false);
        refresh();
        notify.success("¡Colaborador creado con éxito!");
        
    } catch (e) { 
        notify.error(e.message); 
    }
  };

  const handleUpdate = async (id, field, val) => {
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, [field]: Number(val) } : e));
      await updateEmployee(id, { [field]: Number(val) });
      notify.success("Dato actualizado");
  };

  const handleDelete = async (id) => {
    if(await confirm({ title: "Eliminar Usuario", message: "¿Estás seguro? Perderá el acceso al sistema inmediatamente." })) {
      await deleteEmployee(id);
      refresh();
      notify.success("Eliminado correctamente");
    }
  };

  // Componente de Botón de Pestaña
  const TabBtn = ({ id, label, icon }) => (
      <button 
          onClick={() => setActiveTab(id)} 
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab===id ? "border-blue-500 text-white bg-white/5" : "border-transparent text-textMuted hover:text-white"}`}
      >
          <span>{icon}</span>
          <span>{label}</span>
      </button>
  );

  if (loading && employees.length === 0) return <LoadingState />;

  return (
    <div className="page-container space-y-6">
      
      {/* --- ENCABEZADO Y TABS --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-0">
         <div className="pb-4">
            <h1 className="text-3xl font-bold text-white tracking-tight">Administración</h1>
            <p className="text-textMuted text-sm">Gestión de equipo y configuración de sucursal</p>
         </div>
         <div className="flex w-full md:w-auto overflow-x-auto">
            <TabBtn id="TEAM" label="Colaboradores" icon="👥" />
            <TabBtn id="FISCAL" label="Configuración Fiscal" icon="🏛️" />
         </div>
      </div>
      
      {/* --- TAB 1: EQUIPO (Tu código original) --- */}
      {activeTab === "TEAM" && (
        <div className="animate-fadeIn space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "ghost" : "primary"}>
                    {isCreating ? "Cancelar" : "+ Nuevo Integrante"}
                </Button>
            </div>

            {/* FORMULARIO */}
            {isCreating && (
                <Card className="border-t-4 border-t-blue-500 shadow-glow animate-fadeIn">
                    <h3 className="text-lg font-bold text-white mb-6">Registrar Colaborador</h3>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input 
                                label="Nombre Completo" 
                                value={form.name} 
                                onChange={e => setForm({...form, name: e.target.value})} 
                                placeholder="Ej. Juan Pérez" 
                                autoFocus 
                            />
                            <Input 
                                label="Email de Acceso" 
                                type="email" 
                                value={form.email} 
                                onChange={e => setForm({...form, email: e.target.value})} 
                                placeholder="juan@lusso.mx" 
                            />
                            <Input 
                                label="Contraseña Temporal" 
                                type="password" 
                                value={form.password} 
                                onChange={e => setForm({...form, password: e.target.value})} 
                                placeholder="Mínimo 6 caracteres" 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <Select label="Rol / Puesto" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                                {Object.entries(ROLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </Select>
                            <Input label="Sueldo Base ($)" type="number" value={form.baseSalary} onChange={e => setForm({...form, baseSalary: e.target.value})} placeholder="0" />
                            <Input label="% Comisión Venta" type="number" value={form.commissionPercent} onChange={e => setForm({...form, commissionPercent: e.target.value})} placeholder="0" />
                        </div>
                        
                        <div className="flex justify-end pt-2">
                            <Button type="submit" className="w-full md:w-auto px-8">Crear Usuario y Acceso</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* LISTA */}
            <div className="grid gap-3">
                {employees.length === 0 && <div className="text-center py-10 text-textMuted bg-surface rounded-xl border border-border">No hay colaboradores registrados.</div>}
                
                {employees.map(emp => (
                    <div key={emp.id} className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-blue-500/30 transition-colors">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-12 h-12 rounded-full bg-surfaceHighlight flex items-center justify-center text-lg font-bold text-textMuted border border-border">
                                {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-bold text-white text-lg">{emp.name}</div>
                                <div className="flex items-center gap-2 text-xs text-textMuted mt-0.5">
                                    <Badge color="blue">{ROLES[emp.role] || emp.role}</Badge>
                                    {emp.email && <span>{emp.email}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end bg-background md:bg-transparent p-3 md:p-0 rounded-lg border md:border-none border-border">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-textMuted uppercase font-bold">Mensual</span>
                                <div className="w-24">
                                    <Input 
                                        type="number" 
                                        value={emp.baseSalary || 0} 
                                        onChange={(e) => handleUpdate(emp.id, 'baseSalary', e.target.value)} 
                                        className="text-right font-mono text-emerald-400 !py-1 !px-2 h-8 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-textMuted uppercase font-bold">Comisión</span>
                                <div className="w-16 relative">
                                    <Input 
                                        type="number" 
                                        value={emp.commissionPercent || 0} 
                                        onChange={(e) => handleUpdate(emp.id, 'commissionPercent', e.target.value)} 
                                        className="text-center font-mono text-amber-400 !py-1 !px-2 h-8 text-sm"
                                    />
                                    <span className="absolute right-1 top-1.5 text-xs text-textMuted">%</span>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(emp.id)} className="text-textMuted hover:text-red-500 transition-colors p-2" title="Eliminar">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* --- TAB 2: CONFIGURACIÓN FISCAL --- */}
      {activeTab === "FISCAL" && (
          <div className="animate-fadeIn">
              <FiscalSettings />
          </div>
      )}

    </div>
  );
}