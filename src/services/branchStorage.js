import { db } from "@/firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { BRANCHES_CONFIG, DEFAULT_BRANCH_ID } from "@/utils/branchesConfig";

const COLLECTION = "branches";

// Obtiene la config fusionando: Estáticos (Colores) + Dinámicos (Fiscales)
export async function getBranchSettings(branchId) {
    const safeId = branchId || DEFAULT_BRANCH_ID;
    
    // 1. Configuración Base (Estática)
    const staticConfig = BRANCHES_CONFIG[safeId] || BRANCHES_CONFIG[DEFAULT_BRANCH_ID];

    try {
        // 2. Intentamos buscar datos fiscales en Firebase
        const ref = doc(db, COLLECTION, safeId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            const dbData = snap.data();
            // FUSIONAMOS: Prioridad a lo que esté en la base de datos
            return { 
                ...staticConfig, 
                ...dbData,
                fiscalData: dbData.fiscalData || staticConfig.fiscalData || {} 
            };
        }
    } catch (error) {
        console.error("Error cargando config de sucursal:", error);
    }

    return staticConfig; // Si falla, usamos la estática
}

// Guarda los cambios fiscales
export async function updateBranchFiscalData(branchId, fiscalData) {
    if (!branchId) throw new Error("ID de sucursal requerido");
    
    const ref = doc(db, COLLECTION, branchId);
    
    await setDoc(ref, { 
        fiscalData: fiscalData,
        updatedAt: new Date().toISOString()
    }, { merge: true });
    
    return true;
}