import React, { useState, useEffect, useMemo } from "react";
import { getAllProducts } from "@/services/inventoryStorage";
import { getLabs } from "@/services/labStorage";
import { getPatients } from "@/services/patientsStorage"; 
import { useAuth } from "@/context/AuthContext";

// 👇 Importación corregida para impresión
import { printRawTicketQZ } from "@/services/QZService"; 
import { formatQuoteTicket } from "@/utils/TicketHelper";

// UI Components
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import LoadingState from "@/components/LoadingState";

export default function QuickQuotePage() {
  const { currentBranch } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data Sources
  const [products, setProducts] = useState([]);
  const [labs, setLabs] = useState([]);
  const [patients, setPatients] = useState([]);

  // Form State
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null); 
  
  const [frameSearch, setFrameSearch] = useState("");
  const [selectedFrame, setSelectedFrame] = useState(null); 
  
  const [lensAttributes, setLensAttributes] = useState({ design: "", material: "", treatment: "" });
  const [options, setOptions] = useState({ designs: [], materials: [], treatments: [] });

  // 1. CARGA INICIAL DE DATOS
  useEffect(() => {
    async function loadData() {
        try {
            const [pData, lData, patData] = await Promise.all([
                getAllProducts(),
                getLabs(),
                getPatients() 
            ]);
            
            setProducts(pData.filter(p => p.category === "FRAMES" && !p.deletedAt));
            setLabs(lData);
            setPatients(patData);

            const designs = new Set();
            const materials = new Set();
            const treatments = new Set();

            lData.forEach(lab => {
                lab.lensCatalog?.forEach(lens => {
                    if(lens.design) designs.add(lens.design);
                    if(lens.material) materials.add(lens.material);
                    if(lens.treatment) treatments.add(lens.treatment);
                });
            });

            setOptions({
                designs: Array.from(designs).sort(),
                materials: Array.from(materials).sort(),
                treatments: Array.from(treatments).sort()
            });

        } catch (e) {
            console.error("Error cargando datos para cotizador:", e);
        } finally {
            setLoading(false);
        }
    }
    loadData();
  }, []);

  // 2. CÁLCULO DE PRECIO PROMEDIO DE MICAS
  const lensAveragePrice = useMemo(() => {
      const { design, material, treatment } = lensAttributes;
      if (!design && !material && !treatment) return 0;

      let totalSum = 0;
      let count = 0;

      labs.forEach(lab => {
          lab.lensCatalog?.forEach(lens => {
              const matchDesign = !design || lens.design === design;
              const matchMaterial = !material || lens.material === material;
              const matchTreatment = !treatment || lens.treatment === treatment;

              if (matchDesign && matchMaterial && matchTreatment) {
                  if (lens.ranges && lens.ranges.length > 0) {
                      const lensAvg = lens.ranges.reduce((acc, r) => acc + Number(r.price), 0) / lens.ranges.length;
                      totalSum += lensAvg;
                      count++;
                  }
              }
          });
      });

      return count > 0 ? (totalSum / count) : 0;
  }, [lensAttributes, labs]);

  // HANDLERS
  const handleClientSelect = (p) => {
      setSelectedClient({ name: `${p.firstName} ${p.lastName}`, id: p.id });
      setClientSearch("");
  };

  const handlePublicoGeneral = () => {
      setSelectedClient({ name: "Público General", id: null });
  };

  const handleFrameSelect = (p) => {
      setSelectedFrame({ brand: p.brand, model: p.model, price: p.price });
      setFrameSearch("");
  };

  // 3. IMPRESIÓN TÉRMICA
  const handlePrint = async () => {
      const quoteData = {
          clientName: selectedClient ? selectedClient.name : "Público General",
          frame: selectedFrame,
          lens: {
              design: lensAttributes.design || "N/A",
              material: lensAttributes.material || "N/A",
              treatment: lensAttributes.treatment || "N/A",
              price: lensAveragePrice
          },
          total: (selectedFrame ? Number(selectedFrame.price) : 0) + lensAveragePrice
      };

      try {
          const ticketData = formatQuoteTicket(quoteData, currentBranch?.name || "LUSSO OPTOMETRIA");
          await printRawTicketQZ(ticketData); 
          alert("🖨️ Cotización enviada a impresora.");
      } catch (error) {
          console.error(error);
          alert("Error de impresión: " + error.message + ". Verifica QZ Tray.");
      }
  };

  const reset = () => {
      setSelectedClient(null);
      setSelectedFrame(null);
      setLensAttributes({ design: "", material: "", treatment: "" });
  };

  // Buscadores
  const filteredPatients = clientSearch ? patients.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 5) : [];
  const filteredFrames = frameSearch ? products.filter(p => `${p.brand} ${p.model}`.toLowerCase().includes(frameSearch.toLowerCase())).slice(0, 5) : [];

  const total = (selectedFrame ? Number(selectedFrame.price) : 0) + lensAveragePrice;

  if (loading) return <LoadingState />;

  return (
    <div className="page-container max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Cotizador Rápido</h1>
            <p className="text-textMuted text-sm">Calcula presupuestos estimados al instante</p>
          </div>
          <Button variant="ghost" onClick={reset}>Limpiar Todo</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* COLUMNA IZQUIERDA: SELECCIÓN */}
          <div className="space-y-6">
              
              {/* 🟢 FIX VISUAL: Agregamos "overflow-visible relative z-30" 
                  Esto permite que la lista despliegue fuera de la tarjeta sin cortarse.
              */}
              <Card className="overflow-visible relative z-30">
                  <h3 className="text-sm font-bold text-blue-400 uppercase mb-3">1. Cliente</h3>
                  {selectedClient ? (
                      <div className="flex justify-between items-center bg-blue-500/10 p-3 rounded-lg border border-blue-500/30">
                          <span className="font-bold text-white">{selectedClient.name}</span>
                          <button onClick={() => setSelectedClient(null)} className="text-xs text-blue-300 hover:text-white">Cambiar</button>
                      </div>
                  ) : (
                      <div className="space-y-3 relative">
                          <div className="relative">
                              <Input 
                                placeholder="Buscar paciente..." 
                                value={clientSearch} 
                                onChange={e => setClientSearch(e.target.value)} 
                              />
                              {filteredPatients.length > 0 && (
                                  <div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg mt-1 z-50 shadow-2xl max-h-60 overflow-y-auto">
                                      {filteredPatients.map(p => (
                                          <div key={p.id} onClick={() => handleClientSelect(p)} className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 text-sm">
                                              <div className="font-bold text-white">{p.firstName} {p.lastName}</div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                          <Button variant="secondary" onClick={handlePublicoGeneral} className="w-full text-xs">Usar "Público General"</Button>
                      </div>
                  )}
              </Card>

              {/* 🟢 FIX VISUAL: Agregamos "overflow-visible relative z-20"
                  Z-index menor que el de arriba para que si abres el de cliente, tape a este.
              */}
              <Card className="overflow-visible relative z-20">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase mb-3">2. Armazón</h3>
                  {selectedFrame ? (
                      <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">
                          <div className="flex justify-between items-start">
                              <div>
                                  <div className="font-bold text-white">{selectedFrame.brand}</div>
                                  <div className="text-sm text-textMuted">{selectedFrame.model}</div>
                              </div>
                              <div className="font-bold text-emerald-400">${selectedFrame.price}</div>
                          </div>
                          <button onClick={() => setSelectedFrame(null)} className="text-xs text-emerald-300 hover:text-white mt-2">Cambiar</button>
                      </div>
                  ) : (
                      <div className="relative">
                          <Input 
                            placeholder="Buscar marca o modelo..." 
                            value={frameSearch} 
                            onChange={e => setFrameSearch(e.target.value)} 
                          />
                          {filteredFrames.length > 0 && (
                              <div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg mt-1 z-50 shadow-2xl max-h-60 overflow-y-auto">
                                  {filteredFrames.map(p => (
                                      <div key={p.id} onClick={() => handleFrameSelect(p)} className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 text-sm flex justify-between">
                                          <div>
                                              <span className="text-white font-bold">{p.brand}</span> <span className="text-textMuted">{p.model}</span>
                                          </div>
                                          <span className="text-emerald-400">${p.price}</span>
                                      </div>
                                  ))}
                              </div>
                          )}
                          <div className="mt-2 text-xs text-textMuted text-center">Selecciona del inventario para obtener el precio real.</div>
                      </div>
                  )}
              </Card>

              {/* 3. MICAS */}
              <Card className="z-10 relative">
                  <h3 className="text-sm font-bold text-purple-400 uppercase mb-3">3. Micas / Lentes</h3>
                  <div className="space-y-3">
                      <Select label="Diseño" value={lensAttributes.design} onChange={e => setLensAttributes({...lensAttributes, design: e.target.value})}>
                          <option value="">-- Seleccionar --</option>
                          {options.designs.map(d => <option key={d} value={d}>{d}</option>)}
                      </Select>
                      
                      <Select label="Material" value={lensAttributes.material} onChange={e => setLensAttributes({...lensAttributes, material: e.target.value})}>
                          <option value="">-- Seleccionar --</option>
                          {options.materials.map(m => <option key={m} value={m}>{m}</option>)}
                      </Select>

                      <Select label="Tratamiento" value={lensAttributes.treatment} onChange={e => setLensAttributes({...lensAttributes, treatment: e.target.value})}>
                          <option value="">-- Seleccionar --</option>
                          {options.treatments.map(t => <option key={t} value={t}>{t}</option>)}
                      </Select>
                  </div>
              </Card>
          </div>

          {/* COLUMNA DERECHA: RESUMEN */}
          <div className="space-y-6">
              <Card className="h-full flex flex-col border-2 border-primary/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                      <h1 className="text-9xl font-bold text-white">?</h1>
                  </div>
                  
                  <h2 className="text-xl font-bold text-white mb-6 text-center border-b border-border pb-4">Resumen de Cotización</h2>
                  
                  <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-textMuted">Cliente:</span>
                          <span className="font-bold text-white text-right">{selectedClient ? selectedClient.name : "---"}</span>
                      </div>

                      <div className="border-t border-border/50 my-2"></div>

                      <div className="flex justify-between items-center">
                          <span className="text-textMuted">Armazón:</span>
                          <span className="font-bold text-emerald-400">${selectedFrame ? Number(selectedFrame.price).toLocaleString() : "0.00"}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                          <span className="text-textMuted">Lentes (Promedio):</span>
                          <span className="font-bold text-purple-400">${lensAveragePrice > 0 ? lensAveragePrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : "0.00"}</span>
                      </div>
                      
                      {(lensAveragePrice === 0 && (lensAttributes.design || lensAttributes.material)) && (
                          <div className="text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded text-center mt-2">
                              ⚠️ No se encontraron coincidencias exactas en las listas de precios.
                          </div>
                      )}
                  </div>

                  <div className="border-t-2 border-dashed border-border mt-6 pt-4">
                      <div className="flex justify-between items-end">
                          <span className="text-lg font-bold text-white">Total Estimado:</span>
                          <span className="text-3xl font-bold text-green-400">${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                      <p className="text-xs text-textMuted text-right mt-1 font-bold text-red-400">* Precios sujetos a cambios. No es una venta.</p>
                  </div>

                  <Button 
                    onClick={handlePrint} 
                    className="w-full mt-6 py-4 text-lg shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    disabled={total === 0}
                  >
                    <span>🖨️</span> IMPRIMIR TICKET DE COTIZACIÓN
                  </Button>
              </Card>
          </div>
      </div>
    </div>
  );
}