import { db } from "@/firebase/config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

/**
 * 🧠 CEREBRO DE COMPRAS LUSSO
 * Analiza la rotación de inventario para sugerir compras inteligentes.
 */

// 1. Obtener todas las ventas de los últimos X días
async function getRecentSales(days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const isoStart = startDate.toISOString();

    const q = query(
        collection(db, "sales"),
        where("createdAt", ">=", isoStart),
        where("status", "!=", "CANCELLED") // Ignorar canceladas
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
}

// 2. Obtener todo el inventario activo
async function getAllProducts() {
    const q = query(
        collection(db, "products"),
        where("deletedAt", "==", null) // Solo activos
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 🚀 FUNCIÓN PRINCIPAL: Generar Reporte de Inteligencia
export async function getInventoryAnalysis(analysisDays = 90) {
    try {
        const [products, sales] = await Promise.all([
            getAllProducts(),
            getRecentSales(analysisDays)
        ]);

        // A. Mapa de Ventas por Producto
        const salesMap = {}; // { productId: { qty: 0, revenue: 0, lastSale: null } }

        sales.forEach(sale => {
            if (Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    if (item.inventoryProductId) { // Solo items de inventario
                        if (!salesMap[item.inventoryProductId]) {
                            salesMap[item.inventoryProductId] = { qty: 0, revenue: 0, lastSale: null };
                        }
                        
                        salesMap[item.inventoryProductId].qty += (item.qty || 0);
                        salesMap[item.inventoryProductId].revenue += (item.qty * item.unitPrice);
                        
                        // Guardar fecha de última venta si es más reciente
                        const saleDate = new Date(sale.createdAt);
                        const currentLast = salesMap[item.inventoryProductId].lastSale;
                        if (!currentLast || saleDate > currentLast) {
                            salesMap[item.inventoryProductId].lastSale = saleDate;
                        }
                    }
                });
            }
        });

        // B. Clasificación de Productos
        const analysis = products.map(prod => {
            const stats = salesMap[prod.id] || { qty: 0, revenue: 0, lastSale: null };
            
            // Métricas Clave
            const velocity = stats.qty / analysisDays; // Unidades vendidas por día
            const currentStock = Number(prod.stock) || 0;
            const minStock = Number(prod.minStock) || 0;
            
            // Días de Inventario (Runway): ¿Para cuántos días me alcanza el stock actual?
            // Si velocidad es 0, el stock es infinito (o estancado).
            let daysOfInventory = velocity > 0 ? (currentStock / velocity) : 9999;
            if (currentStock === 0) daysOfInventory = 0;

            // Días desde la última venta (Aging)
            const daysSinceLastSale = stats.lastSale 
                ? Math.floor((new Date() - stats.lastSale) / (1000 * 60 * 60 * 24))
                : 999; // Nunca vendido en este periodo

            // CLASIFICACIÓN (La Lógica del Semáforo)
            let status = "HEALTHY"; // Verde
            let suggestion = "Mantener";

            // 🔴 CRÍTICO: Stock debajo del mínimo o se acaba en menos de 15 días
            if (currentStock <= minStock || (velocity > 0 && daysOfInventory < 15)) {
                status = "CRITICAL";
                const idealStock = Math.ceil(velocity * 45); // Stock para 45 días
                const toBuy = Math.max(0, idealStock - currentStock);
                suggestion = `URGENTE: Comprar ${toBuy} pzas`;
            }
            
            // 💀 HUESO (DEAD): Stock > 0 pero no se ha vendido nada en el periodo
            else if (currentStock > 0 && stats.qty === 0) {
                status = "DEAD";
                suggestion = "LIQUIDAR: Oferta 2x1 o Remate";
            }
            
            // 🟡 LENTO: Se vende, pero muy poco (Aging alto)
            else if (currentStock > 0 && daysOfInventory > 180) {
                status = "SLOW";
                suggestion = "Promocionar: Exceso de stock";
            }

            return {
                ...prod,
                stats: {
                    soldInPeriod: stats.qty,
                    revenueInPeriod: stats.revenue,
                    dailyVelocity: velocity.toFixed(2),
                    daysOfInventory: Math.round(daysOfInventory),
                    daysSinceLastSale
                },
                analysis: {
                    status, // CRITICAL, DEAD, SLOW, HEALTHY
                    suggestion
                }
            };
        });

        // C. Ordenar y Retornar
        return {
            criticalItems: analysis.filter(i => i.analysis.status === "CRITICAL").sort((a,b) => b.stats.dailyVelocity - a.stats.dailyVelocity), // Los más vendidos primero
            deadItems: analysis.filter(i => i.analysis.status === "DEAD").sort((a,b) => b.stock - a.stock), // Los que más espacio ocupan primero
            slowItems: analysis.filter(i => i.analysis.status === "SLOW"),
            healthyItems: analysis.filter(i => i.analysis.status === "HEALTHY"),
            totalEvaluated: analysis.length,
            periodDays: analysisDays
        };

    } catch (error) {
        console.error("Error en análisis de inventario:", error);
        throw new Error("No se pudo generar la inteligencia de inventario.");
    }
}