// src/services/sequenceStorage.js
import { db } from "@/firebase/config";
import { doc, runTransaction } from "firebase/firestore";

/**
 * Obtiene el siguiente número de folio para una serie dada.
 * @param {string} counterName - El nombre del contador (ej: "sales", "prescriptions")
 * @returns {Promise<number>} El nuevo número secuencial.
 */
export async function getNextSequence(counterName) {
  const counterRef = doc(db, "counters", counterName);

  try {
    const newSequence = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      let currentCount = 0;
      if (counterDoc.exists()) {
        currentCount = counterDoc.data().current || 0;
      }

      const nextCount = currentCount + 1;

      // Si no existe, lo crea. Si existe, lo actualiza.
      transaction.set(counterRef, { current: nextCount }, { merge: true });

      return nextCount;
    });

    return newSequence;
  } catch (error) {
    console.error(`Error generando secuencia para ${counterName}:`, error);
    throw error;
  }
}