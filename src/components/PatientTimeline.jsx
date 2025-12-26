import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Calendar, Eye, Stethoscope, ArrowRight } from "lucide-react";

export default function PatientTimeline({ consultations = [], exams = [] }) {
  const navigate = useNavigate();

  const timeline = [
    ...consultations.map(c => ({ 
        type: "CONSULTATION", 
        date: c.visitDate || c.createdAt, 
        data: c,
        icon: <Stethoscope size={16} />,
        color: "text-blue-400",
        bg: "bg-blue-900/20 border-blue-500/30",
        title: "Consulta Médica" 
    })),
    ...exams.map(e => ({ 
        type: "EXAM", 
        date: e.examDate, 
        data: e,
        icon: <Eye size={16} />,
        color: "text-emerald-400",
        bg: "bg-emerald-900/20 border-emerald-500/30",
        title: "Examen de Vista"
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (timeline.length === 0) {
      return (
          <Card className="h-full flex flex-col justify-center items-center text-textMuted p-8 border-dashed border-border opacity-70">
              <Calendar size={48} className="mb-4 opacity-20" />
              <p className="text-sm">Sin historial registrado</p>
          </Card>
      );
  }

  return (
    <Card className="h-full flex flex-col relative overflow-hidden" noPadding>
      <div className="p-4 border-b border-border bg-surfaceHighlight/5 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wide">
              📅 Historia Clínica
          </h3>
          <Badge color="gray" className="text-xs">{timeline.length}</Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-0 relative custom-scrollbar">
        <div className="absolute left-[27px] top-4 bottom-0 w-0.5 bg-border z-0"></div>

        {timeline.map((event, idx) => (
            <div key={`${event.type}-${idx}`} className="relative z-10 flex gap-4 mb-5 last:mb-0 group animate-fadeIn">
                <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-surface shadow-lg
                    ${event.type === 'CONSULTATION' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}
                `}>
                    {event.icon}
                </div>

                <div className={`flex-1 border rounded-xl p-3 transition-all hover:bg-surfaceHighlight/10 ${event.bg}`}>
                    <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${event.color}`}>{event.title}</span>
                        <span className="text-[10px] text-white/50">{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="text-xs text-white mb-1 font-medium line-clamp-1">
                        {event.type === "CONSULTATION" ? (event.data.diagnosis || "Sin diagnóstico") : "Refractivo / Optometría"}
                    </div>
                    
                    <div className="text-[10px] text-textMuted line-clamp-2 leading-relaxed">
                        {event.type === "CONSULTATION" 
                            ? event.data.reason 
                            : `Rx: OD ${event.data.refraction?.finalRx?.od?.sph || '-'} | OI ${event.data.refraction?.finalRx?.os?.sph || '-'}`
                        }
                    </div>

                    {event.type === "CONSULTATION" && (
                        <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => navigate(`/patients/${event.data.patientId}/consultations/${event.data.id}`)}
                                className="flex items-center gap-1 text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white transition-colors"
                             >
                                Ver <ArrowRight size={8} />
                             </button>
                        </div>
                    )}
                </div>
            </div>
        ))}
      </div>
    </Card>
  );
}