import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getInventoryAnalysis } from "@/services/inventoryAnalysisService"; // Tu servicio nuevo

const NotificationsContext = createContext();

export function useNotifications() {
  return useContext(NotificationsContext);
}

export function NotificationsProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 🔄 FUNCIÓN MAESTRA: Revisa todo el sistema
  const checkSystemHealth = async () => {
    console.log("🔍 Watchdog: Revisando salud del sistema...");
    const newAlerts = [];

    try {
      // 1. REVISAR INVENTARIO (CRÍTICO)
      // Usamos tu servicio de inteligencia. Si hay items críticos, alerta roja.
      const inventoryData = await getInventoryAnalysis(30); // Análisis de 30 días
      if (inventoryData.criticalItems.length > 0) {
        newAlerts.push({
          id: "stock-critical",
          type: "CRITICAL",
          title: "Stock por Agotarse",
          message: `Hay ${inventoryData.criticalItems.length} productos críticos que se venden rápido.`,
          route: "/purchasing", // Te lleva al Centro de Compras
          timestamp: new Date()
        });
      }
      if (inventoryData.deadItems.length > 20) {
        newAlerts.push({
          id: "stock-dead",
          type: "WARNING",
          title: "Dinero Estancado",
          message: `Detectamos ${inventoryData.deadItems.length} productos 'hueso'. Considera liquidar.`,
          route: "/purchasing",
          timestamp: new Date()
        });
      }

      // 2. REVISAR TRABAJOS RETRASADOS (WORK ORDERS)
      // Buscamos órdenes activas que ya pasaron su fecha promesa
      const todayStr = new Date().toISOString().slice(0, 10);
      const woQuery = query(
        collection(db, "work_orders"),
        where("status", "in", ["PENDING", "SENT_TO_LAB", "IN_PROCESS"]) // Solo activas
      );
      const woSnap = await getDocs(woQuery);
      let delayedCount = 0;
      
      woSnap.forEach(doc => {
        const wo = doc.data();
        if (wo.promisedDate && wo.promisedDate < todayStr) {
            delayedCount++;
        }
      });

      if (delayedCount > 0) {
        newAlerts.push({
          id: "wo-delayed",
          type: "URGENT",
          title: "Trabajos Retrasados",
          message: `Hay ${delayedCount} órdenes vencidas en laboratorio.`,
          route: "/work-orders",
          timestamp: new Date()
        });
      }

      // 3. OPORTUNIDADES DE MARKETING (GROWTH)
      // Chequeo rápido de cumpleaños hoy
      const month = new Date().getMonth(); // 0-11
      // Nota: Para no saturar, hacemos esto ligero o lo omitimos si son muchos pacientes.
      // Aquí solo ponemos un recordatorio fijo si estamos a inicio de mes
      const day = new Date().getDate();
      if (day === 1) {
         newAlerts.push({
            id: "growth-monthly",
            type: "INFO",
            title: "Planificación Mensual",
            message: "Es día 1. Revisa los cumpleaños y recalls del mes.",
            route: "/growth",
            timestamp: new Date()
         });
      }

    } catch (error) {
      console.error("Error en Watchdog:", error);
    }

    setAlerts(newAlerts);
    setUnreadCount(newAlerts.length);
    setLoading(false);
  };

  // Ejecutar al inicio y cada 10 minutos
  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 600000); // 10 min
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationsContext.Provider value={{ alerts, unreadCount, loading, refresh: checkSystemHealth }}>
      {children}
    </NotificationsContext.Provider>
  );
}