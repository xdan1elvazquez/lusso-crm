import { useMemo, useState, useEffect } from "react";
import { 
  getAllProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getInventoryStats 
} from "@/services/inventoryStorage";
import { getAlertSettings, updateAlertSettings } from "@/services/settingsStorage";

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
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  
  // --- ESTADOS DE UI ---
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false); // 👈 Controla el modal de alertas
  
  const [alerts, setAlerts] = useState({ minTotalFrames: 0, minMen: 0, minWomen: 0, minUnisex: 0, minKids: 0 });

  // Estado del formulario de producto
  const [form, setForm] = useState({
    id: null, category: "FRAMES", brand: "", model: "", price: "", stock: "", minStock: "1", isOnDemand: false, taxable: true,
    tags: { gender: "UNISEX", material: "ACETATO", color: "", presentation: "DROPS" }
  });

  const products = useMemo(() => getAllProducts(), [tick]);
  const stats = useMemo(() => getInventoryStats(), [tick]);

  // Cargar alertas al montar el componente
  useEffect(() => {
    setAlerts(getAlertSettings());
  }, [isConfiguring]); // Recargar también cuando cerramos el modal por seguridad

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return products;
    return products.filter(p => 
      p.brand.toLowerCase().includes(q) || 
      p.model.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [products, query]);

  // --- LÓGICA DE PRODUCTOS ---
  const resetForm = () => {
    setForm({ 
      id: null, category: "FRAMES", brand: "", model: "", price: "", stock: "", minStock: "1", isOnDemand: false, taxable: true,
      tags: { gender: "UNISEX", material: "ACETATO", color: "", presentation: "DROPS" }
    });
  };

  const handleNewProduct = () => { resetForm(); setIsEditingProduct(true); };
  const handleCancel = () => { resetForm(); setIsEditingProduct(false); };

  const handleSubmitProduct = (e) => {
    e.preventDefault();
    if (form.id) updateProduct(form.id, form);
    else createProduct(form);
    handleCancel();
    setTick(t => t + 1);
  };

  const handleEdit = (product) => {
    setForm({
      ...product,
      taxable: product.taxable !== undefined ? product.taxable : true,
      tags: { gender: "UNISEX", material: "OTRO", color: "", presentation: "DROPS", ...product.tags }
    });
    setIsEditingProduct(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (confirm("¿Borrar producto?")) { deleteProduct(id); setTick(t => t + 1); }
  };

  // --- LÓGICA DE ALERTAS ---
  const handleSaveConfig = (e) => {
    e.preventDefault();
    updateAlertSettings(alerts);
    setIsConfiguring(false); // Cierra el modal al guardar
  };

  const StatCard = ({ label, value, subtext, alertThreshold, isInverse }) => {
    let statusColor = "#4ade80";
    if (isInverse) {
       if (value > 0) statusColor = "#f87171";
    } else {
       if (value < alertThreshold) statusColor = "#f87171";
       else if (value < alertThreshold * 1.2) statusColor = "#facc15";
    }

    return (
      <div style={{ background: "#1a1a1a", border: `1px solid ${statusColor}`, borderRadius: 10, padding: 15, position: "relative", overflow:"hidden" }}>
        <div style={{ width: 4, height: "100%", background: statusColor, position: "absolute", left: 0, top: 0 }}></div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 4, display:"flex", justifyContent:"space-between" }}>
           <span>{label}</span>
           {!isInverse && <span style={{fontSize:10, opacity:0.5}}>Meta: {alertThreshold}</span>}
        </div>
        <div style={{ fontSize: 24, fontWeight: "bold", color: "white" }}>{value}</div>
        {subtext && <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{subtext}</div>}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 40, width: "100%" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Inventario</h1>
        <div style={{ display: "flex", gap: 10 }}>
          {/* BOTÓN DE ALERTAS QUE ABRE EL MODAL */}
          <button 
            onClick={() => setIsConfiguring(true)} 
            style={{ background: "#333", color: "#ddd", border: "1px solid #555", padding: "10px 15px", borderRadius: 6, cursor: "pointer" }}
          >
            ⚙️ Alertas
          </button>
          <button 
            onClick={handleNewProduct} 
            style={{ background: "#2563eb", color: "white", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
          >
            + Nuevo Producto
          </button>
        </div>
      </div>

      {/* DASHBOARD */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 15, marginBottom: 30 }}>
        <StatCard label="Total Armazones" value={stats.totalFrames} alertThreshold={alerts.minTotalFrames} />
        <StatCard label="Hombres" value={stats.byGender.hombre} alertThreshold={alerts.minMen} />
        <StatCard label="Mujeres" value={stats.byGender.mujer} alertThreshold={alerts.minWomen} />
        <StatCard label="Stock Bajo" value={stats.lowStock} isInverse={true} subtext="Productos por agotar" />
      </div>

      {/* MODAL DE CONFIGURACIÓN DE ALERTAS */}
      {isConfiguring && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <form onSubmit={handleSaveConfig} style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333", width: "100%", maxWidth: 400 }}>
            <h3 style={{ marginTop: 0, color: "#e5e7eb" }}>Metas de Inventario</h3>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
              El sistema te avisará (Rojo) si bajas de estos números.
            </p>

            <div style={{ display: "grid", gap: 15 }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#ccc", fontSize: 13 }}>Total Armazones</span>
                <input type="number" value={alerts.minTotalFrames} onChange={e => setAlerts({...alerts, minTotalFrames: e.target.value})} style={{ width: 80, padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#ccc", fontSize: 13 }}>Mínimo Hombres</span>
                <input type="number" value={alerts.minMen} onChange={e => setAlerts({...alerts, minMen: e.target.value})} style={{ width: 80, padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#ccc", fontSize: 13 }}>Mínimo Mujeres</span>
                <input type="number" value={alerts.minWomen} onChange={e => setAlerts({...alerts, minWomen: e.target.value})} style={{ width: 80, padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
              </label>
              
              <div style={{ borderTop: "1px solid #333", margin: "5px 0" }}></div>
              
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setIsConfiguring(false)} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>Guardar Reglas</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* FORMULARIO DE PRODUCTO (OCULTO SI NO ESTÁ EDITANDO) */}
      {isEditingProduct && (
        <section style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", marginBottom: 30 }}>
          <h3 style={{ marginTop: 0, color: "#e5e7eb" }}>{form.id ? "Editar Producto" : "Nuevo Producto"}</h3>
          <form onSubmit={handleSubmitProduct} style={{ display: "grid", gap: 20 }}>
            
            {/* GRID 3 COLUMNAS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#aaa" }}>Categoría</span>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#aaa" }}>Marca</span>
                <input required placeholder="Ej. RayBan" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#aaa" }}>Modelo</span>
                <input required placeholder="Ej. Aviator" value={form.model} onChange={e => setForm({...form, model: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
              </label>
            </div>

            {/* CAMPOS DINÁMICOS */}
            {form.category === "FRAMES" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15, padding: 15, background: "#111", borderRadius: 8 }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#60a5fa" }}>Género</span>
                  <select value={form.tags.gender} onChange={e => setForm({...form, tags: {...form.tags, gender: e.target.value}})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }}>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#60a5fa" }}>Material</span>
                  <select value={form.tags.material} onChange={e => setForm({...form, tags: {...form.tags, material: e.target.value}})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }}>
                    {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
              </div>
            )}

            {form.category === "MEDICATION" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15, padding: 15, background: "#064e3b", borderRadius: 8, border: "1px solid #059669" }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#a7f3d0" }}>Presentación</span>
                  <select value={form.tags.presentation} onChange={e => setForm({...form, tags: {...form.tags, presentation: e.target.value}})} style={{ padding: 8, background: "#065f46", border: "1px solid #10b981", color: "white", borderRadius: 4 }}>
                    {PRESENTATIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </label>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#aaa" }}>Precio ($)</span>
                <input type="number" required placeholder="0.00" value={form.price} onChange={e => setForm({...form, price: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
              </label>
              
              <div style={{display:"flex", flexDirection:"column", gap:10}}>
                 <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "#222", padding: "8px 10px", borderRadius: 4, border: "1px solid #444" }}>
                    <input type="checkbox" checked={form.taxable} onChange={e => setForm({...form, taxable: e.target.checked})} />
                    <span style={{ fontSize: 13, color: form.taxable ? "#60a5fa" : "#aaa" }}>Grava IVA (16%)</span>
                 </label>
                 <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "#222", padding: "8px 10px", borderRadius: 4, border: "1px solid #444" }}>
                    <input type="checkbox" checked={form.isOnDemand} onChange={e => setForm({...form, isOnDemand: e.target.checked})} />
                    <span style={{ fontSize: 13, color: form.isOnDemand ? "#4ade80" : "#aaa" }}>Sobre Pedido</span>
                 </label>
              </div>

              {!form.isOnDemand && (
                <>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#aaa" }}>Stock Físico</span>
                    <input type="number" required placeholder="0" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#aaa" }}>Alerta Mínimo</span>
                    <input type="number" placeholder="1" value={form.minStock} onChange={e => setForm({...form, minStock: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
                  </label>
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

      {/* LISTA DE PRODUCTOS */}
      <input placeholder="Buscar producto..." value={query} onChange={e => setQuery(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 20, background: "#1a1a1a", border: "1px solid #333", color: "white", borderRadius: 8 }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 15 }}>
        {filtered.length === 0 && <p style={{ color: "#666", gridColumn: "1 / -1", textAlign: "center" }}>No hay productos en inventario.</p>}
        {filtered.map(p => (
          <div key={p.id} style={{ background: "#111", border: "1px solid #333", borderRadius: 10, padding: 16, display: "grid", gap: 8, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div style={{ display: "flex", gap: 4 }}>
                <span style={{ fontSize: 10, background: "#333", padding: "2px 6px", borderRadius: 4, color: "#ccc" }}>{CATEGORIES.find(c => c.id === p.category)?.label || p.category}</span>
                {p.category === "MEDICATION" && <span style={{ fontSize: 10, background: "#064e3b", padding: "2px 6px", borderRadius: 4, color: "#a7f3d0" }}>💊 {PRESENTATIONS.find(pr => pr.id === p.tags?.presentation)?.label || "Med"}</span>}
              </div>
              <span style={{ fontSize: 18, fontWeight: "bold", color: "#4ade80" }}>${Number(p.price).toLocaleString()}</span>
            </div>
            <div>
              <div style={{ fontWeight: "bold", fontSize: "1.1em" }}>{p.brand}</div>
              <div style={{ color: "#aaa" }}>{p.model}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 10, borderTop: "1px solid #222" }}>
              {p.isOnDemand ? <div style={{ color: "#60a5fa", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>🔄 Sobre Pedido</div> : <div style={{ color: Number(p.stock) <= Number(p.minStock) ? "#f87171" : "#fff", fontWeight: "bold", display: "flex", alignItems: "center", gap: 6 }}>📦 Stock: {p.stock}</div>}
              <div style={{ display: "flex", gap: 8 }}>
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