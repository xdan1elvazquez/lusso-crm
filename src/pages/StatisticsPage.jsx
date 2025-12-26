import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPatients } from "@/services/patientsStorage";
import { getAllSales } from "@/services/salesStorage"; // 👈 Importamos ventas
import { getAllProducts } from "@/services/inventoryStorage"; // 👈 Importamos productos para leer tags
import LoadingState from "@/components/LoadingState";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge"; 

// Helper simple para calcular edad
function getAge(dateString) {
  if (!dateString) return null;
  const today = new Date();
  const birthDate = new Date(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
  }
  return age;
}

export default function StatisticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]); 
  const [sales, setSales] = useState([]); // 👈 Estado para ventas
  const [products, setProducts] = useState([]); // 👈 Estado para productos

  const refreshData = async () => {
      if (!user?.branchId) return;

      setLoading(true);
      try {
          // Cargamos todo en paralelo
          const [pts, sls, prds] = await Promise.all([
              getPatients(),
              getAllSales(user.branchId),
              getAllProducts()
          ]);
          
          setPatients(Array.isArray(pts) ? pts : []);
          setSales(Array.isArray(sls) ? sls : []);
          setProducts(Array.isArray(prds) ? prds : []);

      } catch (error) { 
          console.error(error); 
          // Fallback seguro
          setPatients([]); setSales([]); setProducts([]);
      } 
      finally { setLoading(false); }
  };

  useEffect(() => { 
      if (user?.branchId) refreshData(); 
  }, [user]);

  const safePatients = Array.isArray(patients) ? patients : [];

  // --- ANÁLISIS DEMOGRÁFICO ---

  // 1. ESTADÍSTICAS GEO
  const zipStats = useMemo(() => {
    if (safePatients.length === 0) return [];
    const counts = {};
    safePatients.forEach(p => { if (p.address?.zip) counts[p.address.zip] = (counts[p.address.zip] || 0) + 1; });
    return Object.entries(counts)
      .map(([zip, count]) => ({ zip, count, percent: ((count / safePatients.length) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);
  }, [safePatients]);

  // 2. ESTADÍSTICAS ORIGEN
  const sourceStats = useMemo(() => {
    if (safePatients.length === 0) return [];
    const counts = {};
    safePatients.forEach(p => { const src = p.referralSource || "Desconocido"; counts[src] = (counts[src] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, percent: ((count / safePatients.length) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);
  }, [safePatients]);

  // 3. ESTADÍSTICAS SEXO PACIENTES
  const sexStats = useMemo(() => {
      if (safePatients.length === 0) return [];
      const counts = { MUJER: 0, HOMBRE: 0, OTRO: 0 };
      
      safePatients.forEach(p => {
          const sex = (p.assignedSex || p.sex || "OTRO").toUpperCase();
          if (sex === "MUJER") counts.MUJER++;
          else if (sex === "HOMBRE") counts.HOMBRE++;
          else counts.OTRO++;
      });

      return [
          { name: "Mujeres", count: counts.MUJER, percent: ((counts.MUJER / safePatients.length) * 100).toFixed(1), color: "bg-pink-500" },
          { name: "Hombres", count: counts.HOMBRE, percent: ((counts.HOMBRE / safePatients.length) * 100).toFixed(1), color: "bg-blue-500" },
          { name: "Otro / N/A", count: counts.OTRO, percent: ((counts.OTRO / safePatients.length) * 100).toFixed(1), color: "bg-gray-500" }
      ].filter(item => item.count > 0);
  }, [safePatients]);

  // 4. ESTADÍSTICAS EDAD
  const ageStats = useMemo(() => {
      const validPatients = safePatients.filter(p => p.dob);
      if (validPatients.length === 0) return [];

      const buckets = {
          "0-10 (Niños)": 0, "11-20 (Adolescentes)": 0, "21-30 (Jóvenes)": 0,
          "31-40 (Adultos)": 0, "41-50 (Présbitas)": 0, "51-60 (Maduros)": 0, "61+ (Mayores)": 0
      };

      validPatients.forEach(p => {
          const age = getAge(p.dob);
          if (age === null) return;
          if (age <= 10) buckets["0-10 (Niños)"]++;
          else if (age <= 20) buckets["11-20 (Adolescentes)"]++;
          else if (age <= 30) buckets["21-30 (Jóvenes)"]++;
          else if (age <= 40) buckets["31-40 (Adultos)"]++;
          else if (age <= 50) buckets["41-50 (Présbitas)"]++;
          else if (age <= 60) buckets["51-60 (Maduros)"]++;
          else buckets["61+ (Mayores)"]++;
      });

      return Object.entries(buckets)
          .map(([range, count]) => ({ range, count, percent: ((count / validPatients.length) * 100).toFixed(1) }))
          .filter(i => i.count > 0); 
  }, [safePatients]);

  // --- ANÁLISIS DE PRODUCTO (NUEVO) ---
  const productStats = useMemo(() => {
      if (sales.length === 0 || products.length === 0) return null;

      // 1. Mapa rápido de Tags de Productos para buscar por ID
      // Esto nos permite analizar ventas pasadas aunque el item guardado en venta no tuviera tags
      const productTagsMap = {};
      products.forEach(p => {
          if (p.tags) productTagsMap[p.id] = p.tags;
      });

      const stats = { colors: {}, materials: {}, genders: {} };
      let totalItemsAnalyzed = 0;

      sales.forEach(sale => {
          if (sale.status === 'CANCELLED') return;
          
          (sale.items || []).forEach(item => {
              // Intentamos sacar tags del item de venta, o del catálogo actual
              let tags = item.tags;
              if (!tags && item.inventoryProductId) {
                  tags = productTagsMap[item.inventoryProductId];
              }

              // Solo contamos si es un producto físico (tiene tags relevantes)
              if (tags && (tags.color || tags.material || tags.gender)) {
                  const qty = Number(item.qty) || 1;
                  totalItemsAnalyzed += qty;

                  if (tags.color && tags.color !== "Otro") 
                      stats.colors[tags.color] = (stats.colors[tags.color] || 0) + qty;
                  
                  if (tags.material && tags.material !== "Otro") 
                      stats.materials[tags.material] = (stats.materials[tags.material] || 0) + qty;
                  
                  if (tags.gender) 
                      stats.genders[tags.gender] = (stats.genders[tags.gender] || 0) + qty;
              }
          });
      });

      if (totalItemsAnalyzed === 0) return null;

      // Helper de formateo
      const format = (obj) => Object.entries(obj)
          .sort((a,b) => b[1] - a[1]) // Ordenar mayor a menor
          .slice(0, 6) // Top 6
          .map(([name, count]) => ({
              name, 
              count, 
              percent: ((count / totalItemsAnalyzed) * 100).toFixed(1)
          }));

      return {
          colors: format(stats.colors),
          materials: format(stats.materials),
          genders: format(stats.genders),
          total: totalItemsAnalyzed
      };
  }, [sales, products]);


  if (loading) return <LoadingState />;

  return (
    <div className="page-container space-y-8 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-white tracking-tight">Estadísticas</h1>
           <div className="flex items-center gap-2 mt-1">
               <p className="text-textMuted text-sm">Inteligencia de negocio y demografía</p>
               <Badge color="blue" className="text-[10px]">Datos Globales</Badge>
           </div>
        </div>
      </div>

      {/* SECCIÓN 1: DEMOGRAFÍA */}
      <div>
        <h2 className="text-sm font-bold text-textMuted uppercase tracking-widest mb-4 border-b border-border pb-2">👥 Demografía de Pacientes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card className="flex flex-col justify-center items-center text-center p-6 border-blue-500/30 bg-blue-900/10 md:col-span-2 xl:col-span-1">
                <div className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-2">Total Pacientes</div>
                <div className="text-5xl font-bold text-white mb-4">{safePatients.length}</div>
                <div className="w-full pt-4 border-t border-blue-500/20 flex justify-between text-xs text-blue-200">
                    <span>Expedientes completos</span>
                    <span className="font-bold">{safePatients.filter(p => p.address?.zip && p.phone).length}</span>
                </div>
            </Card>

            <StatCard title="Sexo (Pacientes)" icon="⚧️" color="text-purple-400">
                {sexStats.map((item, i) => (
                    <StatRow key={i} label={item.name} count={item.count} percent={item.percent} color={item.color} />
                ))}
            </StatCard>

            <StatCard title="Rango de Edad" icon="🎂" color="text-green-400" className="md:col-span-2 xl:col-span-1">
                {ageStats.map((item, i) => (
                    <StatRow key={i} label={item.range} count={item.count} percent={item.percent} color="bg-green-500" />
                ))}
            </StatCard>
            
            <StatCard title="Fuentes de Captación" icon="📢" color="text-amber-400">
                {sourceStats.slice(0, 5).map((item, i) => (
                    <StatRow key={i} label={item.name} count={item.count} percent={item.percent} color="bg-amber-500" />
                ))}
            </StatCard>
        </div>
      </div>

      {/* SECCIÓN 2: PRODUCTOS VENDIDOS (NUEVO) */}
      {productStats && (
          <div>
            <h2 className="text-sm font-bold text-textMuted uppercase tracking-widest mb-4 mt-8 border-b border-border pb-2">👓 Inteligencia de Producto (Top Ventas)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Top Materiales" icon="💎" color="text-cyan-400">
                    {productStats.materials.map((item, i) => (
                        <StatRow key={i} label={item.name} count={item.count} percent={item.percent} color="bg-cyan-500" />
                    ))}
                    {productStats.materials.length === 0 && <p className="text-textMuted italic text-xs">Sin datos suficientes</p>}
                </StatCard>

                <StatCard title="Top Colores" icon="🎨" color="text-pink-400">
                    {productStats.colors.map((item, i) => (
                        <StatRow key={i} label={item.name} count={item.count} percent={item.percent} color="bg-pink-500" />
                    ))}
                </StatCard>

                <StatCard title="Estilo / Género Armazón" icon="🕶️" color="text-indigo-400">
                    {productStats.genders.map((item, i) => (
                        <StatRow key={i} label={item.name} count={item.count} percent={item.percent} color="bg-indigo-500" />
                    ))}
                </StatCard>
            </div>
          </div>
      )}

      {/* SECCIÓN 3: GEO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard title="Top Zonas (Código Postal)" icon="📍" color="text-red-400">
             <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                 {zipStats.slice(0, 8).map((item, i) => (
                     <StatRow key={i} label={item.zip} count={item.count} percent={item.percent} color="bg-red-500" />
                 ))}
             </div>
             {zipStats.length === 0 && <p className="text-textMuted text-sm italic">Sin datos geográficos.</p>}
          </StatCard>
      </div>
    </div>
  );
}

// Componentes UI Auxiliares
const StatCard = ({ title, icon, color, children, className="" }) => (
    <Card className={className}>
      <h3 className={`text-lg font-bold ${color} mb-4 flex items-center gap-2`}>
          <span>{icon}</span> {title}
      </h3>
      <div className="space-y-3">
          {children}
      </div>
    </Card>
);

const StatRow = ({ label, count, percent, color }) => (
    <div>
        <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-white font-medium truncate pr-2">{label}</span>
            <span className="text-textMuted whitespace-nowrap">{count} <span className="opacity-50">({percent}%)</span></span>
        </div>
        <div className="h-1.5 w-full bg-surfaceHighlight rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }}></div>
        </div>
    </div>
);