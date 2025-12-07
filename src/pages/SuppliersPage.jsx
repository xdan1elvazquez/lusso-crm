import { useState, useEffect } from "react";
import { getSuppliers, createSupplier, deleteSupplier, updateSupplier } from "@/services/suppliersStorage";
import LoadingState from "@/components/LoadingState";
import { useConfirm, useNotify } from "@/context/UIContext";

// UI Kit
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function SuppliersPage() {
  const confirm = useConfirm();
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", contactName: "", phone: "", email: "", creditDays: "" });

  const refresh = async () => {
      setLoading(true);
      try {
          const data = await getSuppliers();
          setSuppliers(data);
      } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        if (form.id) await updateSupplier(form.id, form);
        else await createSupplier(form);
        
        setForm({ id: null, name: "", contactName: "", phone: "", email: "", creditDays: "" });
        setIsEditing(false);
        refresh();
        notify.success(form.id ? "Proveedor actualizado" : "Proveedor registrado");
    } catch(e) { notify.error(e.message); }
  };

  const handleEdit = (s) => { setForm(s); setIsEditing(true); };

  const handleDelete = async (id) => {
      if(await confirm({ title: "Eliminar Proveedor", message: "¿Borrar este proveedor?" })) {
          await deleteSupplier(id);
          refresh();
          notify.success("Eliminado");
      }
  };

  if (loading && suppliers.length === 0) return <LoadingState />;

  return (
    <div className="page-container space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Proveedores</h1>
            <p className="text-textMuted text-sm">Directorio de compras y servicios</p>
         </div>
         <Button onClick={() => { setIsEditing(!isEditing); setForm({ id: null, name: "", contactName: "", phone: "", email: "", creditDays: "" }); }} variant={isEditing ? "ghost" : "primary"}>
             {isEditing ? "Cancelar" : "+ Nuevo Proveedor"}
         </Button>
      </div>
      
      {isEditing && (
         <Card className="border-t-4 border-t-purple-500 shadow-glow animate-fadeIn">
             <h3 className="text-lg font-bold text-purple-400 mb-6">{form.id ? "Editar Proveedor" : "Nuevo Proveedor"}</h3>
             <form onSubmit={handleSubmit} className="space-y-4">
                 <Input label="Nombre de la Empresa" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej. Lentes de México S.A." autoFocus required />
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <Input label="Nombre de Contacto" value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})} placeholder="Vendedor asignado" />
                     <Input label="Teléfono / WhatsApp" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                     <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <Input label="Días de Crédito" type="number" value={form.creditDays} onChange={e => setForm({...form, creditDays: e.target.value})} placeholder="0" />
                 </div>

                 <div className="flex justify-end pt-2">
                     <Button type="submit" className="w-full md:w-auto px-8">{form.id ? "Actualizar Cambios" : "Guardar Proveedor"}</Button>
                 </div>
             </form>
         </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
         {suppliers.length === 0 && <div className="col-span-full text-center py-10 text-textMuted bg-surface rounded-xl border border-border">No hay proveedores.</div>}
         
         {suppliers.map(s => (
             <Card key={s.id} className="group hover:border-purple-500/50 transition-colors relative" noPadding>
                 <div className="p-5">
                     <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-900/20 flex items-center justify-center text-2xl">🏭</div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(s)} className="text-textMuted hover:text-blue-400 p-1">✏️</button>
                            <button onClick={() => handleDelete(s.id)} className="text-textMuted hover:text-red-400 p-1">🗑️</button>
                        </div>
                     </div>
                     
                     <h3 className="font-bold text-white text-lg truncate mb-1">{s.name}</h3>
                     {s.contactName && <div className="text-sm text-purple-300 mb-4">👤 {s.contactName}</div>}
                     
                     <div className="space-y-2 text-xs text-textMuted pt-3 border-t border-border">
                         {s.phone && <div className="flex items-center gap-2">📞 {s.phone}</div>}
                         {s.email && <div className="flex items-center gap-2 truncate">📧 {s.email}</div>}
                         {s.creditDays > 0 && <div className="flex items-center gap-2 text-emerald-400">⏳ {s.creditDays} días crédito</div>}
                     </div>
                 </div>
             </Card>
         ))}
      </div>
    </div>
  );
}