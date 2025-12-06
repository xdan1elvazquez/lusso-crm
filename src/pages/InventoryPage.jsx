import { useMemo, useState, useEffect } from "react";
import { useInventory } from "@/hooks/useInventory";
import { getAlertSettings, updateAlertSettings } from "@/services/settingsStorage";
// 👇 CORRECCIÓN: Separamos los imports correctamente
import { recalculateInventoryStats } from "@/services/inventoryStorage";
import { getLogsByProductId } from "@/services/inventoryLogStorage";
// -----------------------------------------------------------
import { preventNegativeKey, sanitizeMoney, formatMoneyBlur } from "@/utils/inputHandlers";
import LoadingState from "@/components/LoadingState";

const CATEGORIES = [
  { id: "FRAMES", label: "Armazones" },
  { id: "CONTACT_LENS", label: "Lentes de Contacto" },
  { id: "LENSES", label: "Micas / Lentes" },
  { id: "MEDICATION", label: "Medicamento / Farmacia" },
  { id: "ACCESSORY", label: "Accesorios" },
  { id: "OTHER", label: "Otros" },
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

  // Botón de pánico para arreglar contadores
  const handleRecalculate = async () => {
      if(!confirm("Esto recalculará el valor total y conteos leyendo todo el inventario. ¿Continuar?")) return;
      await recalculateInventoryStats();
      refresh(); 
      alert("Estadísticas sincronizadas con éxito.");
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
    if (form.id) await edit(form.id, form); else await add(form);
    handleCancel();
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

  const handleDelete = async (id) => { if (confirm("¿Borrar permanentemente?")) { await remove(id); } };
  
  const handleSaveConfig = async (e) => { 
      e.preventDefault(); 
      await updateAlertSettings(alerts); 
      setIsConfiguring(false); 
  };

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
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
            <div style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333", width: "90%", maxWidth: 600, maxHeight:"80vh", overflowY:"auto" }}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
                    <h3 style={{ margin: 0, color: "#60a5fa" }}>Kardex: {product.brand} {product.model}</h3>
                    <button onClick={onClose} style={{background:"none", border:"none", color:"#aaa", fontSize:"1.5em", cursor:"pointer"}}>×</button>
                </div>
                {isLoadingLogs ? <p style={{color:"#aaa", textAlign:"center"}}>Cargando movimientos...</p> : (
                  <table style={{width:"100%", borderCollapse:"collapse", fontSize:"0.9em"}}>
                      <thead><tr style={{borderBottom:"1px solid #444", color:"#888", textAlign:"left"}}><th style={{padding:8}}>Fecha</th><th style={{padding:8}}>Movimiento</th><th style={{padding:8}}>Cant</th><th style={{padding:8}}>Saldo</th><th style={{padding:8}}>Ref.</th></tr></thead>
                      <tbody>
                          {logs.map(log => (
                              <tr key={log.id} style={{borderBottom:"1px solid #222"}}>
                                  <td style={{padding:8}}>{new Date(log.date).toLocaleDateString()}</td>
                                  <td style={{padding:8}}><span style={{fontSize:"0.8em", padding:"2px 6px", borderRadius:4, background: log.type==="SALE"?"#450a0a": log.type==="PURCHASE"?"#064e3b": "#333", color: log.type==="SALE"?"#f87171": log.type==="PURCHASE"?"#4ade80": "#ccc"}}>{log.type}</span></td>
                                  <td style={{padding:8, fontWeight:"bold", color: log.quantity < 0 ? "#f87171" : "#4ade80"}}>{log.quantity > 0 ? "+" : ""}{log.quantity}</td>
                                  <td style={{padding:8, color:"#ddd"}}>{log.finalStock}</td>
                                  <td style={{padding:8, color:"#888", fontSize:"0.85em"}}>{log.reference}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                )}
                {!isLoadingLogs && logs.length === 0 && <p style={{opacity:0.5, textAlign:"center", marginTop:20}}>Sin movimientos registrados.</p>}
            </div>
        </div>
      );
  };

  const StatCard = ({ label, value, subtext, alertThreshold, isInverse }) => {
    let statusColor = "#4ade80";
    if (isInverse) { if (value > 0) statusColor = "#f87171"; } 
    else if (alertThreshold) { if (value < alertThreshold) statusColor = "#f87171"; else if (value < alertThreshold * 1.2) statusColor = "#facc15"; }
    if (!alertThreshold && !isInverse) statusColor = "#60a5fa";

    return (
      <div style={{ background: "#1a1a1a", border: `1px solid ${statusColor}`, borderRadius: 10, padding: 15, position: "relative", overflow:"hidden" }}>
        <div style={{ width: 4, height: "100%", background: statusColor, position: "absolute", left: 0, top: 0 }}></div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 4, display:"flex", justifyContent:"space-between" }}><span>{label}</span>{!isInverse && alertThreshold && <span style={{fontSize:10, opacity:0.5}}>Meta: {alertThreshold}</span>}</div>
        <div style={{ fontSize: 24, fontWeight: "bold", color: "white" }}>{value}</div>
        {subtext && <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{subtext}</div>}
      </div>
    );
  };

  if (loading) return <LoadingState />;
  if (error) return <div style={{padding:40, textAlign:"center", color:"#f87171"}}>{error}</div>;

  return (
    <div style={{ paddingBottom: 40, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Inventario (Nube)</h1>
        <div style={{ display: "flex", gap: 10 }}>
          {/* Botón de pánico para arreglar los números si se desvían */}
          <button onClick={handleRecalculate} style={{ background: "#451a03", color: "#fbbf24", border: "1px solid #fbbf24", padding: "10px", borderRadius: 6, cursor: "pointer" }} title="Sincronizar Totales">🧮</button>
          
          <button onClick={() => refresh()} style={{ background: "transparent", border: "1px solid #555", color: "#aaa", padding: "10px", borderRadius: 6, cursor: "pointer" }}>🔄</button>
          <button onClick={() => setIsConfiguring(true)} style={{ background: "#333", color: "#ddd", border: "1px solid #555", padding: "10px 15px", borderRadius: 6, cursor: "pointer" }}>⚙️ Alertas</button>
          <button onClick={handleNewProduct} style={{ background: "#2563eb", color: "white", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>+ Nuevo Producto</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 15, marginBottom: 30 }}>
        <StatCard label="Total Armazones" value={stats.totalFrames} alertThreshold={alerts.minTotalFrames} />
        <StatCard label="Hombres" value={stats.byGender?.hombre || 0} alertThreshold={alerts.minMen} />
        <StatCard label="Mujeres" value={stats.byGender?.mujer || 0} alertThreshold={alerts.minWomen} />
        <StatCard label="Valor Inventario ($)" value={`$${(stats.inventoryValue || 0).toLocaleString()}`} subtext="Costo total invertido" />
      </div>

      {isConfiguring && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <form onSubmit={handleSaveConfig} style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333", width: "100%", maxWidth: 400 }}>
            <h3 style={{ marginTop: 0, color: "#e5e7eb" }}>Metas de Inventario</h3>
            <div style={{ display: "grid", gap: 15 }}>
              <label style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#ccc", fontSize: 13 }}>Total Armazones</span><input type="number" value={alerts.minTotalFrames} onChange={e => setAlerts({...alerts, minTotalFrames: e.target.value})} style={{ width: 80, padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} /></label>
              <label style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#ccc", fontSize: 13 }}>Mínimo Hombres</span><input type="number" value={alerts.minMen} onChange={e => setAlerts({...alerts, minMen: e.target.value})} style={{ width: 80, padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} /></label>
              <label style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#ccc", fontSize: 13 }}>Mínimo Mujeres</span><input type="number" value={alerts.minWomen} onChange={e => setAlerts({...alerts, minWomen: e.target.value})} style={{ width: 80, padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} /></label>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setIsConfiguring(false)} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>Guardar</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {historyProduct && <HistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />}

      {isEditingProduct && (
        <section style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", marginBottom: 30 }}>
          <h3 style={{ marginTop: 0, color: "#e5e7eb" }}>{form.id ? "Editar Producto" : "Nuevo Producto"}</h3>
          <form onSubmit={handleSubmitProduct} style={{ display: "grid", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15 }}>
              <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#aaa" }}>Categoría</span><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
              <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#aaa" }}>Marca</span><input required placeholder="Ej. RayBan" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} /></label>
              <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#aaa" }}>Modelo</span><input required placeholder="Ej. Aviator 3025" value={form.model} onChange={e => setForm({...form, model: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} /></label>
            </div>
            {form.category === "FRAMES" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15, padding: 15, background: "#111", borderRadius: 8 }}>
                <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#60a5fa" }}>Género</span><select value={form.tags.gender} onChange={e => setForm({...form, tags: {...form.tags, gender: e.target.value}})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }}>{GENDERS.map(g => <option key={g} value={g}>{g}</option>)}</select></label>
                <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#60a5fa" }}>Material</span><select value={form.tags.material} onChange={e => setForm({...form, tags: {...form.tags, material: e.target.value}})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }}>{MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}</select></label>
              </div>
            )}
            {(form.category === "MEDICATION" || form.category === "CONTACT_LENS") && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15, padding: 15, background: "#064e3b", borderRadius: 8, border: "1px solid #059669" }}>
                <div style={{ gridColumn: "1/-1", color: "#a7f3d0", fontSize: 11, fontWeight: "bold" }}>DATOS DE TRAZABILIDAD</div>
                <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#fff" }}>Lote</span><input value={form.batch} onChange={e => setForm({...form, batch: e.target.value})} placeholder="Ej. L-4533" style={{ padding: 8, background: "#065f46", border: "1px solid #10b981", color: "white", borderRadius: 4 }} /></label>
                <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#fff" }}>Caducidad</span><input type="date" value={form.expiry} onChange={e => setForm({...form, expiry: e.target.value})} style={{ padding: 8, background: "#065f46", border: "1px solid #10b981", color: "white", borderRadius: 4 }} /></label>
                {form.category === "MEDICATION" && (
                    <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#fff" }}>Presentación</span><select value={form.tags.presentation} onChange={e => setForm({...form, tags: {...form.tags, presentation: e.target.value}})} style={{ padding: 8, background: "#065f46", border: "1px solid #10b981", color: "white", borderRadius: 4 }}>{PRESENTATIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
                )}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15 }}>
              <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#4ade80", fontWeight:"bold" }}>Precio Venta</span>
                  <input type="number" min="0" required placeholder="0.00" value={form.price} onKeyDown={preventNegativeKey} onChange={e => setForm({...form, price: sanitizeMoney(e.target.value)})} onBlur={e => setForm(f => ({...f, price: formatMoneyBlur(f.price)}))} style={{ padding: 8, background: "#222", border: "1px solid #4ade80", color: "white", borderRadius: 4 }} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#f87171", fontWeight:"bold" }}>Costo Compra</span>
                  <input type="number" min="0" placeholder="0.00" value={form.cost} onKeyDown={preventNegativeKey} onChange={e => setForm({...form, cost: sanitizeMoney(e.target.value)})} onBlur={e => setForm(f => ({...f, cost: formatMoneyBlur(f.cost)}))} style={{ padding: 8, background: "#222", border: "1px solid #f87171", color: "white", borderRadius: 4 }} />
              </label>
              <div style={{display:"flex", flexDirection:"column", gap:10}}>
                 <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "#222", padding: "8px 10px", borderRadius: 4, border: "1px solid #444" }}><input type="checkbox" checked={form.taxable} onChange={e => setForm({...form, taxable: e.target.checked})} /><span style={{ fontSize: 13, color: form.taxable ? "#60a5fa" : "#aaa" }}>Grava IVA (16%)</span></label>
                 <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "#222", padding: "8px 10px", borderRadius: 4, border: "1px solid #444" }}><input type="checkbox" checked={form.isOnDemand} onChange={e => setForm({...form, isOnDemand: e.target.checked})} /><span style={{ fontSize: 13, color: form.isOnDemand ? "#4ade80" : "#aaa" }}>Sobre Pedido</span></label>
              </div>
              {!form.isOnDemand && (
                <>
                  <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#aaa" }}>Stock</span><input type="number" min="0" required placeholder="0" value={form.stock} onKeyDown={preventNegativeKey} onChange={e => setForm({...form, stock: sanitizeMoney(e.target.value)})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} /></label>
                  <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#aaa" }}>Mínimo</span><input type="number" min="1" placeholder="1" value={form.minStock} onKeyDown={preventNegativeKey} onChange={e => setForm({...form, minStock: sanitizeMoney(e.target.value)})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} /></label>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button type="submit" style={{ background: "#16a34a", color: "white", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>{form.id ? "Guardar Cambios" : "Crear Producto"}</button>
              <button type="button" onClick={handleCancel} style={{ background: "transparent", border: "1px solid #555", color: "#aaa", padding: "10px 20px", borderRadius: 6, cursor: "pointer" }}>Cancelar</button>
            </div>
          </form>
        </section>
      )}

      <input placeholder="Buscar producto..." value={query} onChange={e => setQuery(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 20, background: "#1a1a1a", border: "1px solid #333", color: "white", borderRadius: 8 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 15 }}>
        {filtered.length === 0 && <p style={{ color: "#666", gridColumn: "1 / -1", textAlign: "center" }}>No hay productos en inventario.</p>}
        {filtered.map(p => (
          <div key={p.id} style={{ background: "#111", border: "1px solid #333", borderRadius: 10, padding: 16, display: "grid", gap: 8, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div style={{ display: "flex", gap: 4 }}>
                <span style={{ fontSize: 10, background: "#333", padding: "2px 6px", borderRadius: 4, color: "#ccc" }}>{CATEGORIES.find(c => c.id === p.category)?.label || p.category}</span>
              </div>
              <div style={{textAlign:"right"}}><div style={{ fontSize: 18, fontWeight: "bold", color: "#4ade80" }}>${Number(p.price).toLocaleString()}</div></div>
            </div>
            <div><div style={{ fontWeight: "bold", fontSize: "1.1em" }}>{p.brand}</div><div style={{ color: "#aaa" }}>{p.model}</div></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 10, borderTop: "1px solid #222" }}>
              {p.isOnDemand ? <div style={{ color: "#60a5fa", fontSize: 12 }}>🔄 Sobre Pedido</div> : <div style={{ color: Number(p.stock) <= Number(p.minStock) ? "#f87171" : "#fff", fontWeight: "bold" }}>📦 Stock: {p.stock}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                {!p.isOnDemand && <button onClick={() => setHistoryProduct(p)} style={{ fontSize: 11, background: "#333", border: "1px solid #555", color: "#ddd", cursor: "pointer", borderRadius:4, padding:"2px 6px" }}>📜 Kardex</button>}
                <button onClick={() => handleEdit(p)} style={{ fontSize: 12, background: "transparent", border: "none", color: "#60a5fa", cursor: "pointer" }}>Editar</button>
                <button onClick={() => handleDelete(p.id)} style={{ fontSize: 12, background: "transparent", border: "none", color: "#666", cursor: "pointer" }}>Borrar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}