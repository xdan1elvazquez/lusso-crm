import { db } from "@/firebase/config";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

/**
 * 🚀 MIGRACIÓN DE INTELIGENCIA
 * Prepara la base de datos para el módulo CRM Premium.
 * 1. Genera referralCode para pacientes antiguos.
 * 2. Inicializa nextRecallDate y marketingConsent.
 */
export async function migratePatientsToIntelligence() {
    console.log("🧠 Iniciando preparación de Inteligencia Artificial...");
    
    const colRef = collection(db, "patients");
    const snapshot = await getDocs(colRef);
    
    const batchSize = 450; 
    let batch = writeBatch(db);
    let counter = 0;
    let totalUpdated = 0;

    // Helper local para generar código
    const genCode = (name, last) => {
        const f = (name || "X").replace(/[^a-zA-Z]/g, "").toUpperCase().substring(0, 3);
        const l = (last || "X").replace(/[^a-zA-Z]/g, "").toUpperCase().substring(0, 2);
        const r = Math.floor(100 + Math.random() * 900);
        return `${f}${l}${r}`;
    };

    for (const document of snapshot.docs) {
        const data = document.data();
        let needsUpdate = false;
        let updates = {};

        // 1. Generar Código de Referido si no tiene
        if (!data.referralCode) {
            updates.referralCode = genCode(data.firstName, data.lastName);
            needsUpdate = true;
        }

        // 2. Inicializar Consentimiento de Marketing (Default: TRUE)
        if (data.marketingConsent === undefined) {
            updates.marketingConsent = true;
            needsUpdate = true;
        }

        // 3. Inicializar Fechas de Seguimiento
        if (data.nextRecallDate === undefined) {
            updates.nextRecallDate = null; // Se calculará dinámicamente después
            needsUpdate = true;
        }

        if (needsUpdate) {
            const docRef = doc(db, "patients", document.id);
            batch.update(docRef, updates);
            counter++;
            totalUpdated++;
        }

        // Commit del batch si está lleno
        if (counter >= batchSize) {
            await batch.commit();
            console.log(`💾 Lote guardado: ${counter} pacientes actualizados.`);
            batch = writeBatch(db);
            counter = 0;
        }
    }

    // Guardar remanentes
    if (counter > 0) {
        await batch.commit();
    }
    
    console.log(`✅ LISTO. Se prepararon ${totalUpdated} pacientes para el sistema inteligente.`);
    alert(`Migración completada. ${totalUpdated} pacientes actualizados con éxito.`);
}