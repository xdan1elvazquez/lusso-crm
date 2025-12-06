import { useMemo, useState, useEffect } from "react";
import { useInventory } from "@/hooks/useInventory";
import { getAlertSettings, updateAlertSettings } from "@/services/settingsStorage";
import { recalculateInventoryStats } from "@/services/inventoryStorage";
import { getLogsByProductId } from "@/services/inventoryLogStorage";
import { preventNegativeKey, sanitizeMoney, formatMoneyBlur } from "@/utils/inputHandlers";
import LoadingState from "@/components/LoadingState";
import { useConfirm, useNotify } from "@/context/UIContext";

// 👇 NUEVOS COMPONENTES VISUALES (Fase 2)
import ModalWrapper from "@/components/ui/ModalWrapper";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select"; // Usaremos el Select nativo estilizado si lo tienes, o un select normal con clases

const CATEGORIES = [
  { id: "FRAMES", label: "Armazones", color: "blue" },
  { id: "CONTACT_LENS", label: "Lentes de Contacto", color: "purple" },
  { id: "LENSES", label: "Micas / Lentes", color: "green" },
  { id: "MEDICATION", label: "Farmacia", color: "red" },
  { id: "ACCESSORY", label: "Accesorios", color: "yellow" },
  { id: "OTHER", label: "Otros", color: "gray" },
];

const GENDERS = ["UNISEX", "HOMBRE", "MUJER", "NIÑO"];
const MATERIALS = ["ACETATO", "METAL", "TITANIO", "TR90", "OTRO"];
const PRESENTATIONS = [
  { id: "DROPS", label: "Gotas / Solución" },
  { id: "OINTMENT", label: "Ungüento / Gel" },
  { id: "ORAL", label: "Oral (Tabs/Caps)" },
  { id: "INJECTABLE", label: "Inyectable" },
  { id: "OTHER", label: "Otro" }
];

