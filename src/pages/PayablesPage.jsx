import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllWorkOrders, updateWorkOrder } from "@/services/workOrdersStorage";
import { getAllSupplierDebts, createSupplierDebt, markDebtAsPaid, deleteSupplierDebt } from "@/services/supplierDebtsStorage";
import { getSuppliers } from "@/services/suppliersStorage"; // 👈 IMPORTAR
import { getPatients } from "@/services/patientsStorage";
import { createExpense } from "@/services/expensesStorage";

export default function PayablesPage() {
  const [tick, setTick] = useState(0);
  const [payModal, setPayModal] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const orders = useMemo(() => getAllWorkOrders(), [tick]);
  const supplierDebts = useMemo(() => getAllSupplierDebts(), [tick]);
  const patients = useMemo(() => getPatients(), []);
  const suppliers = useMemo(() => getSuppliers(), []); // 👈 Catálogo
  const patientMap = useMemo(() => patients.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}), [patients]);

  // UNIFICAR LISTAS
  const allDebts = useMemo(() => {
    const labDebts = orders
      .filter(w => w.labCost > 0 && !w.isPaid && w.status !== "CANCELLED")
      .map(w => ({
          ...w,
          uniqueId: `WO-${w.id}`,
          source: 'WORK_ORDER',
          title: w.labName || "Laboratorio Externo",
          subtitle: `Px: ${patientMap[w.patientId]?.firstName || ""} · ${w.type}`,
          amount: w.labCost,
          date: w.createdAt
      }));

    const supplyDebts = supplierDebts
      .filter(d => !d.isPaid)
      .map(d => ({
          ...d,
          uniqueId: `SUP-${d.id}`,
          source: 'SUPPLIER',
          title: d.provider,
          subtitle: d.concept,
          amount: d.amount,
          date: d.createdAt
      }));

    return [...labDebts, ...supplyDebts].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [orders, supplierDebts, patientMap]);

  const totalDebt = allDebts.reduce((sum, d) => sum + d.amount, 0);

  // --- MODAL NUEVA DEUDA ---
  const NewDebtModal = ({ onClose }) => {
      const [form, setForm] = useState({ provider: "", concept: "", amount: "", category: "INVENTARIO" });
      
      const handleSubmit = (e) => {
          e.preventDefault();
          if(!form.provider || !form.amount) return alert("Faltan datos");
          createSupplierDebt(form);
          setTick(t => t + 1);
          onClose();
      };
      
      const inputStyle = { width: "100%", padding: 10, background: "#222", border: "1px solid #444", color: "white", borderRadius: 6, marginBottom: 15 };

      return (
        <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
            <form onSubmit={handleSubmit} style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333", width: 400 }}>
                <h3 style={{ marginTop: 0, color: "#e5e7eb" }}>Registrar Factura</h3>
                
                {/* SELECTOR DE PROVEEDOR */}
                <label style={{display:"block", fontSize:12, color:"#aaa", marginBottom:5}}>Proveedor</label>
                <select 
                    value={form.provider} 
                    onChange={e => setForm({...form, provider: e.target.value})} 
                    style={inputStyle}
                >
                    <option value="">-- Seleccionar --</option>
                    {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    <option value="OTRO">Otro / General</option>
                </select>
                
                <label style={{display:"block", fontSize:12, color:"#aaa", marginBottom:5}}>Concepto</label>
                <input placeholder="Ej. Factura F-1234" value={form.concept} onChange={e => setForm({...form, concept: e.target.value})} style={inputStyle} />
                
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
                    <div>
                        <label style={{display:"block", fontSize:12, color:"#aaa", marginBottom:5}}>Monto ($)</label>
                        <input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                        <label style={{display:"block", fontSize:12, color:"#aaa", marginBottom:5}}>Categoría</label>
                        <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={inputStyle}>
                            <option value="INVENTARIO">Inventario</option>
                            <option value="INSUMOS">Insumos</option>
                            <option value="EQUIPO">Equipo</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button type="button" onClick={onClose} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
                    <button type="submit" style={{ background: "#2563eb", color: "white", padding: "10px 20px", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}>Guardar</button>
                </div>
            </form>
        </div>
      );
  };

  const PayModal = ({ debt, onClose }) => {
    const [method, setMethod] = useState("TRANSFERENCIA");
    
    const handlePay = () => {
      createExpense({
        description: `Pago ${debt.source === 'WORK_ORDER' ? 'Lab' : 'Prov'}: ${debt.title} (${debt.subtitle})`,
        amount: debt.amount,
        category: debt.category || "COSTO_VENTA",
        method: method,
        date: new Date().toISOString()
      });

      if (debt.source === 'WORK_ORDER') updateWorkOrder(debt.id, { isPaid: true });
      else markDebtAsPaid(debt.id);

      setTick(t => t + 1);
      onClose();
    };

    return (
      <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
        <div style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #f87171", width: 400 }}>
           <h3 style={{ marginTop: 0, color: "#f87171" }}>Pagar Deuda</h3>
           <p style={{color:"#ddd"}}>Acreedor: <strong>{debt.title}</strong></p>
           <div style={{fontSize:"2em", fontWeight:"bold", color:"white", marginBottom:20}}>${debt.amount.toLocaleString()}</div>
           
           <label style={{ display: "block", marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: "#aaa" }}>Método de Pago</span>
              <select value={method} onChange={e => setMethod(e.target.value)} style={{ width: "100%", padding: 10, background: "#222", color: "white", border: "1px solid #444", borderRadius: 6, marginTop: 5 }}>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="EFECTIVO">Efectivo (Caja Chica)</option>
                  <option value="TARJETA">Tarjeta Corporativa</option>
                  <option value="CHEQUE">Cheque</option>
              </select>
           </label>

           <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={onClose} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
              <button onClick={handlePay} style={{ background: "#f87171", color: "white", padding: "10px 20px", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}>Confirmar Pago</button>
           </div>
        </div>
      </div>
    );
  };

  const handleDeleteSupplyDebt = (id) => {
      if(confirm("¿Eliminar registro?")) {
          deleteSupplierDebt(id);
          setTick(t => t + 1);
      }
  };

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <div style={{ marginBottom: 20 }}>
        <Link to="/finance" style={{ color: "#888", textDecoration: "none", fontSize: "0.9em" }}>← Volver a Finanzas</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
           <div>
               <h1 style={{ margin: 0 }}>Cuentas por Pagar</h1>
               <p style={{ margin: "5px 0 0 0", color: "#666", fontSize: "0.9em" }}>Gestión de créditos de Laboratorios y Proveedores</p>
           </div>
           <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
               <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.8em", color: "#aaa" }}>DEUDA TOTAL</div>
                  <div style={{ fontSize: "1.8em", fontWeight: "bold", color: "#f87171" }}>${totalDebt.toLocaleString()}</div>
               </div>
               <button onClick={() => setIsCreating(true)} style={{ background: "#333", border: "1px solid #aaa", color: "white", padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>+ Registrar Factura</button>
           </div>
        </div>
      </div>

      {payModal && <PayModal debt={payModal} onClose={() => setPayModal(null)} />}
      {isCreating && <NewDebtModal onClose={() => setIsCreating(false)} />}

      <div style={{ display: "grid", gap: 10 }}>
        {allDebts.length === 0 ? (
           <p style={{ opacity: 0.5, textAlign: "center", padding: 40 }}>¡Excelente! No tienes deudas pendientes.</p>
        ) : (
           allDebts.map(d => (
             <div key={d.uniqueId} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: 15, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 20, alignItems: "center" }}>
                <div>
                   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                       <div style={{ fontWeight: "bold", fontSize: "1.1em", color: "#fff" }}>{d.title}</div>
                       {d.source === 'SUPPLIER' && <span style={{fontSize:"0.7em", background:"#1e3a8a", color:"#bfdbfe", padding:"2px 5px", borderRadius:3}}>PROVEEDOR</span>}
                       {d.source === 'WORK_ORDER' && <span style={{fontSize:"0.7em", background:"#374151", color:"#e5e7eb", padding:"2px 5px", borderRadius:3}}>LABORATORIO</span>}
                   </div>
                   <div style={{ color: "#888", fontSize: "0.9em", marginTop: 2 }}>{d.subtitle}</div>
                   <div style={{ fontSize: "0.8em", color: "#666", marginTop: 4 }}>Fecha: {new Date(d.date).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                   <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#f87171" }}>${d.amount.toLocaleString()}</div>
                   {d.source === 'SUPPLIER' && (
                       <button onClick={() => handleDeleteSupplyDebt(d.id)} style={{ background: "none", border: "none", color: "#666", fontSize: "0.8em", textDecoration: "underline", cursor: "pointer", marginTop: 2 }}>Eliminar</button>
                   )}
                </div>
                <button onClick={() => setPayModal(d)} style={{ background: "#333", border: "1px solid #555", color: "white", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>Pagar</button>
             </div>
           ))
        )}
      </div>
    </div>
  );
}