import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // 👈 1. Importar Auth
import { getAllSales, deleteSale } from "@/services/salesStorage";
import SaleDetailModal from "@/components/SaleDetailModal";
import LoadingState from "@/components/LoadingState";
import { useConfirm, useNotify } from "@/context/UIContext";

// UI Kit
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";

const CATEGORIES = [
  { id: "ALL", label: "Todas las categorías" },
  { id: "LENSES", label: "Lentes / Micas" },
  { id: "FRAMES", label: "Armazones" },
  { id: "CONTACT_LENS", label: "Lentes de Contacto" },
  { id: "MEDICATION", label: "Farmacia" },
  { id: "CONSULTATION", label: "Consulta" },
  { id: "ACCESSORY", label: "Accesorios" },
  { id: "OTHER", label: "Otros" },
];

export default function SalesHistoryPage() {
  const { user } = useAuth(); // 👈 2. Obtener usuario
  const confirm = useConfirm();
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [viewSale, setViewSale] = useState(null);

  const refreshData = async () => {
      // Seguridad: esperar a que cargue el usuario
      if (!user?.branchId) return;

      setLoading(true);
      try {
          // 👈 3. Filtrar por sucursal
          const data = await getAllSales(user.branchId);
          setSales(data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { 
      if (user?.branchId) refreshData(); 
  }, [user]);

  const filtered = useMemo(() => {
    return sales.filter(s => {
      const pName = s.patientName || "Paciente (Histórico)";
      const textMatch = 
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        pName.toLowerCase().includes(search.toLowerCase()) ||
        s.total.toString().includes(search);
      
      if (!textMatch) return false;
      if (category !== "ALL" && s.kind !== category) return false;

      const sDate = s.createdAt.slice(0, 10);
      if (dateRange.start && sDate < dateRange.start) return false;
      if (dateRange.end && sDate > dateRange.end) return false;

      return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [sales, search, category, dateRange]);

  const handleDelete = async (id) => {
    if(await confirm({ title: "Cancelar Venta", message: "¿Estás seguro? Se revertirá el inventario y los puntos." })) {
      await deleteSale(id);
      refreshData();
      notify.success("Venta cancelada");
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-container space-y-6">
      <div className="flex justify-between items-center">
          <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Historial de Ventas</h1>
              <p className="text-textMuted text-sm">
                  Sucursal: <strong className="text-white">{user.branchId === 'lusso_main' ? 'Matriz' : 'Sucursal'}</strong> ({filtered.length} registros)
              </p>
          </div>
          <Button variant="ghost" onClick={() => { setSearch(""); setCategory("ALL"); setDateRange({start:"", end:""}); }}>Limpiar Filtros</Button>
      </div>

      {/* BARRA DE FILTROS */}
      <Card noPadding className="p-4 bg-surfaceHighlight/20 border-blue-500/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2">
                  <Input label="Buscar" value={search} onChange={e => setSearch(e.target.value)} placeholder="Folio, Paciente o Monto..." />
              </div>
              <Select label="Categoría" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
              <div className="flex gap-2">
                  <Input label="Desde" type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                  <Input label="Hasta" type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
              </div>
          </div>
      </Card>

      {/* TABLA DE RESULTADOS */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm text-left">
              <thead className="bg-surfaceHighlight text-textMuted uppercase text-xs font-bold">
                  <tr>
                      <th className="p-4">Fecha / Folio</th>
                      <th className="p-4">Paciente</th>
                      <th className="p-4">Detalle</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-border">
                  {filtered.length === 0 && (
                      <tr><td colSpan="6" className="p-8 text-center text-textMuted italic">No se encontraron ventas en esta sucursal.</td></tr>
                  )}
                  {filtered.map(s => (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                          <td className="p-4">
                              <div className="text-textMuted">{new Date(s.createdAt).toLocaleDateString()}</div>
                              <div className="font-mono text-xs text-blue-400 font-bold">#{s.id.slice(0,6).toUpperCase()}</div>
                          </td>
                          <td className="p-4 font-bold text-white">{s.patientName || "Paciente (Histórico)"}</td>
                          <td className="p-4">
                              <div className="text-white text-sm">{s.description}</div>
                              <Badge color="gray" className="text-[10px] mt-1">{s.kind}</Badge>
                          </td>
                          <td className="p-4 font-bold text-emerald-400">${s.total.toLocaleString()}</td>
                          <td className="p-4">
                              <Badge color={s.balance <= 0.01 ? "green" : "red"}>
                                  {s.balance <= 0.01 ? "PAGADO" : "PENDIENTE"}
                              </Badge>
                          </td>
                          <td className="p-4 text-right">
                              <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setViewSale(s)} className="text-textMuted hover:text-white p-2 rounded hover:bg-white/10" title="Ver Detalle">👁️</button>
                                  <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300 p-2 rounded hover:bg-red-500/10" title="Cancelar Venta">✕</button>
                              </div>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {viewSale && <SaleDetailModal sale={viewSale} patient={{firstName: viewSale.patientName || "Paciente", lastName: ""}} onClose={() => setViewSale(null)} onUpdate={refreshData} />}
    </div>
  );
}