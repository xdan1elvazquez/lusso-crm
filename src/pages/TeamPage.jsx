import { useState, useEffect } from "react";
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, ROLES } from "@/services/employeesStorage";
import { createAuthUser } from "@/utils/authAdmin"; 
import { sendPasswordResetEmail } from "firebase/auth"; // 👈 Para resetear pass
import { auth } from "@/firebase/config";
import { BRANCHES_CONFIG } from "@/utils/branchesConfig"; // 👈 Para leer sucursales
import LoadingState from "@/components/LoadingState";
import FiscalSettings from "@/components/settings/FiscalSettings";

// UI Kit
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
  const [activeTab, setActiveTab] = useState("TEAM");
  
  // Lista de sucursales disponibles
  const availableBranches = Object.values(BRANCHES_CONFIG);

  // Formulario de creación
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    role: "SALES", 
    branchId: "lusso_main", // 👈 Default
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
        notify.info("Creando acceso...");
        
        // 1. Crear Auth
        await createAuthUser(form.email, form.password);

        // 2. Guardar Perfil en DB
        const { password, ...employeeData } = form;
        
        await createEmployee({
            ...employeeData,
            isActive: true, // 👈 Por defecto activo
            createdAt: new Date().toISOString()
        });

        setForm({ name: "", email: "", password: "", role: "SALES", branchId: "lusso_main", commissionPercent: "", baseSalary: "" });
        setIsCreating(false);
        refresh();
        notify.success("¡Colaborador creado y asignado!");
        
    } catch (e) { 
        notify.error(e.message); 
    }
  };

  // Actualizar cualquier campo (Salario, Rol, Sucursal, Estatus)
  const handleUpdate = async (id, field, val) => {
      // Optimistic update UI
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, [field]: val } : e));
      
      try {
          await updateEmployee(id, { [field]: val });
          if(field !== 'commissionPercent' && field !== 'baseSalary') {
              notify.success("Perfil actualizado");
          }
      } catch (error) {
          notify.error("Error al actualizar");
          refresh(); // Revertir si falla
      }
  };

  // Enviar correo para cambiar contraseña
  const handleResetPassword = async (email) => {
      if(await confirm({ title: "Restablecer Contraseña", message: `Se enviará un correo a ${email} para que el usuario elija una nueva contraseña. ¿Proceder?` })) {
          try {
              await sendPasswordResetEmail(auth, email);
              notify.success("Correo de restablecimiento enviado 📧");
          } catch (error) {
              notify.error("Error: " + error.message);
          }
      }
  };

  const handleDelete = async (id) => {
    if(await confirm({ title: "Eliminar Usuario", message: "Esta acción borrará el registro de la lista, pero el acceso histórico puede permanecer. ¿Mejor usar 'Desactivar Acceso'?" })) {
      await deleteEmployee(id);
      refresh();
      notify.success("Eliminado correctamente");
    }
  };

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
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-0">
         <div className="pb-4">
            <h1 className="text-3xl font-bold text-white tracking-tight">Administración</h1>
            <p className="text-textMuted text-sm">Control total de accesos y sucursales</p>
         </div>
         <div className="flex w-full md:w-auto overflow-x-auto">
            <TabBtn id="TEAM" label="Colaboradores" icon="👥" />
            <TabBtn id="FISCAL" label="Configuración Fiscal" icon="🏛️" />
         </div>
      </div>
      
      {/* --- TAB 1: GESTIÓN DE EQUIPO --- */}
      {activeTab === "TEAM" && (
        <div className="animate-fadeIn space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "ghost" : "primary"}>
                    {isCreating ? "Cancelar" : "+ Nuevo Integrante"}
                </Button>
            </div>

            {/* FORMULARIO DE CREACIÓN */}
            {isCreating && (
                <Card className="border-t-4 border-t-blue-500 shadow-glow animate-fadeIn">
                    <h3 className="text-lg font-bold text-white mb-6">Registrar Nuevo Acceso</h3>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input 
                                label="Nombre" 
                                value={form.name} 
                                onChange={e => setForm({...form, name: e.target.value})} 
                                placeholder="Nombre Apellido" 
                                autoFocus 
                            />
                            <Input 
                                label="Email (Login)" 
                                type="email" 
                                value={form.email} 
                                onChange={e => setForm({...form, email: e.target.value})} 
                                placeholder="usuario@lusso.mx" 
                            />
                            <Input 
                                label="Contraseña Inicial" 
                                type="password" 
                                value={form.password} 
                                onChange={e => setForm({...form, password: e.target.value})} 
                                placeholder="******" 
                            />
                             {/* SELECCIONAR SUCURSAL */}
                            <div>
                                <label className="block text-xs font-bold text-textMuted uppercase mb-1">Sucursal Base</label>
                                <Select value={form.branchId} onChange={e => setForm({...form, branchId: e.target.value})}>
                                    {availableBranches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <Select label="Rol de Sistema" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                                {Object.entries(ROLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </Select>
                            <Input label="Sueldo Base ($)" type="number" value={form.baseSalary} onChange={e => setForm({...form, baseSalary: e.target.value})} placeholder="0" />
                            <Input label="% Comisión" type="number" value={form.commissionPercent} onChange={e => setForm({...form, commissionPercent: e.target.value})} placeholder="0" />
                        </div>
                        
                        <div className="flex justify-end pt-2">
                            <Button type="submit" className="w-full md:w-auto px-8">Crear Usuario</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* LISTA DE EMPLEADOS (ESTILO GRID AVANZADO) */}
            <div className="space-y-3">
                {employees.length === 0 && <div className="text-center py-10 text-textMuted">No hay colaboradores.</div>}
                
                {employees.map(emp => (
                    <div key={emp.id} className={`bg-surface border ${emp.isActive !== false ? 'border-border' : 'border-red-900/50 bg-red-900/5'} rounded-xl p-4 flex flex-col lg:flex-row justify-between items-center gap-4 transition-all hover:border-blue-500/30`}>
                        
                        {/* 1. PERFIL */}
                        <div className="flex items-center gap-4 w-full lg:w-1/4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border ${emp.isActive !== false ? 'bg-surfaceHighlight text-textMuted border-border' : 'bg-red-900/20 text-red-500 border-red-900'}`}>
                                {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-white text-base truncate">{emp.name}</div>
                                <div className="text-xs text-textMuted truncate">{emp.email}</div>
                                {/* Botón Reset Password */}
                                <button onClick={() => handleResetPassword(emp.email)} className="text-[10px] text-blue-400 hover:text-blue-300 underline mt-0.5">
                                    Enviar Reset Password
                                </button>
                            </div>
                        </div>

                        {/* 2. CONFIGURACIÓN (SUCURSAL Y ROL) */}
                        <div className="flex gap-2 w-full lg:w-1/3">
                            <div className="flex-1">
                                <label className="text-[9px] text-textMuted uppercase font-bold">Sucursal</label>
                                <select 
                                    value={emp.branchId || "lusso_main"} 
                                    onChange={(e) => handleUpdate(emp.id, 'branchId', e.target.value)}
                                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                                >
                                    {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-[9px] text-textMuted uppercase font-bold">Rol</label>
                                <select 
                                    value={emp.role} 
                                    onChange={(e) => handleUpdate(emp.id, 'role', e.target.value)}
                                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                                >
                                    {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* 3. FINANZAS */}
                        <div className="flex gap-2 w-full lg:w-1/4 justify-center">
                             <div className="w-20">
                                <label className="text-[9px] text-textMuted uppercase font-bold text-center block">Sueldo</label>
                                <input 
                                    type="number" 
                                    value={emp.baseSalary || 0} 
                                    onChange={(e) => handleUpdate(emp.id, 'baseSalary', Number(e.target.value))} 
                                    className="w-full bg-transparent border-b border-border text-center text-sm font-mono text-emerald-400 focus:border-emerald-500 outline-none py-1"
                                />
                            </div>
                            <div className="w-16">
                                <label className="text-[9px] text-textMuted uppercase font-bold text-center block">Comisión</label>
                                <input 
                                    type="number" 
                                    value={emp.commissionPercent || 0} 
                                    onChange={(e) => handleUpdate(emp.id, 'commissionPercent', Number(e.target.value))} 
                                    className="w-full bg-transparent border-b border-border text-center text-sm font-mono text-amber-400 focus:border-amber-500 outline-none py-1"
                                />
                            </div>
                        </div>

                        {/* 4. ACCIONES (BLOQUEO) */}
                        <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] text-textMuted uppercase font-bold mb-1">Acceso</span>
                                <button 
                                    onClick={() => handleUpdate(emp.id, 'isActive', emp.isActive === false ? true : false)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emp.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emp.isActive !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            
                            <button onClick={() => handleDelete(emp.id)} className="text-textMuted hover:text-red-500 p-2" title="Eliminar Registro">🗑️</button>
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