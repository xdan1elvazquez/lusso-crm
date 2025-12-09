// src/utils/migration.js
import { db } from "@/firebase/config";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

export async function migrateLegacyDataToDefaultBranch() {
    console.log("🚀 Iniciando migración de datos...");
    
    // Colecciones que necesitan branchId
    const collections = ["sales", "expenses", "shifts", "work_orders"];
    const DEFAULT_BRANCH = "lusso_main"; // Tu sucursal principal
    
    let totalMigrated = 0;

    for (const colName of collections) {
        console.log(`🔍 Revisando colección: ${colName}...`);
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        
        // Firestore limita los batches a 500 operaciones
        const batchSize = 450; 
        let batch = writeBatch(db);
        let operationCounter = 0;
        let batchCommittedCount = 0;

        for (const document of snapshot.docs) {
            const data = document.data();
            
            // Solo actualizamos si NO tiene branchId
            if (!data.branchId) {
                const docRef = doc(db, colName, document.id);
                batch.update(docRef, { branchId: DEFAULT_BRANCH });
                operationCounter++;
                totalMigrated++;
            }

            // Si llegamos al límite del batch, guardamos y reiniciamos
            if (operationCounter >= batchSize) {
                await batch.commit();
                console.log(`💾 Batch guardado en ${colName} (${operationCounter} docs)`);
                batch = writeBatch(db);
                operationCounter = 0;
                batchCommittedCount++;
            }
        }

        // Guardar los restantes del último batch
        if (operationCounter > 0) {
            await batch.commit();
            console.log(`💾 Último batch guardado en ${colName} (${operationCounter} docs)`);
        }
    }
    
    console.log(`🏁 MIGRACIÓN FINALIZADA. Total documentos actualizados: ${totalMigrated}`);
    alert(`Migración terminada. Se actualizaron ${totalMigrated} registros.`);
}