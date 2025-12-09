import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // 👈 1. Importar Auth
import { getPatients } from "@/services/patientsStorage";
import LoadingState from "@/components/LoadingState";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge"; 

export default function StatisticsPage() {
  const { user } = useAuth(); // 👈 2. Conectar usuario
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]); 

  const refreshData = async () => {
      // Esperamos auth
      if (!user?.branchId) return;

      setLoading(true);
      try {
          // Nota: Los pacientes son GLOBALES por regla de negocio #5.
          // No filtramos por branchId aquí para ver el alcance total de la marca.
          const data = await getPatients();
          setPatients(Array.isArray(data) ? data : []);
      } catch (error) { console.error(error); setPatients([]); } 
      finally { setLoading(false); }
  };

  useEffect(() => { 
      if (user?.branchId) refreshData(); 
  }, [user]);

  const safePatients = Array.isArray(patients) ? patients : [];

  // --- 1. ESTADÍSTICAS GEO ---
  const zipStats = useMemo(() => {
    if (safePatients.length === 0) return [];
    const counts = {};
    safePatients.forEach(p => { if (p.address?.zip) counts[p.address.zip] = (counts[p.address.zip] || 0) + 1; });
    return Object.entries(counts)
      .map(([zip, count]) => ({ zip, count, percent: ((count / safePatients.length) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);
  }, [safePatients]);

  // --- 2. ESTADÍSTICAS ORIGEN ---
  const sourceStats = useMemo(() => {
    if (safePatients.length === 0) return [];
    const counts = {};
    safePatients.forEach(p => { const src = p.referralSource || "Desconocido"; counts[src] = (counts[src] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, percent: ((count / safePatients.length) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);
  }, [safePatients]);

  if (loading) return <LoadingState />;

  return (
    <div className="page-container space-y-8 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-white tracking-tight">Estadísticas</h1>
           <div className="flex items-center gap-2 mt-1">
               <p className="text-textMuted text-sm">Análisis demográfico de pacientes</p>
               <Badge color="blue" className="text-[10px]">Datos Globales</Badge>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* KPI GLOBAL */}
          <Card className="flex flex-col justify-center items-center text-center p-8 border-blue-500/30 bg-blue-900/10">
             <div className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-2">Total Pacientes (Red)</div>
             <div className="text-5xl font-bold text-white mb-4">{safePatients.length}</div>
             <div className="w-full pt-4 border-t border-blue-500/20 flex justify-between text-xs text-blue-200">
                <span>Con Código Postal</span>
                <span className="font-bold">{safePatients.filter(p => p.address?.zip).length}</span>
             </div>
          </Card>

          {/* TOP ZONAS */}
          <StatCard title="Top Zonas (C.P.)" icon="📍" color="text-pink-400">
             {zipStats.slice(0, 6).map((item, i) => (
                 <StatRow key={i} label={item.zip} count={item.count} percent={item.percent} color="bg-pink-500" />
             ))}
             {zipStats.length === 0 && <p className="text-textMuted text-sm italic">Sin datos geográficos.</p>}
          </StatCard>
          
          {/* FUENTES */}
          <StatCard title="Fuentes de Captación" icon="📢" color="text-blue-400">
             {sourceStats.slice(0, 6).map((item, i) => (
                 <StatRow key={i} label={item.name} count={item.count} percent={item.percent} color="bg-blue-500" />
             ))}
             {sourceStats.length === 0 && <p className="text-textMuted text-sm italic">Sin datos de origen.</p>}
          </StatCard>
      </div>
    </div>
  );
}

const StatCard = ({ title, icon, color, children }) => (
    <Card>
      <h3 className={`text-lg font-bold ${color} mb-6 flex items-center gap-2`}>
          <span>{icon}</span> {title}
      </h3>
      <div className="space-y-4">
          {children}
      </div>
    </Card>
);

const StatRow = ({ label, count, percent, color }) => (
    <div>
        <div className="flex justify-between items-center text-sm mb-1">
            <span className="text-white font-medium">{label}</span>
            <span className="text-textMuted">{count} <span className="text-xs opacity-50">({percent}%)</span></span>
        </div>
        <div className="h-1.5 w-full bg-surfaceHighlight rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }}></div>
        </div>
    </div>
);