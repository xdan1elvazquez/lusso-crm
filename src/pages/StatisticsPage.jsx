import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPatients } from "@/services/patientsStorage";
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

  const refreshData = async () => {
      if (!user?.branchId) return;

      setLoading(true);
      try {
          const data = await getPatients();
          setPatients(Array.isArray(data) ? data : []);
      } catch (error) { console.error(error); setPatients([]); } 
      finally { setLoading(false); }
  };

  useEffect(() => { 
      if (user?.branchId) refreshData(); 
  }, [user]);

  const safePatients = Array.isArray(patients) ? patients : [];

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

  // 3. ESTADÍSTICAS SEXO (NUEVO)
  const sexStats = useMemo(() => {
      if (safePatients.length === 0) return [];
      const counts = { MUJER: 0, HOMBRE: 0, OTRO: 0 };
      
      safePatients.forEach(p => {
          // Normalizamos porque a veces viene como "Mujer", "MUJER", etc.
          const sex = (p.assignedSex || p.sex || "OTRO").toUpperCase();
          if (sex === "MUJER") counts.MUJER++;
          else if (sex === "HOMBRE") counts.HOMBRE++;
          else counts.OTRO++;
      });

      return [
          { name: "Mujeres", count: counts.MUJER, percent: ((counts.MUJER / safePatients.length) * 100).toFixed(1), color: "bg-pink-500" },
          { name: "Hombres", count: counts.HOMBRE, percent: ((counts.HOMBRE / safePatients.length) * 100).toFixed(1), color: "bg-blue-500" },
          { name: "Otro / N/A", count: counts.OTRO, percent: ((counts.OTRO / safePatients.length) * 100).toFixed(1), color: "bg-gray-500" }
      ].filter(item => item.count > 0); // Solo mostramos lo que tenga datos
  }, [safePatients]);

  // 4. ESTADÍSTICAS EDAD (NUEVO)
  const ageStats = useMemo(() => {
      const validPatients = safePatients.filter(p => p.dob);
      if (validPatients.length === 0) return [];

      // Definimos los rangos (Buckets)
      const buckets = {
          "0-10 (Niños)": 0,
          "11-20 (Adolescentes)": 0,
          "21-30 (Jóvenes)": 0,
          "31-40 (Adultos)": 0,
          "41-50 (Présbitas)": 0,
          "51-60 (Maduros)": 0,
          "61+ (Mayores)": 0
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
          .map(([range, count]) => ({ 
              range, 
              count, 
              percent: ((count / validPatients.length) * 100).toFixed(1) 
          }))
          // Filtramos los que tengan 0 para no ensuciar la gráfica
          .filter(i => i.count > 0); 
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* KPI GLOBAL - Ocupa 2 columnas en móvil, 1 en escritorio */}
          <Card className="flex flex-col justify-center items-center text-center p-6 border-blue-500/30 bg-blue-900/10 md:col-span-2 xl:col-span-1">
             <div className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-2">Total Pacientes</div>
             <div className="text-5xl font-bold text-white mb-4">{safePatients.length}</div>
             <div className="w-full pt-4 border-t border-blue-500/20 flex justify-between text-xs text-blue-200">
                <span>Expedientes completos</span>
                <span className="font-bold">{safePatients.filter(p => p.address?.zip && p.phone).length}</span>
             </div>
          </Card>

          {/* DISTRIBUCIÓN POR SEXO (NUEVO) */}
          <StatCard title="Sexo" icon="⚧️" color="text-purple-400">
             {sexStats.map((item, i) => (
                 <StatRow key={i} label={item.name} count={item.count} percent={item.percent} color={item.color} />
             ))}
             {sexStats.length === 0 && <p className="text-textMuted text-xs italic">Sin datos.</p>}
          </StatCard>

          {/* DISTRIBUCIÓN POR EDAD (NUEVO) */}
          <StatCard title="Rango de Edad" icon="🎂" color="text-green-400" className="md:col-span-2 xl:col-span-1">
             {ageStats.map((item, i) => (
                 <StatRow key={i} label={item.range} count={item.count} percent={item.percent} color="bg-green-500" />
             ))}
             {ageStats.length === 0 && <p className="text-textMuted text-xs italic">Sin fechas de nacimiento registradas.</p>}
          </StatCard>
          
          {/* FUENTES DE CAPTACIÓN */}
          <StatCard title="Fuentes" icon="📢" color="text-amber-400">
             {sourceStats.slice(0, 5).map((item, i) => (
                 <StatRow key={i} label={item.name} count={item.count} percent={item.percent} color="bg-amber-500" />
             ))}
          </StatCard>
      </div>

      {/* FILA INFERIOR: DETALLES GEO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard title="Top Zonas (Código Postal)" icon="📍" color="text-pink-400">
             <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                 {zipStats.slice(0, 8).map((item, i) => (
                     <StatRow key={i} label={item.zip} count={item.count} percent={item.percent} color="bg-pink-500" />
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