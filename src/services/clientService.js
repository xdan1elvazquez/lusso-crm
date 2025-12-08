import { db } from "@/firebase/config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

export async function clientLogin(email, dobRaw) {
  const cleanEmail = email.trim().toLowerCase();
  const q = query(
    collection(db, "patients"), 
    where("email", "==", cleanEmail),
    where("deletedAt", "==", null)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) throw new Error("No encontramos un expediente con ese correo.");
  const patientDoc = snapshot.docs.find(doc => doc.data().dob === dobRaw);
  if (!patientDoc) throw new Error("La fecha de nacimiento no coincide.");
  return { id: patientDoc.id, ...patientDoc.data() };
}

// TRAER ÓRDENES + DETALLES DE VENTA (Precios y Caja)
export async function getClientOrders(patientId) {
    const q = query(
        collection(db, "work_orders"),
        where("patientId", "==", patientId)
    );
    const snapshot = await getDocs(q);
    
    // Mapeamos las órdenes y buscamos sus ventas en paralelo
    const ordersWithDetails = await Promise.all(snapshot.docs.map(async (d) => {
        const order = { id: d.id, ...d.data() };
        
        let saleDetails = { items: [], total: 0, boxNumber: "" }; // 👈 Init boxNumber
        
        // Si hay una venta ligada, traemos los detalles públicos
        if (order.saleId) {
            try {
                const saleSnap = await getDoc(doc(db, "sales", order.saleId));
                if (saleSnap.exists()) {
                    const sale = saleSnap.data();
                    
                    saleDetails.boxNumber = sale.boxNumber || ""; // 👈 Capturamos la Caja
                    
                    // Filtramos solo lo que el cliente debe ver
                    saleDetails.items = sale.items.map(item => ({
                        kind: item.kind,
                        description: item.description,
                        price: item.unitPrice,
                        specs: item.specs || {},
                        rx: item.rxSnapshot
                    }));
                }
            } catch (e) { console.error("Error cargando venta", e); }
        }

        return { ...order, saleDetails };
    }));

    return ordersWithDetails.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
}