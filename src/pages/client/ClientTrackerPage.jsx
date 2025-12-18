import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  Glasses, 
  FlaskConical, 
  Truck, 
  ShieldCheck, 
  ScanEye, 
  CheckCircle2,
  FileText,
  CreditCard,
  LogOut,
  ChevronDown,
  Eye,
  Share2, // 👈 Nuevo
  Copy,   // 👈 Nuevo
  Users   // 👈 Nuevo
} from 'lucide-react';

// --- IMPORTACIONES DE FIREBASE Y SERVICIOS ---
import { db } from "@/firebase/config"; 
import { doc, onSnapshot } from "firebase/firestore";
import { getClientOrders } from "@/services/clientService";
import { getPatientById, getPatientsRecommendedBy } from "@/services/patientsStorage"; // 👈 Importamos getPatientsRecommendedBy
import { getBranchConfig } from "@/utils/branchesConfig";

// --- CONFIGURACIÓN VISUAL (ESTADOS) ---
const VISUAL_STEPS = [
  { id: "ON_HOLD", title: "Orden en Sucursal", description: "Validando receta y armazón.", icon: ScanEye, color: "text-indigo-400", bg: "bg-indigo-500" },
  { id: "TO_PREPARE", title: "Ingreso a Laboratorio", description: "Lentes en preparación inicial.", icon: FlaskConical, color: "text-cyan-400", bg: "bg-cyan-500" },
  { id: "SENT_TO_LAB", title: "Corte y Biselado", description: "Proceso de tallado digital.", icon: Glasses, color: "text-blue-400", bg: "bg-blue-600" },
  { id: "QUALITY_CHECK", title: "Control de Calidad", description: "Verificación de graduación.", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500" },
  { id: "READY", title: "Listo para Entrega", description: "Tu visión está lista.", icon: CheckCircle2, color: "text-teal-400", bg: "bg-teal-500" },
  { id: "DELIVERED", title: "Entregado", description: "Disfruta tus lentes.", icon: Truck, color: "text-slate-400", bg: "bg-slate-700" }
];

const getStepIndex = (status) => {
  const map = {
    "ON_HOLD": 0, "TO_PREPARE": 1, "SENT_TO_LAB": 2, 
    "QUALITY_CHECK": 3, "READY": 4, "DELIVERED": 5, "CANCELLED": 0
  };
  return map[status] !== undefined ? map[status] : 0;
};

// --- FUNCIÓN GENERADORA DE PDF (INTACTA) ---
const generateSalePDF = (sale, branchConfig, patient) => {
  try {
      const doc = new jsPDF();
      const branchName = branchConfig?.name || "Lusso Optometría";
      
      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text(branchName, 105, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("Comprobante de Venta", 105, 26, { align: "center" });
      doc.setDrawColor(200);
      doc.line(14, 32, 196, 32);

      // Datos Cliente
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("Cliente:", 14, 40);
      doc.setFont("helvetica", "normal");
      doc.text(`${patient?.firstName || ""} ${patient?.lastName || ""}`, 14, 45);
      if(patient?.phone) doc.text(`Tel: ${patient.phone}`, 14, 50);

      doc.setFont("helvetica", "bold");
      doc.text("Folio:", 160, 40);
      doc.setFont("helvetica", "normal");
      doc.text(sale.id?.slice(0, 8).toUpperCase() || "---", 160, 45);
      doc.setFont("helvetica", "bold");
      doc.text("Fecha:", 160, 52);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleDateString(), 160, 57);

      // --- TABLA DETALLADA ---
      const items = sale.items || [];
      const bodyData = items.map(item => {
        let description = item.description || "Producto";
        
        // 1. Detalles técnicos
        if (item.specs) {
            const details = [
                item.specs.design, 
                item.specs.material, 
                item.specs.treatment
            ].filter(Boolean).join(" • ");
            if (details) description += `\n[${details}]`;
        }

        // 2. Graduación
        const rx = item.rx || item.rxSnapshot;
        if (rx) {
            const fmt = (eye) => {
                if (!eye) return "";
                return `${eye.sph || '0.00'} / ${eye.cyl || '0.00'} x ${eye.axis || '0'}°${eye.add ? ` Add ${eye.add}` : ''}`;
            };
            let rxStr = "";
            if (rx.od && (rx.od.sph || rx.od.cyl)) rxStr += `\nOD: ${fmt(rx.od)}`;
            if (rx.os && (rx.os.sph || rx.os.cyl)) rxStr += `\nOI: ${fmt(rx.os)}`;
            if (rxStr) description += `\n--- GRADUACIÓN ---${rxStr}`;
        }

        return [
            description,
            item.qty,
            `$${Number(item.unitPrice).toLocaleString('en-US', {minimumFractionDigits: 2})}`,
            `$${(item.qty * item.unitPrice).toLocaleString('en-US', {minimumFractionDigits: 2})}`
        ];
      });

      autoTable(doc, {
        startY: 65,
        head: [['Descripción', 'Cant.', 'P. Unitario', 'Importe']],
        body: bodyData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
        headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: { 
            0: { halign: 'left', cellWidth: 90 }, 
            1: { halign: 'center' }, 
            2: { halign: 'right' }, 
            3: { halign: 'right' } 
        },
        didParseCell: function (data) {
            if (data.section === 'head' || data.section === 'foot') {
                doc.setDrawColor(200);
                doc.setLineWidth(0.1);
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
        }
      });

      // Totales
      let finalY = (doc.lastAutoTable?.finalY || 80) + 10;
      const total = Number(sale.total || 0);
      const paid = (sale.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
      const balance = Math.max(0, total - paid);

      const printRight = (label, value, y, isBold = false) => {
          doc.setFont("helvetica", isBold ? "bold" : "normal");
          doc.text(label, 140, y);
          doc.text(value, 196, y, { align: "right" });
      };

      printRight("Total Venta:", `$${total.toLocaleString('en-US', {minimumFractionDigits: 2})}`, finalY, true);
      printRight("Abonado:", `$${paid.toLocaleString('en-US', {minimumFractionDigits: 2})}`, finalY + 6);
      doc.setTextColor(balance > 0.01 ? 200 : 0, balance > 0.01 ? 0 : 150, 0);
      printRight("Saldo Pendiente:", `$${balance.toLocaleString('en-US', {minimumFractionDigits: 2})}`, finalY + 12, true);

      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("Gracias por su preferencia.", 105, 280, { align: "center" });
      doc.save(`Ticket_Lusso_${sale.id?.slice(0,6) || "venta"}.pdf`);
  } catch (error) {
      console.error("Error generando PDF:", error);
      alert("No se pudo generar el ticket.");
  }
};

// --- COMPONENTE 1: HISTORIAL DE PAGOS ---
const PaymentHistory = ({ payments, total, balance }) => {
    const totalNum = Number(total || 0);
    const balanceNum = Number(balance || 0);
    const paidNum = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

    return (
      <div className="mt-6 bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700/50">
        <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700/50 flex justify-between items-center">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={14} /> Estado de Cuenta
            </span>
            {balanceNum <= 0.01 && (
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                    LIQUIDADO
                </span>
            )}
        </div>
        
        <div className="p-4">
            {payments && payments.length > 0 ? (
            <div className="space-y-3 mb-5">
                {payments.map((pay, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm group">
                    <div className="flex flex-col">
                        <span className="text-slate-200 font-medium">Abono {pay.method}</span>
                        <span className="text-[10px] text-slate-500">{new Date(pay.paidAt).toLocaleDateString()}</span>
                    </div>
                    <span className="text-emerald-400 font-mono font-bold bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10">
                        +${Number(pay.amount).toLocaleString()}
                    </span>
                </div>
                ))}
            </div>
            ) : (
                <div className="text-center py-4 mb-4 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                    <p className="text-xs text-slate-500 italic">Sin pagos registrados.</p>
                </div>
            )}

            <div className="border-t border-slate-700/50 pt-4 space-y-1">
                <div className="flex justify-between text-sm text-slate-400">
                    <span>Total Venta</span>
                    <span>${totalNum.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400">
                    <span>Abonado</span>
                    <span>-${paidNum.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-700/50">
                    <span className="text-sm font-bold text-slate-200">Saldo Restante</span>
                    <span className={`text-xl font-bold font-mono ${balanceNum > 0.01 ? 'text-red-400' : 'text-emerald-500'}`}>
                        ${balanceNum.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
      </div>
    );
};

// --- COMPONENTE 2: VISUALIZADOR DE ORDEN (MEJORADO) ---
const OrderVisualizer = ({ order, onDownloadPdf }) => {
  const currentIndex = getStepIndex(order.status);
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    setTimeout(() => {
       setAnimProgress((currentIndex / (VISUAL_STEPS.length - 1)) * 100);
    }, 500);
  }, [currentIndex]);
  
  const frames = order.saleDetails?.items.filter(i => i.kind === "FRAMES") || [];
  const lenses = order.saleDetails?.items.filter(i => i.kind === "LENSES") || [];

  return (
    <div className="w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 relative mb-8 animate-fadeIn">
      
      {/* 1. MAPA TECH ANIMADO */}
      <div className="relative h-64 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 w-full overflow-hidden text-white">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 border border-blue-400 rounded-full"></div>
            <div className="absolute top-20 right-[-20px] w-40 h-40 border border-cyan-400 rounded-full opacity-50"></div>
          </div>

          <div className="absolute top-4 left-0 right-0 px-6 flex justify-between items-start z-20">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-medium tracking-wider text-blue-100">
              ORDEN #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <button 
              onClick={() => onDownloadPdf(order)}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-all text-white border border-white/10"
              title="Descargar Ticket PDF"
            >
              <FileText size={16} />
            </button>
          </div>

          {/* SVG Animado */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`grad-${order.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path d="M 40 160 Q 180 80 340 160" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="4 4"/>
            <path 
              d="M 40 160 Q 180 80 340 160" 
              fill="none" 
              stroke={`url(#grad-${order.id})`} 
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="340"
              strokeDashoffset={340 - (animProgress * 3.4)}
              className="transition-all duration-[2000ms] ease-in-out"
              style={{ filter: "drop-shadow(0 0 4px rgba(6, 182, 212, 0.5))" }}
            />
          </svg>

          {/* Icono Flotante */}
          <div 
            className="absolute z-20 transition-all duration-[2000ms] ease-in-out transform -translate-x-1/2 -translate-y-1/2"
            style={{ 
              left: `${12 + (animProgress * 0.8)}%`,
              top: `${60 - (Math.sin(animProgress * Math.PI / 100) * 20)}%` 
            }}
          >
             <div className="relative">
               <div className="absolute inset-0 bg-cyan-400 rounded-full blur opacity-40 animate-pulse"></div>
               <div className="relative w-10 h-10 bg-white rounded-full shadow-lg border-2 border-cyan-100 flex items-center justify-center text-cyan-600">
                 {animProgress < 25 ? <ScanEye size={18} /> : 
                  animProgress < 50 ? <FlaskConical size={18} /> : 
                  animProgress < 75 ? <Glasses size={18} /> : <Truck size={18} />}
               </div>
             </div>
          </div>
          
          <div className="absolute bottom-4 w-full flex justify-between px-8 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
            <span>Óptica</span>
            <span className="-translate-y-4">Lab</span>
            <span>Entrega</span>
          </div>
      </div>

      {/* 2. BODY DE LA TARJETA */}
      <div className="px-6 py-6 bg-white relative z-20 rounded-t-[2rem] -mt-6">
          
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              {VISUAL_STEPS[currentIndex]?.title || "Estado Desconocido"}
            </h2>
            <div className="flex items-center justify-center gap-2 text-xs text-cyan-600 font-medium">
              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
              Actualizado: {new Date(order.updatedAt || order.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Lista de Items */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-8 relative overflow-hidden">
            {frames.map((frame, idx) => (
              <div key={idx} className="flex items-center gap-4 relative z-10 mb-3 last:mb-0">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-700">
                   <Glasses size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-sm">{frame.description}</h3>
                  <p className="text-xs text-slate-500">Armazón</p>
                </div>
              </div>
            ))}
            
            {/* LÓGICA CORREGIDA PARA LENTES */}
            {lenses.map((lens, idx) => {
              // Extraer graduación de donde sea que esté
              const rx = lens.rx || lens.rxSnapshot || order.rxNotes;
              // Formatear detalles técnicos
              const details = [
                  lens.specs?.design, 
                  lens.specs?.material, 
                  lens.specs?.treatment
              ].filter(Boolean).join(" • ");

              return (
                <div key={idx} className="mt-4 pt-4 border-t border-slate-200 first:mt-0 first:pt-0 first:border-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Eye size={16} className="text-cyan-600" />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Micas / Lentes</span>
                    </div>

                    {/* Especificaciones Técnicas */}
                    <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 mb-2">
                        {details || "Lente Oftálmico Estándar"}
                    </div>

                    {/* Renderizado de Graduación */}
                    {rx && (rx.od || rx.os) && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-white border border-slate-100 rounded p-2 text-center">
                                <div className="text-[10px] font-bold text-blue-500 mb-1">OD (Derecho)</div>
                                <div className="text-[10px] font-mono text-slate-600">
                                    {rx.od?.sph || '0.00'} / {rx.od?.cyl || '0.00'} x {rx.od?.axis || '0'}°
                                    {rx.od?.add && <span className="block text-[9px] text-slate-400">Add {rx.od.add}</span>}
                                </div>
                            </div>
                            <div className="bg-white border border-slate-100 rounded p-2 text-center">
                                <div className="text-[10px] font-bold text-green-500 mb-1">OI (Izquierdo)</div>
                                <div className="text-[10px] font-mono text-slate-600">
                                    {rx.os?.sph || '0.00'} / {rx.os?.cyl || '0.00'} x {rx.os?.axis || '0'}°
                                    {rx.os?.add && <span className="block text-[9px] text-slate-400">Add {rx.os.add}</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
              );
            })}
          </div>

          {/* Timeline Vertical */}
          <div className="relative pl-4 space-y-0 mb-8">
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-100"></div>
            {VISUAL_STEPS.map((step, index) => {
              const isActive = index === currentIndex;
              const isCompleted = index < currentIndex;
              const StepIcon = step.icon;
              
              return (
                <div key={step.id} className={`flex gap-4 relative pb-6 last:pb-0 transition-all duration-500 ${index > currentIndex ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                  <div className={`
                    relative z-10 w-10 h-10 flex items-center justify-center rounded-full border-[3px] border-white shadow-sm flex-shrink-0 transition-all
                    ${isActive ? `${step.bg} text-white scale-110 shadow-lg ring-2 ring-offset-2 ring-cyan-100` : 
                      isCompleted ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}
                  `}>
                    {isCompleted ? <CheckCircle2 size={16} /> : <StepIcon size={18} />}
                  </div>
                  <div className="pt-0.5">
                    <h4 className={`text-sm font-bold ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
                      {step.title}
                    </h4>
                    <p className="text-xs text-slate-500 leading-tight max-w-[200px]">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Finanzas en vivo */}
          {order.saleDetails && (
             <PaymentHistory 
                payments={order.saleDetails.payments} 
                total={order.saleDetails.total} 
                balance={order.saleDetails.balance} 
             />
          )}

      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL (PÁGINA) ---
export default function ClientTrackerPage() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [referralsCount, setReferralsCount] = useState(0); // 👈 Estado Referidos
  
  const unsubscribersRef = useRef([]);

  useEffect(() => {
    const session = sessionStorage.getItem("lusso_client_session");
    if (!session) { navigate("/portal/login"); return; }
    const sessionData = JSON.parse(session);
    
    async function fetchData() {
        try {
            const [freshPatient, freshOrders, myReferrals] = await Promise.all([
                getPatientById(sessionData.id),
                getClientOrders(sessionData.id),
                getPatientsRecommendedBy(sessionData.id) // 👈 Buscamos referidos
            ]);
            
            if (freshPatient) setPatient(freshPatient);
            else setPatient(sessionData); 

            setOrders(freshOrders);
            setReferralsCount(myReferrals.length); // 👈 Guardamos contador

            // ACTIVAR ESCUCHA EN TIEMPO REAL
            freshOrders.forEach(order => {
                if (order.saleId) {
                    const unsubscribe = onSnapshot(doc(db, "sales", order.saleId), (docSnap) => {
                        if (docSnap.exists()) {
                            const updatedSale = { id: docSnap.id, ...docSnap.data() };
                            setOrders(prevOrders => prevOrders.map(o => {
                                if (o.saleId === updatedSale.id) {
                                    return { ...o, saleDetails: updatedSale };
                                }
                                return o;
                            }));
                        }
                    });
                    unsubscribersRef.current.push(unsubscribe);
                }
            });

        } catch (error) {
            console.error("Error cargando datos del cliente:", error);
        } finally {
            setLoading(false);
        }
    }
    fetchData();

    return () => {
        unsubscribersRef.current.forEach(unsub => unsub());
        unsubscribersRef.current = [];
    };
  }, []);

  const handleLogout = () => {
      sessionStorage.removeItem("lusso_client_session");
      navigate("/portal/login");
  };

  const handleDownloadPdf = (order) => {
    const branchConfig = getBranchConfig(order.branchId || "lusso_main");
    const saleData = order.saleDetails || { ...order, items: [] };
    generateSalePDF(saleData, branchConfig, patient);
  };

  // 🚀 LÓGICA COMPARTIR WHATSAPP
  const handleShare = () => {
    const msg = `¡Hola! Te recomiendo Lusso Optometría. Si vas de mi parte, te dan un descuento especial. Usa mi código: *${patient?.referralCode || "MI_CODIGO"}* 👓✨`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  if (loading) return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-sm tracking-widest uppercase">Cargando...</p>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 pb-10 font-sans animate-fadeIn">
      
      {/* 1. HEADER */}
      <div className="relative bg-gradient-to-r from-blue-950 to-slate-900 p-6 pb-12 rounded-b-[2.5rem] shadow-2xl overflow-hidden border-b border-white/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
               <div className="text-white">
                  <h1 className="text-xl font-bold">Hola, {patient?.firstName}</h1>
                  <p className="text-xs text-blue-200/60 uppercase tracking-widest">Bienvenido a TrackerVisual</p>
               </div>
               <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-white transition-colors">
                  <LogOut size={18} />
               </button>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:bg-white/10 transition-colors mb-4">
               <div className="flex justify-between items-start relative z-10">
                  <div>
                    <div className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div> Tus Puntos
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {patient?.points?.toLocaleString() || 0}
                    </div>
                    <p className="text-[10px] text-slate-400">Canjeables en tu próxima visita.</p>
                  </div>
                  <button onClick={() => setShowQR(!showQR)} className="h-10 w-10 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                     {showQR ? <ChevronDown size={20} /> : <ScanEye size={20} />}
                  </button>
               </div>

               {showQR && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-col items-center animate-fadeIn">
                      <div className="bg-white p-2 rounded-xl">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${patient?.id}`} 
                            alt="QR" 
                            className="w-24 h-24"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-2">{patient?.id}</span>
                  </div>
               )}
            </div>

            {/* 🔥 TARJETA INVITA Y GANA (NUEVO) */}
            <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-md border border-purple-500/30 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold flex items-center gap-2 text-sm">
                        <Users size={16} className="text-purple-400" /> Invita y Gana
                    </h3>
                    <div className="text-xs bg-purple-500/20 text-purple-200 px-2 py-1 rounded-full border border-purple-500/30">
                        {referralsCount} Invitados
                    </div>
                </div>
                
                <div className="bg-black/30 rounded-lg p-3 flex justify-between items-center mb-3 border border-white/5">
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Tu Código</p>
                        <p className="text-xl font-mono font-bold text-purple-300 tracking-widest">{patient?.referralCode || "---"}</p>
                    </div>
                    <button 
                        onClick={() => { navigator.clipboard.writeText(patient?.referralCode); alert("Copiado!"); }}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                    >
                        <Copy size={18} />
                    </button>
                </div>

                <button 
                    onClick={handleShare}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50 transition-all"
                >
                    <Share2 size={16} /> Compartir en WhatsApp
                </button>
            </div>

          </div>
      </div>

      {/* 2. LISTA DE PEDIDOS */}
      <div className="px-4 -mt-6 relative z-20 space-y-6 max-w-md mx-auto">
        
        {orders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
             <Glasses size={48} className="mx-auto mb-4 opacity-50" />
             <p>No tienes pedidos activos actualmente.</p>
          </div>
        ) : (
          orders.map(order => (
            <OrderVisualizer 
              key={order.id} 
              order={order} 
              onDownloadPdf={handleDownloadPdf} 
            />
          ))
        )}

        <div className="text-center pb-6">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">
            Tecnología Lusso Optometría
          </p>
        </div>

      </div>
    </div>
  );
}