import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSale, getSalesByPatientId, deleteSale } from "@/services/salesStorage";
import { getExamsByPatient } from "@/services/eyeExamStorage"; 
import { getAllProducts } from "@/services/inventoryStorage"; 
import { getConsultationsByPatient } from "@/services/consultationsStorage"; // 👈 NUEVO IMPORT
import RxPicker from "./RxPicker";
import { normalizeRxValue } from "@/utils/rxOptions";

const PAYMENT_METHODS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"];

export default function SalesPanel({ patientId }) {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  
  // --- ESTADO DEL CARRITO ---
  const [cart, setCart] = useState([]); // Array de items por vender
  const [payment, setPayment] = useState({ initial: 0, method: "EFECTIVO" });

  // --- HERRAMIENTAS DE CARGA ---
  const sales = useMemo(() => getSalesByPatientId(patientId), [patientId, tick]);
  const exams = useMemo(() => getExamsByPatient(patientId), [patientId, tick]);
  const products = useMemo(() => getAllProducts(), []);
  const consultations = useMemo(() => getConsultationsByPatient(patientId), [patientId, tick]);

  // Buscador de productos
  const [prodQuery, setProdQuery] = useState("");
  const filteredProducts = useMemo(() => {
    if (!prodQuery) return [];
    return products.filter(p => p.brand.toLowerCase().includes(prodQuery.toLowerCase())).slice(0, 5);
  }, [products, prodQuery]);

  // --- ACCIONES DEL CARRITO ---
  const addToCart = (item) => {
    setCart(prev => [...prev, { ...item, _tempId: Date.now() + Math.random() }]);
    setProdQuery("");
  };

  const removeFromCart = (tempId) => {
    setCart(prev => prev.filter(i => i._tempId !== tempId));
  };

  // Importar desde Examen (Lentes)
  const handleImportExam = (e) => {
    const examId = e.target.value;
    if (!examId) return;
    const exam = exams.find(x => x.id === examId);
    
    let desc = "Lentes Completos";
    if (exam.recommendations?.design) desc += ` - ${exam.recommendations.design}`;
    
    addToCart({
      kind: "LENSES",
      description: desc,
      qty: 1,
      unitPrice: 0, // A definir por el vendedor
      requiresLab: true,
      eyeExamId: exam.id,
      rxSnapshot: normalizeRxValue(exam.rx),
      labName: "",
      dueDate: ""
    });
  };

  // Importar desde Consulta (Medicamentos)
  const handleImportConsultation = (e) => {
    const consultId = e.target.value;
    if (!consultId) return;
    const consultation = consultations.find(c => c.id === consultId);
    
    if (consultation.prescribedMeds && consultation.prescribedMeds.length > 0) {
      consultation.prescribedMeds.forEach(med => {
        addToCart({
          kind: "MEDICATION",
          description: med.productName,
          qty: med.qty || 1,
          unitPrice: med.price || 0,
          inventoryProductId: med.productId,
          requiresLab: false
        });
      });
      alert(`Se agregaron ${consultation.prescribedMeds.length} medicamentos al carrito.`);
    } else {
      alert("Esta consulta no tiene medicamentos vinculados.");
    }
  };

  // COBRAR TODO
  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);

    createSale({
      patientId,
      total,
      payments: payment.initial > 0 ? [{ amount: Number(payment.initial), method: payment.method, paidAt: new Date().toISOString() }] : [],
      items: cart.map(item => ({
        kind: item.kind,
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
        requiresLab: item.requiresLab,
        eyeExamId: item.eyeExamId || null,
        inventoryProductId: item.inventoryProductId || null,
        rxSnapshot: item.rxSnapshot || null,
        labName: item.labName || "",
        dueDate: item.dueDate || null,
      }))
    });

    setCart([]);
    setPayment({ initial: 0, method: "EFECTIVO" });
    
    // Si hubo algo de laboratorio, ir a work orders
    if (cart.some(i => i.requiresLab)) {
      navigate("/work-orders");
    } else {
      setTick(t => t + 1);
      alert("Venta procesada correctamente");
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitPrice)), 0);

  return (
    <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      
      {/* COLUMNA IZQUIERDA: AGREGAR ITEMS */}
      <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
        <h3 style={{ marginTop: 0, color: "#e5e7eb" }}>Agregar a la Venta</h3>
        
        {/* 1. BUSCADOR DE PRODUCTOS */}
        <div style={{ marginBottom: 20, position: "relative" }}>
          <label style={{ fontSize: 12, color: "#aaa" }}>Buscar Producto (Inventario)</label>
          <input 
            value={prodQuery}
            onChange={e => setProdQuery(e.target.value)}
            placeholder="Escribe marca..."
            style={{ width: "100%", padding: 10, background: "#222", border: "1px solid #444", color: "white", borderRadius: 6 }}
          />
          {filteredProducts.length > 0 && (
            <div style={{ position: "absolute", top: "100%", width: "100%", background: "#333", border: "1px solid #555", zIndex: 10 }}>
              {filteredProducts.map(p => (
                <div key={p.id} onClick={() => addToCart({
                  kind: p.category === "FRAMES" ? "LENSES" : "MEDICATION", // Simplificado
                  description: `${p.brand} ${p.model}`,
                  qty: 1,
                  unitPrice: p.price,
                  inventoryProductId: p.id,
                  requiresLab: p.category === "FRAMES" // Asumimos que armazón lleva lab
                })} style={{ padding: 10, borderBottom: "1px solid #444", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                  <span>{p.brand} {p.model}</span>
                  <span style={{ color: "#4ade80" }}>${p.price} (Stock: {p.stock})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. IMPORTAR EXAMEN */}
        <div style={{ marginBottom: 20, padding: 15, background: "#1e3a8a", borderRadius: 8 }}>
          <label style={{ display: "block", color: "#bfdbfe", fontSize: 13, marginBottom: 5 }}>Importar Graduación (Lentes)</label>
          <select onChange={handleImportExam} style={{ width: "100%", padding: 8, borderRadius: 4 }}>
            <option value="">-- Seleccionar Examen --</option>
            {exams.map(e => (
              <option key={e.id} value={e.id}>
                {new Date(e.examDate).toLocaleDateString()} - {e.recommendations?.design || "General"}
              </option>
            ))}
          </select>
        </div>

        {/* 3. IMPORTAR RECETA MÉDICA */}
        <div style={{ marginBottom: 20, padding: 15, background: "#064e3b", borderRadius: 8 }}>
          <label style={{ display: "block", color: "#a7f3d0", fontSize: 13, marginBottom: 5 }}>Importar Receta Médica</label>
          <select onChange={handleImportConsultation} style={{ width: "100%", padding: 8, borderRadius: 4 }}>
            <option value="">-- Seleccionar Consulta --</option>
            {consultations.map(c => (
              <option key={c.id} value={c.id}>
                {new Date(c.visitDate).toLocaleDateString()} - {c.diagnosis || "Sin Dx"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* COLUMNA DERECHA: CARRITO Y COBRO */}
      <div style={{ background: "#111", padding: 20, borderRadius: 12, border: "1px solid #333", display: "flex", flexDirection: "column" }}>
        <h3 style={{ marginTop: 0, color: "#4ade80" }}>🛒 Carrito de Compras</h3>
        
        <div style={{ flex: 1, overflowY: "auto", minHeight: 200, marginBottom: 20 }}>
          {cart.length === 0 ? (
            <p style={{ color: "#666", textAlign: "center", marginTop: 40 }}>Carrito vacío</p>
          ) : (
            cart.map((item, idx) => (
              <div key={item._tempId || idx} style={{ background: "#222", padding: 10, borderRadius: 6, marginBottom: 8, display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{item.description}</strong>
                  <button onClick={() => removeFromCart(item._tempId)} style={{ color: "#f87171", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </div>
                
                <div style={{ display: "flex", gap: 10 }}>
                  <label style={{ fontSize: 11, color: "#aaa" }}>Cant: <input type="number" value={item.qty} onChange={e => {
                    const newCart = [...cart];
                    newCart[idx].qty = e.target.value;
                    setCart(newCart);
                  }} style={{ width: 40, background: "#333", border: "none", color: "white", padding: 2 }} /></label>
                  
                  <label style={{ fontSize: 11, color: "#aaa" }}>Precio: $<input type="number" value={item.unitPrice} onChange={e => {
                    const newCart = [...cart];
                    newCart[idx].unitPrice = e.target.value;
                    setCart(newCart);
                  }} style={{ width: 60, background: "#333", border: "none", color: "white", padding: 2 }} /></label>
                </div>

                {item.requiresLab && (
                  <div style={{ fontSize: 11, background: "#333", padding: 4, borderRadius: 4 }}>
                    <input placeholder="Laboratorio" value={item.labName} onChange={e => {
                       const newCart = [...cart]; newCart[idx].labName = e.target.value; setCart(newCart);
                    }} style={{ background: "transparent", border: "none", color: "#ddd", width: "100%" }} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: "1px solid #333", paddingTop: 15 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2em", fontWeight: "bold", marginBottom: 15 }}>
            <span>Total:</span>
            <span>${cartTotal.toLocaleString()}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 15 }}>
             <label style={{ fontSize: 12 }}>
               Anticipo
               <input type="number" value={payment.initial} onChange={e => setPayment({...payment, initial: e.target.value})} style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 4 }} />
             </label>
             <label style={{ fontSize: 12 }}>
               Método
               <select value={payment.method} onChange={e => setPayment({...payment, method: e.target.value})} style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 4 }}>
                 {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
               </select>
             </label>
          </div>

          <button onClick={handleCheckout} disabled={cart.length === 0} style={{ width: "100%", padding: 12, background: cart.length > 0 ? "#16a34a" : "#333", color: "white", border: "none", borderRadius: 6, cursor: cart.length > 0 ? "pointer" : "not-allowed", fontWeight: "bold", fontSize: "1.1em" }}>
            Cobrar Venta
          </button>
        </div>
      </div>
    </section>
  );
}