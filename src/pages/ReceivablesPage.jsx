import React, { useState, useEffect, useMemo } from "react";
import { getAllSales, addPaymentToSale } from "../services/salesStorage";
import { getPatients } from "../services/patientsStorage";
import { getTerminals } from "../services/settingsStorage";
import { formatMoney } from "../utils/currency";
import { toast } from "react-hot-toast";
import { Search, DollarSign } from "lucide-react";

// UI Components con tu estilo original
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import PaymentForm from "../components/sales/PaymentForm"; 
import { PAYMENT_METHODS } from "../utils/constants";

export default function ReceivablesPage() {
  const [sales, setSales] = useState([]);
  const [patients, setPatients] = useState({});
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal State
  const [selectedSale, setSelectedSale] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado controlado para PaymentForm (La lógica que arreglamos)
  const [paymentState, setPaymentState] = useState({
      initial: "",
      method: PAYMENT_METHODS.CASH,
      terminalId: "",
      cardType: "DEBIT",
      installments: 1,
      discount: 0, 
      discountType: "AMOUNT",
      feePercent: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [allSales, allPatients, allTerminals] = await Promise.all([
        getAllSales(),
        getPatients(),
        getTerminals()
      ]);

      const pendingSales = allSales.filter(s => s.balance > 0.01 && s.status !== "CANCELLED");
      
      const patMap = {};
      allPatients.forEach(p => patMap[p.id] = `${p.firstName} ${p.lastName}`);
      
      setSales(pendingSales);
      setPatients(patMap);
      setTerminals(allTerminals);
    } catch (error) {
      console.error("Error loading receivables:", error);
      toast.error("Error cargando cuentas por cobrar");
    } finally {
      setLoading(false);
    }
  }

  // Filtrado y Ordenamiento
  const filteredSales = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return sales
      .filter(sale => {
          const patName = (patients[sale.patientId] || "").toLowerCase();
          const folio = (sale.folio || "").toLowerCase();
          return patName.includes(searchLower) || folio.includes(searchLower);
      })
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Más antiguos primero
  }, [sales, patients, searchTerm]);

  const totalReceivable = filteredSales.reduce((sum, s) => sum + s.balance, 0);

  function handleOpenPayment(sale) {
    setSelectedSale(sale);
    // Reiniciar formulario
    setPaymentState({
        initial: sale.balance,
        method: PAYMENT_METHODS.CASH,
        terminalId: "",
        cardType: "DEBIT",
        installments: 1,
        discount: 0,
        discountType: "AMOUNT",
        feePercent: 0
    });
  }

  function handleCloseModal() {
    setSelectedSale(null);
    setIsSubmitting(false);
  }

  async function handleCheckout() {
    if (!selectedSale) return;

    const amount = Number(paymentState.initial);

    // Validaciones
    if (!amount || amount <= 0) {
        toast.error("Ingresa un monto válido");
        return;
    }
    if (amount > selectedSale.balance + 0.5) {
        toast.error(`El monto excede el saldo pendiente (${formatMoney(selectedSale.balance)})`);
        return;
    }
    if (paymentState.method === PAYMENT_METHODS.CARD && !paymentState.terminalId) {
        toast.error("Selecciona una terminal");
        return;
    }

    setIsSubmitting(true);
    try {
      const paymentPayload = {
        amount: amount,
        method: paymentState.method,
        terminal: paymentState.terminalId,
        cardType: paymentState.cardType,
        installments: paymentState.installments,
        note: "Abono desde Cuentas por Cobrar"
      };

      await addPaymentToSale(selectedSale.id, paymentPayload);
      
      toast.success("Abono registrado correctamente");
      handleCloseModal();
      loadData(); 
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error al registrar abono");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-container space-y-6">
        
        {/* HEADER & KPI: Estilo Lusso Original */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Cuentas por Cobrar</h1>
                <p className="text-textMuted text-sm">
                    Gestión de cartera vencida y abonos
                </p>
            </div>
            {/* Tarjeta KPI con estilo neon/glow */}
            <Card noPadding className="px-6 py-3 bg-surfaceHighlight/20 border-emerald-500/30 shadow-glow">
                <div className="text-xs text-textMuted uppercase font-bold tracking-wider">Total Cartera Vencida</div>
                <div className="text-2xl font-bold text-emerald-400">{formatMoney(totalReceivable)}</div>
            </Card>
        </div>

        {/* SEARCH BAR */}
        <Input 
            placeholder="🔍 Buscar deudor por nombre o folio..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="bg-surface border-border text-lg"
        />

        {/* GRID VISUAL (Restaurado) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
                 <div className="col-span-full py-20 text-center text-textMuted">Cargando cartera...</div>
            ) : filteredSales.length === 0 ? (
                <div className="col-span-full py-20 text-center text-textMuted bg-surface rounded-xl border border-border">
                    🎉 ¡Felicidades! No hay cuentas pendientes.
                </div>
            ) : (
                filteredSales.map(sale => (
                    <Card key={sale.id} className="hover:border-emerald-500/50 transition-colors group relative flex flex-col justify-between" noPadding>
                        <div className="p-5">
                            {/* Header Tarjeta */}
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-bold text-white text-lg truncate w-40" title={patients[sale.patientId]}>
                                        {patients[sale.patientId] || "Desconocido"}
                                    </div>
                                    <div className="text-xs text-textMuted mt-1">Folio {sale.folio || "#S/F"}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-textMuted">Debe</div>
                                    <div className="text-xl font-bold text-red-400">{formatMoney(sale.balance)}</div>
                                </div>
                            </div>
                            
                            {/* Detalles */}
                            <div className="bg-background rounded-lg p-2 text-xs text-textMuted mb-4 border border-border">
                                <p className="truncate">{sale.description || "Venta General"}</p>
                                <p className="mt-1 text-emerald-500/80">Fecha: {new Date(sale.createdAt).toLocaleDateString()}</p>
                            </div>
                            
                            {/* Botón de Acción */}
                            <Button 
                                onClick={() => handleOpenPayment(sale)} 
                                className="w-full shadow-lg shadow-emerald-500/10 group-hover:bg-emerald-600 transition-all" 
                                variant="primary"
                            >
                                <DollarSign size={16} className="mr-1" /> Abonar
                            </Button>
                        </div>
                    </Card>
                ))
            )}
        </div>

      {/* MODAL INTEGRADO: Lógica Robusta + Estilo Limpio */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-surfaceHighlight/30 px-6 py-4 border-b border-border flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-white">Registrar Abono</h3>
                        <p className="text-xs text-textMuted">Folio: {selectedSale.folio}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCloseModal} className="text-textMuted hover:text-white">✕</Button>
                </div>
                
                <div className="p-4 bg-background">
                    {/* Información del Cliente en el Modal */}
                    <div className="mb-4 p-3 bg-surface rounded-lg border border-border/50">
                        <div className="text-xs text-textMuted">Cliente</div>
                        <div className="text-sm font-bold text-white">{patients[selectedSale.patientId]}</div>
                        <div className="mt-2 flex justify-between text-sm">
                            <span className="text-textMuted">Saldo Pendiente:</span>
                            <span className="text-red-400 font-bold">{formatMoney(selectedSale.balance)}</span>
                        </div>
                    </div>

                    {isSubmitting ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-2"></div>
                            <p className="text-sm text-textMuted">Procesando pago...</p>
                        </div>
                    ) : (
                        // Componente de Pago (Lógica Avanzada)
                        <PaymentForm 
                            subtotal={selectedSale.balance} 
                            total={selectedSale.balance}    
                            payment={paymentState}          
                            setPayment={setPaymentState}    
                            terminals={terminals}           
                            onCheckout={handleCheckout}     
                            isProcessing={isSubmitting}
                            cartLength={1}                  
                        />
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}