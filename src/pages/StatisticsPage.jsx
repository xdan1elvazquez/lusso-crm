import { useMemo, useState } from "react";
import { getPatients } from "@/services/patientsStorage";

export default function StatisticsPage() {
  const [tick, setTick] = useState(0); // Por si queremos refrescar
  const patients = useMemo(() => getPatients(), [tick]);

  // --- 1. ESTADÍSTICAS POR CÓDIGO POSTAL (GEO) ---
  const zipStats = useMemo(() => {
    const counts = {};
    let withZip = 0;
    patients.forEach(p => {
        if (p.address?.zip) {
            counts[p.address.zip] = (counts[p.address.zip] || 0) + 1;
            withZip++;
        }
    });
    // Convertir a array y ordenar
    return Object.entries(counts)
      .map(([zip, count]) => ({ zip, count, percent: ((count / patients.length) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);
  }, [patients]);

  // --- 2. ESTADÍSTICAS DE MARKETING (ORIGEN) ---
  const sourceStats = useMemo(() => {
    const counts = {};
    patients.forEach(p => {
        const src = p.referralSource || "Desconocido";
        counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, percent: ((count / patients.length) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);
  }, [patients]);

  const StatCard = ({ title, data, icon, color }) => (
    <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
      <h3 style={{ margin: "0 0 15px 0", color }}>{icon} {title}</h3>
      <div style={{ display: "grid", gap: 10 }}>
         {data.slice(0, 6).map((item, i) => ( // Top 6
             <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333", paddingBottom: 8 }}>
                 <span style={{ fontSize: 14 }}>{item.zip || item.name}</span>
                 <div style={{ textAlign: "right" }}>
                     <div style={{ fontWeight: "bold", fontSize: 16 }}>{item.count}</div>
                     <div style={{ fontSize: 11, color: "#888" }}>{item.percent}%</div>
                 </div>
             </div>
         ))}
         {data.length === 0 && <p style={{ opacity: 0.5 }}>No hay datos suficientes.</p>}
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h1 style={{ margin: 0 }}>Estadísticas de Pacientes</h1>
        <button onClick={() => setTick(t => t + 1)} style={{ background: "#333", border: "1px solid #555", color: "white", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>🔄 Actualizar</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {/* TARJETA 1: ZONAS GEOGRÁFICAS */}
          <StatCard 
             title="Top Zonas (C.P.)" 
             data={zipStats} 
             icon="📍" 
             color="#f472b6" 
          />

          {/* TARJETA 2: MARKETING */}
          <StatCard 
             title="Fuentes de Captación" 
             data={sourceStats} 
             icon="📢" 
             color="#60a5fa" 
          />
          
          {/* TARJETA 3: RESUMEN RÁPIDO */}
          <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", display: "flex", flexDirection: "column", justifyContent: "center", gap: 15 }}>
             <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#888" }}>TOTAL PACIENTES</div>
                <div style={{ fontSize: "3rem", fontWeight: "bold", color: "white" }}>{patients.length}</div>
             </div>
             <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: 15 }}>
                <div style={{ fontSize: 13, color: "#888" }}>PACIENTES CON C.P. REGISTRADO</div>
                <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#4ade80" }}>
                    {patients.filter(p => p.address?.zip).length}
                </div>
             </div>
          </div>
      </div>
    </div>
  );
}