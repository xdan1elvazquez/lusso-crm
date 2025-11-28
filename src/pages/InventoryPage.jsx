import { useState, useMemo } from "react";
// Simularemos el storage aquí mismo por simplicidad inicial, 
// luego lo moveremos a src/services/inventoryStorage.js
const CATEGORIES = [
  { id: "FRAMES", label: "Armazones" },
  { id: "CONTACT_LENS", label: "Lentes de Contacto" },
  { id: "LENSES", label: "Micas / Lentes" },
  { id: "ACCESSORY", label: "Accesorios" },
  { id: "OTHER", label: "Otros" },
];

export default function InventoryPage() {
  // Estado local temporal (luego conectamos al storage real)
  const [products, setProducts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ id: null, category: "FRAMES", brand: "", model: "", price: "", stock: "" });

  const handleSave = (e) => {
    e.preventDefault();
    if (form.id) {
      // Editar
      setProducts(prev => prev.map(p => p.id === form.id ? form : p));
    } else {
      // Crear
      setProducts(prev => [...prev, { ...form, id: crypto.randomUUID() }]);
    }
    setIsEditing(false);
    setForm({ id: null, category: "FRAMES", brand: "", model: "", price: "", stock: "" });
  };

  const handleEdit = (prod) => {
    setForm(prod);
    setIsEditing(true);
  };

  const handleDelete = (id) => {
    if (confirm("¿Eliminar producto?")) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>Inventario</h1>
        <button 
          onClick={() => { setForm({ id: null, category: "FRAMES", brand: "", model: "", price: "", stock: "" }); setIsEditing(true); }}
          style={{ background: "#2563eb", color: "white", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
        >
          + Nuevo Producto
        </button>
      </div>

      {isEditing && (
        <form onSubmit={handleSave} style={{ background: "#1a1a1a", padding: 20, borderRadius: 10, marginBottom: 20, display: "grid", gap: 15, border: "1px solid #333" }}>
          <h3 style={{ margin: 0, color: "#4ade80" }}>{form.id ? "Editar Producto" : "Registrar Producto"}</h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15 }}>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 12, color: "#888" }}>Categoría</span>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 12, color: "#888" }}>Marca</span>
              <input required placeholder="Ej. RayBan" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
            </label>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 12, color: "#888" }}>Modelo</span>
              <input required placeholder="Ej. Wayfarer" value={form.model} onChange={e => setForm({...form, model: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 12, color: "#888" }}>Precio Público ($)</span>
              <input type="number" required placeholder="0.00" value={form.price} onChange={e => setForm({...form, price: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
            </label>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 12, color: "#888" }}>Stock Inicial</span>
              <input type="number" required placeholder="0" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
            </label>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" style={{ background: "#16a34a", color: "white", border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}>Guardar</button>
            <button type="button" onClick={() => setIsEditing(false)} style={{ background: "transparent", border: "1px solid #666", color: "#aaa", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}>Cancelar</button>
          </div>
        </form>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 15 }}>
        {products.length === 0 && <p style={{ opacity: 0.6 }}>Tu bodega está vacía.</p>}
        
        {products.map(p => (
          <div key={p.id} style={{ background: "#111", border: "1px solid #333", borderRadius: 10, padding: 15 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, background: "#333", padding: "2px 6px", borderRadius: 4, color: "#ccc" }}>{CATEGORIES.find(c => c.id === p.category)?.label}</span>
              <span style={{ fontWeight: "bold", color: "#4ade80" }}>${p.price}</span>
            </div>
            <div style={{ fontWeight: "bold", fontSize: "1.1em" }}>{p.brand}</div>
            <div style={{ color: "#aaa", fontSize: "0.9em", marginBottom: 10 }}>{p.model}</div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #222", paddingTop: 10 }}>
              <span style={{ fontSize: 13 }}>📦 Stock: <b>{p.stock}</b></span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleEdit(p)} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: 12 }}>Editar</button>
                <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 12 }}>Borrar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}