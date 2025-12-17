import { useState, useEffect } from "react";
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, ROLES } from "@/services/employeesStorage";
import { createAuthUser } from "@/utils/authAdmin"; 
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebase/config";
import { BRANCHES_CONFIG } from "@/utils/branchesConfig";
import LoadingState from "@/components/LoadingState";
import FiscalSettings from "@/components/settings/FiscalSettings";
import { PERMISSIONS, PERMISSION_LABELS, ROLE_DEFAULTS } from "@/utils/rbacConfig"; // 👈

// UI Kit
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useConfirm, useNotify } from "@/context/UIContext";
import ModalWrapper from "@/components/ui/ModalWrapper"; // Asegúrate de tener este componente o usa uno simple

export default function TeamPage() {
  const confirm = useConfirm();
  const notify = useNotify();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("TEAM");
  
  // Estado para el Modal de Permisos
  const [editingPermissionsId, setEditingPermissionsId] = useState(null);
  const [tempPermissions, setTempPermissions] = useState({});
  
  const availableBranches = Object.values(BRANCHES_CONFIG);

  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    role: "SALES", 
    branchId: "lusso_main", 
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
        await createAuthUser(form.email, form.password);
        const { password, ...employeeData } = form;
        
        // Al crear, asignamos null a permisos para que herede del Rol
        await createEmployee({
            ...employeeData,
            permissions: null,
            isActive: true,
            createdAt: new Date().toISOString()
        });

        setForm({ name: "", email: "", password: "", role: "SALES", branchId: "lusso_main", commissionPercent: "", baseSalary: "" });
        setIsCreating(false);
        refresh();
        notify.success("¡Colaborador creado!");
    } catch (e) { 
        notify.error(e.message); 
    }
  };

  const handleUpdate = async (id, field, val) => {
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, [field]: val } : e));
      try {
          await updateEmployee(id, { [field]: val });
          if(field !== 'commissionPercent' && field !== 'baseSalary') notify.success("Actualizado");
      } catch (error) {
          notify.error("Error al actualizar");
          refresh();
      }
  };

  const handleResetPassword = async (email) => {
      if(await confirm({ title: "Restablecer Contraseña", message: `Enviar correo a ${email}?` })) {
          try {
              await sendPasswordResetEmail(auth, email);
              notify.success("Correo enviado 📧");
          } catch (error) { notify.error("Error: " + error.message); }
      }
  };

  const handleDelete = async (id) => {
    if(await confirm({ title: "Eliminar Usuario", message: "Esta acción borrará el registro. ¿Confirmar?" })) {
      await deleteEmployee(id);
      refresh();
      notify.success("Eliminado");
    }
  };

  // --- LÓGICA DEL MODAL DE PERMISOS ---
  const openPermissionModal = (emp) => {
      setEditingPermissionsId(emp.id);
      
      // Si ya tiene permisos custom, usarlos. Si no, cargar defaults del rol para que el admin vea qué tiene.
      let currentPerms = {};
      if (emp.permissions) {
          currentPerms = { ...emp.permissions };
      } else {
          // Precargar con defaults
          const defaults = ROLE_DEFAULTS[emp.role] || [];
          defaults.forEach(p => currentPerms[p] = true);
      }
      setTempPermissions(currentPerms);
  };

  const togglePermission = (key) => {
      setTempPermissions(prev => ({
          ...prev,
          [key]: !prev[key]
      }));
  };

  const savePermissions = async () => {
      if(!editingPermissionsId) return;
      try {
          await updateEmployee(editingPermissionsId, { permissions: tempPermissions });
          setEmployees(prev => prev.map(e => e.id === editingPermissionsId ? { ...e, permissions: tempPermissions } : e));
          notify.success("Permisos actualizados");
          setEditingPermissionsId(null);
      } catch (error) {
          notify.error("Error al guardar permisos");
      }
  };

  const TabBtn = ({ id, label, icon }) => (
      <button onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab===id ? "border-blue-500 text-white bg-white/5" : "border-transparent text-textMuted hover:text-white"}`}>
          <span>{icon}</span><span>{label}</span>
      </button>
  );

  if (loading && employees.length === 0) return <LoadingState />;

  return (
    <div className="page-container space-y-6">
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
      
      {activeTab === "TEAM" && (
        <div className="animate-fadeIn space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "ghost" : "primary"}>
                    {isCreating ? "Cancelar" : "+ Nuevo Integrante"}
                </Button>
            </div>

            {isCreating && (
                <Card className="border-t-4 border-t-blue-500 shadow-glow animate-fadeIn">
                    <h3 className="text-lg font-bold text-white mb-6">Registrar Nuevo Acceso</h3>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input label="Nombre" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nombre Apellido" />
                            <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="usuario@lusso.mx" />
                            <Input label="Contraseña" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="******" />
                            <div>
                                <label className="block text-xs font-bold text-textMuted uppercase mb-1">Sucursal Base</label>
                                <Select value={form.branchId} onChange={e => setForm({...form, branchId: e.target.value})}>
                                    {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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
                        <div className="flex justify-end pt-2"><Button type="submit">Crear Usuario</Button></div>
                    </form>
                </Card>
            )}

            <div className="space-y-3">
                {employees.map(emp => (
                    <div key={emp.id} className={`bg-surface border ${emp.isActive !== false ? 'border-border' : 'border-red-900/50 bg-red-900/5'} rounded-xl p-4 flex flex-col lg:flex-row justify-between items-center gap-4 transition-all hover:border-blue-500/30`}>
                        {/* 1. PERFIL */}
                        <div className="flex items-center gap-4 w-full lg:w-1/4">
                            <div className="w-10 h-10 rounded-full bg-surfaceHighlight border border-border flex items-center justify-center font-bold text-white">
                                {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-white text-base truncate">{emp.name}</div>
                                <div className="text-xs text-textMuted truncate">{emp.email}</div>
                                <div className="flex gap-2 text-[10px] mt-1">
                                    <button onClick={() => handleResetPassword(emp.email)} className="text-blue-400 hover:text-blue-300 underline">Reset Pass</button>
                                    <span className="text-slate-600">|</span>
                                    {/* BOTÓN PERMISOS */}
                                    <button onClick={() => openPermissionModal(emp)} className="text-emerald-400 hover:text-emerald-300 underline font-bold">
                                        🛡️ Permisos
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 2. CONFIGURACIÓN */}
                        <div className="flex gap-2 w-full lg:w-1/3">
                            <div className="flex-1">
                                <label className="text-[9px] text-textMuted uppercase font-bold">Sucursal</label>
                                <select value={emp.branchId || "lusso_main"} onChange={(e) => handleUpdate(emp.id, 'branchId', e.target.value)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-white outline-none">
                                    {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-[9px] text-textMuted uppercase font-bold">Rol</label>
                                <select value={emp.role} onChange={(e) => handleUpdate(emp.id, 'role', e.target.value)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-white outline-none">
                                    {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* 3. ACCIONES */}
                        <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
                            <button onClick={() => handleUpdate(emp.id, 'isActive', !emp.isActive)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emp.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emp.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <button onClick={() => handleDelete(emp.id)} className="text-textMuted hover:text-red-500 p-2">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {activeTab === "FISCAL" && <div className="animate-fadeIn"><FiscalSettings /></div>}

      {/* MODAL DE PERMISOS */}
      {editingPermissionsId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Editar Permisos Granulares</h3>
                    <button onClick={() => setEditingPermissionsId(null)} className="text-2xl text-textMuted hover:text-white">&times;</button>
                </div>
                <p className="text-sm text-amber-400 bg-amber-900/20 p-2 rounded mb-4 border border-amber-900/50">
                    ⚠️ Estos permisos sobrescriben la configuración por defecto del Rol. Desmarcar una casilla ocultará el módulo para este usuario.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10">
                            <input 
                                type="checkbox" 
                                checked={!!tempPermissions[key]} 
                                onChange={() => togglePermission(key)}
                                className="w-5 h-5 rounded border-gray-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                            />
                            <span className="text-sm text-slate-200">{label}</span>
                        </label>
                    ))}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                    <Button variant="ghost" onClick={() => setEditingPermissionsId(null)}>Cancelar</Button>
                    <Button onClick={savePermissions}>Guardar Permisos</Button>
                </div>
            </Card>
        </div>
      )}
    </div>
  );
}