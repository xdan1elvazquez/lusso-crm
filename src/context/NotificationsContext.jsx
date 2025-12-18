import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
// Asegúrate que la ruta del servicio sea correcta:
import { getInventoryAnalysis } from "@/services/inventoryAnalysisService"; 

// 🛡️ DEFINICIÓN SEGURA: Valores por defecto para evitar "Crash" si falla el Provider
const defaultContextValue = {
  alerts: [],
  unreadCount: 0,
  loading: false,
  refresh: () => console.warn("⚠️ NotificationsProvider no encontrado en el árbol.")
};

const NotificationsContext = createContext(defaultContextValue);

export function useNotifications() {
  return useContext(NotificationsContext);
}

export function NotificationsProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 🔄 FUNCIÓN MAESTRA
  const checkSystemHealth = async () => {
    console.log("🔍 Watchdog: Iniciando escaneo...");
    const newAlerts = [];

    try {
      // 1. INVENTARIO (Intenta importar el servicio)
      if (getInventoryAnalysis) {
          const inventoryData = await getInventoryAnalysis(30); 
          
          if (inventoryData?.criticalItems?.length > 0) {
            newAlerts.push({
              id: "stock-critical",
              type: "CRITICAL",
              title: "Stock Crítico",
              message: `Quedan pocos de ${inventoryData.criticalItems.length} productos top.`,
              route: "/purchasing",
              timestamp: new Date()
            });
          }
          
          if (inventoryData?.deadItems?.length > 20) {
            newAlerts.push({
              id: "stock-dead",
              type: "WARNING",
              title: "Exceso de Inventario",
              message: `${inventoryData.deadItems.length} productos sin movimiento.`,
              route: "/purchasing",
              timestamp: new Date()
            });
          }
      }

      // 2. WORK ORDERS
      const todayStr = new Date().toISOString().slice(0, 10);
      const woQuery = query(
        collection(db, "work_orders"),
        where("status", "in", ["PENDING", "SENT_TO_LAB", "IN_PROCESS"])
      );
      
      const woSnap = await getDocs(woQuery);
      let delayedCount = 0;
      
      woSnap.forEach(doc => {
        const wo = doc.data();
        if (wo.promisedDate && wo.promisedDate < todayStr) delayedCount++;
      });

      if (delayedCount > 0) {
        newAlerts.push({
          id: "wo-delayed",
          type: "URGENT",
          title: "Retrasos en Lab",
          message: `${delayedCount} órdenes vencidas. Revisa proveedores.`,
          route: "/work-orders",
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error("❌ Error en Watchdog:", error);
    }

    setAlerts(newAlerts);
    setUnreadCount(newAlerts.length);
    setLoading(false);
  };

  useEffect(() => {
    console.log("✅ NotificationsProvider Montado");
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 600000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationsContext.Provider value={{ alerts, unreadCount, loading, refresh: checkSystemHealth }}>
      {children}
    </NotificationsContext.Provider>
  );
}