export default function InventoryPage() {
  const confirm = useConfirm();
  const notify = useNotify();

  // Lógica original intacta 👇
  const { products, stats, loading, error, add, edit, remove, refresh } = useInventory();
  
  const [query, setQuery] = useState("");
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [alerts, setAlerts] = useState({ minTotalFrames: 0, minMen: 0, minWomen: 0, minUnisex: 0, minKids: 0 });
  const [historyProduct, setHistoryProduct] = useState(null);

  const [form, setForm] = useState({
    id: null, category: "FRAMES", brand: "", model: "", 
    price: "", cost: "",
    stock: "", minStock: "1", isOnDemand: false, taxable: true,
    batch: "", expiry: "",
    tags: { gender: "UNISEX", material: "ACETATO", color: "", presentation: "DROPS" }
  });

  useEffect(() => {
      async function loadSettings() {
          const s = await getAlertSettings();
          setAlerts(s);
      }
      loadSettings();
  }, [isConfiguring]);

  const handleRecalculate = async () => {
      const ok = await confirm({
          title: "Sincronizar Inventario",
          message: "Esto recalculará el valor total y conteos leyendo todo el inventario.\n\n¿Deseas continuar?",
          confirmText: "Sincronizar"
      });
      if(!ok) return;

      await recalculateInventoryStats();
      refresh(); 
      notify.success("Estadísticas sincronizadas con éxito.");
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return products;
    return products.filter(p => p.brand.toLowerCase().includes(q) || p.model.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [products, query]);

  const resetForm = () => {
    setForm({ 
      id: null, category: "FRAMES", brand: "", model: "", 
      price: "", cost: "", 
      stock: "", minStock: "1", isOnDemand: false, taxable: true, batch: "", expiry: "",
      tags: { gender: "UNISEX", material: "ACETATO", color: "", presentation: "DROPS" }
    });
  };

  const handleNewProduct = () => { resetForm(); setIsEditingProduct(true); };
  const handleCancel = () => { resetForm(); setIsEditingProduct(false); };
  
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    try {
        if (form.id) await edit(form.id, form); else await add(form);
        notify.success(form.id ? "Producto actualizado" : "Producto creado");
        handleCancel();
    } catch (e) {
        notify.error("Error al guardar: " + e.message);
    }
  };

  const handleEdit = (product) => {
    setForm({
      ...product,
      cost: product.cost || "",
      taxable: product.taxable !== undefined ? product.taxable : true,
      batch: product.batch || "", expiry: product.expiry || "",
      tags: { gender: "UNISEX", material: "OTRO", color: "", presentation: "DROPS", ...product.tags }
    });
    setIsEditingProduct(true); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => { 
      const ok = await confirm({
          title: "Eliminar Producto",
          message: "¿Estás seguro de borrar este producto permanentemente?",
          confirmText: "Sí, Borrar",
          cancelText: "Cancelar"
      });

      if (ok) { 
          await remove(id); 
          notify.success("Producto eliminado");
      } 
  };
  
  const handleSaveConfig = async (e) => { 
      e.preventDefault(); 
      await updateAlertSettings(alerts); 
      setIsConfiguring(false); 
      notify.success("Alertas actualizadas");
  };

  // --- COMPONENTES INTERNOS CON NUEVO LOOK ---

  const HistoryModal = ({ product, onClose }) => {
      const [logs, setLogs] = useState([]);
      const [isLoadingLogs, setIsLoadingLogs] = useState(true);

      useEffect(() => {
          setIsLoadingLogs(true);
          getLogsByProductId(product.id)
              .then(data => { setLogs(data); setIsLoadingLogs(false); })
              .catch(err => { console.error(err); setIsLoadingLogs(false); });
      }, [product.id]);

      return (
        <ModalWrapper title={`Kardex: ${product.brand} ${product.model}`} onClose={onClose} width="700px">
            {isLoadingLogs ? <LoadingState /> : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm text-left text-textMuted">
                  <thead className="text-xs uppercase bg-surfaceHighlight text-textMain">
                    <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Movimiento</th><th className="px-4 py-3">Cant</th><th className="px-4 py-3">Saldo</th><th className="px-4 py-3">Ref.</th></tr>
                  </thead>
                  <tbody>
                      {logs.map(log => (
                          <tr key={log.id} className="border-b border-border hover:bg-white/5">
                              <td className="px-4 py-3">{new Date(log.date).toLocaleDateString()}</td>
                              <td className="px-4 py-3">
                                <Badge color={log.type==="SALE"?"red": log.type==="PURCHASE"?"green":"gray"}>{log.type}</Badge>
                              </td>
                              <td className={`px-4 py-3 font-bold ${log.quantity < 0 ? "text-red-400" : "text-green-400"}`}>{log.quantity > 0 ? "+" : ""}{log.quantity}</td>
                              <td className="px-4 py-3 text-white">{log.finalStock}</td>
                              <td className="px-4 py-3 text-xs opacity-70">{log.reference}</td>
                          </tr>
                      ))}
                  </tbody>
                </table>
                {logs.length === 0 && <div className="p-8 text-center text-textMuted">Sin movimientos registrados.</div>}
              </div>
            )}
        </ModalWrapper>
      );
  };

  // KPI Cards Modernizados
  const StatCard = ({ label, value, subtext, alertThreshold, isInverse }) => {
    let borderColor = "border-l-blue-500";
    let textColor = "text-white";
    
    // Lógica visual basada en tus alertas
    if (isInverse) { 
        if (value > 0) { borderColor = "border-l-red-500"; textColor = "text-red-400"; }
    } else if (alertThreshold) { 
        if (value < alertThreshold) { borderColor = "border-l-red-500"; textColor = "text-red-400"; }
        else if (value < alertThreshold * 1.2) { borderColor = "border-l-yellow-500"; textColor = "text-yellow-400"; }
        else { borderColor = "border-l-emerald-500"; textColor = "text-emerald-400"; }
    }

    return (
      <Card className={`border-l-4 ${borderColor} relative overflow-hidden group`}>
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-textMuted uppercase tracking-wider">{label}</span>
                {!isInverse && alertThreshold && <span className="text-[10px] bg-surfaceHighlight px-1.5 rounded text-textMuted">Meta: {alertThreshold}</span>}
            </div>
            <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
            {subtext && <div className="text-xs text-textMuted mt-1">{subtext}</div>}
        </div>
      </Card>
    );
  };

  if (loading) return <LoadingState />;
  if (error) return <div className="p-10 text-center text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">{error}</div>;

  return (
    <div className="page-container space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Inventario</h1>
          <p className="text-textMuted text-sm">Gestiona tus productos y existencias</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleRecalculate} title="Recalcular">🧮</Button>
          <Button variant="ghost" onClick={refresh} title="Actualizar">🔄</Button>
          <Button variant="secondary" onClick={() => setIsConfiguring(true)}>⚙️ Alertas</Button>
          <Button onClick={handleNewProduct}>+ Nuevo Producto</Button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Armazones" value={stats.totalFrames} alertThreshold={alerts.minTotalFrames} />
        <StatCard label="Hombres" value={stats.byGender?.hombre || 0} alertThreshold={alerts.minMen} />
        <StatCard label="Mujeres" value={stats.byGender?.mujer || 0} alertThreshold={alerts.minWomen} />
        <StatCard label="Valor Inventario" value={`$${(stats.inventoryValue || 0).toLocaleString()}`} subtext="Costo total invertido" />
      </div>

      {/* MODAL CONFIGURACIÓN ALERTAS */}
      {isConfiguring && (
        <ModalWrapper title="Metas de Inventario" onClose={() => setIsConfiguring(false)} width="400px">
          <form onSubmit={handleSaveConfig} className="space-y-4">
              {['minTotalFrames', 'minMen', 'minWomen'].map(field => (
                  <div key={field} className="flex justify-between items-center">
                      <span className="text-sm text-textMuted capitalize">{field.replace('min', 'Mínimo ').replace(/([A-Z])/g, ' $1')}</span>
                      <input type="number" value={alerts[field]} onChange={e => setAlerts({...alerts, [field]: e.target.value})} className="w-20 bg-surfaceHighlight border border-border rounded px-2 py-1 text-white text-right focus:border-primary outline-none" />
                  </div>
              ))}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => setIsConfiguring(false)}>Cancelar</Button>
                <Button type="submit">Guardar</Button>
              </div>
          </form>
        </ModalWrapper>
      )}

      {historyProduct && <HistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />}

      {/* FORMULARIO PRODUCTO (Integrado en el flujo) */}
      {isEditingProduct && (
        <Card className="animate-fadeIn border-primary/30 shadow-glow">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-border pb-4">{form.id ? "Editar Producto" : "Nuevo Producto"}</h3>
          <form onSubmit={handleSubmitProduct} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* SELECT CATEGORIA ESTILIZADO */}
                <div className="w-full">
                    <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Categoría</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-4 py-3 bg-background border border-border rounded-xl text-textMain text-sm focus:border-primary outline-none">
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                </div>
                <Input label="Marca" placeholder="Ej. RayBan" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} required />
                <Input label="Modelo" placeholder="Ej. Aviator 3025" value={form.model} onChange={e => setForm({...form, model: e.target.value})} required />
            </div>

            {/* SECCIÓN CONDICIONAL ARMAZONES */}
            {form.category === "FRAMES" && (
              <div className="bg-surfaceHighlight/50 p-4 rounded-xl grid grid-cols-2 gap-4 border border-dashed border-border">
                <div className="w-full">
                    <label className="block text-xs font-bold text-textMuted uppercase mb-1">Género</label>
                    <select value={form.tags.gender} onChange={e => setForm({...form, tags: {...form.tags, gender: e.target.value}})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white">
                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div className="w-full">
                    <label className="block text-xs font-bold text-textMuted uppercase mb-1">Material</label>
                    <select value={form.tags.material} onChange={e => setForm({...form, tags: {...form.tags, material: e.target.value}})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white">
                        {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
              </div>
            )}

            {/* SECCIÓN CONDICIONAL MÉDICOS */}
            {(form.category === "MEDICATION" || form.category === "CONTACT_LENS") && (
              <div className="bg-emerald-900/10 p-4 rounded-xl grid grid-cols-2 md:grid-cols-3 gap-4 border border-emerald-500/20">
                <div className="col-span-full text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Datos de Trazabilidad</div>
                <Input label="Lote" value={form.batch} onChange={e => setForm({...form, batch: e.target.value})} className="!bg-emerald-950/30 !border-emerald-500/30" />
                <Input label="Caducidad" type="date" value={form.expiry} onChange={e => setForm({...form, expiry: e.target.value})} className="!bg-emerald-950/30 !border-emerald-500/30" />
                {form.category === "MEDICATION" && (
                    <div className="w-full">
                        <label className="block text-xs font-bold text-textMuted uppercase mb-2">Presentación</label>
                        <select value={form.tags.presentation} onChange={e => setForm({...form, tags: {...form.tags, presentation: e.target.value}})} className="w-full bg-emerald-950/30 border border-emerald-500/30 rounded-xl px-3 py-3 text-sm text-white">
                            {PRESENTATIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                    </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <Input label="Precio Venta" type="number" className="text-green-400 font-bold !border-green-500/30" value={form.price} onChange={e => setForm({...form, price: sanitizeMoney(e.target.value)})} onBlur={e => setForm(f => ({...f, price: formatMoneyBlur(f.price)}))} required />
              <Input label="Costo Compra" type="number" className="text-red-400 !border-red-500/30" value={form.cost} onChange={e => setForm({...form, cost: sanitizeMoney(e.target.value)})} onBlur={e => setForm(f => ({...f, cost: formatMoneyBlur(f.cost)}))} />
              
              <div className="flex flex-col gap-3">
                 <label className="flex items-center gap-3 cursor-pointer bg-surfaceHighlight px-3 py-2 rounded-lg border border-border">
                    <input type="checkbox" checked={form.taxable} onChange={e => setForm({...form, taxable: e.target.checked})} className="accent-blue-500 w-4 h-4" />
                    <span className={`text-xs font-bold ${form.taxable ? "text-blue-400" : "text-textMuted"}`}>Grava IVA (16%)</span>
                 </label>
                 <label className="flex items-center gap-3 cursor-pointer bg-surfaceHighlight px-3 py-2 rounded-lg border border-border">
                    <input type="checkbox" checked={form.isOnDemand} onChange={e => setForm({...form, isOnDemand: e.target.checked})} className="accent-amber-500 w-4 h-4" />
                    <span className={`text-xs font-bold ${form.isOnDemand ? "text-amber-400" : "text-textMuted"}`}>Sobre Pedido</span>
                 </label>
              </div>

              {!form.isOnDemand && (
                <div className="grid grid-cols-2 gap-2">
                    <Input label="Stock" type="number" value={form.stock} onChange={e => setForm({...form, stock: sanitizeMoney(e.target.value)})} required />
                    <Input label="Mínimo" type="number" value={form.minStock} onChange={e => setForm({...form, minStock: sanitizeMoney(e.target.value)})} />
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6 pt-4 border-t border-border">
              <Button type="submit" variant="primary" className="flex-1">{form.id ? "Guardar Cambios" : "Crear Producto"}</Button>
              <Button type="button" variant="ghost" onClick={handleCancel}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      {/* BUSCADOR Y LISTA */}
      <div className="flex gap-4 mb-4">
        <Input placeholder="🔍 Buscar producto por nombre, marca o modelo..." value={query} onChange={e => setQuery(e.target.value)} className="bg-surface" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0 && <div className="col-span-full py-12 text-center text-textMuted bg-surface rounded-xl border border-border">No se encontraron productos.</div>}
        
        {filtered.map(p => {
            const catInfo = CATEGORIES.find(c => c.id === p.category);
            return (
              <Card key={p.id} noPadding className="group hover:border-primary/50 transition-colors relative flex flex-col justify-between h-full">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <Badge color={catInfo?.color || "gray"}>{catInfo?.label || p.category}</Badge>
                    <span className="font-bold text-lg text-emerald-400 tracking-tight">${Number(p.price).toLocaleString()}</span>
                  </div>
                  
                  <div className="mb-4">
                      <div className="font-bold text-white text-lg truncate" title={p.brand}>{p.brand}</div>
                      <div className="text-textMuted text-sm truncate" title={p.model}>{p.model}</div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    {p.isOnDemand ? (
                        <div className="text-xs font-bold text-amber-400 flex items-center gap-1">🔄 Sobre Pedido</div>
                    ) : (
                        <div className={`text-sm font-bold ${Number(p.stock) <= Number(p.minStock) ? "text-red-400" : "text-white"}`}>
                            📦 Stock: {p.stock}
                        </div>
                    )}
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {!p.isOnDemand && <button onClick={() => setHistoryProduct(p)} className="p-1.5 text-textMuted hover:text-white hover:bg-white/10 rounded" title="Ver Movimientos">📜</button>}
                        <button onClick={() => handleEdit(p)} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded" title="Editar">✏️</button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded" title="Eliminar">🗑️</button>
                    </div>
                  </div>
                </div>
              </Card>
            );
        })}
      </div>
    </div>
  );
}