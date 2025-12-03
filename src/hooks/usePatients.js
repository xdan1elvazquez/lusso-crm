import { useEffect, useState, useCallback } from "react";
import {
  getPatients,
  createPatient,
  deletePatient
} from "@/services/patientsStorage"; // Asegúrate que este path sea correcto

export function usePatients() {
  const [patients, setPatients] = useState([]); // Estado inicial: Array vacío
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para cargar datos
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Esperamos a que la promesa se resuelva
      const data = await getPatients(); 
      
      // Verificación de seguridad: si data es null/undefined, ponemos []
      setPatients(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error("Error en usePatients:", err);
      setError("Error al cargar pacientes");
      setPatients([]); // En error, aseguramos array vacío
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Acción: Crear
  const create = async (data) => {
    try {
      await createPatient(data);
      await refresh(); // Recargamos la lista
      return true;
    } catch (e) {
      console.error(e);
      alert("Error al crear: " + e.message);
      return false;
    }
  };

  // Acción: Eliminar
  const remove = async (id) => {
    if(!confirm("¿Eliminar paciente permanentemente?")) return;
    try {
      await deletePatient(id);
      await refresh(); // Recargamos
    } catch (e) {
      console.error(e);
      alert("Error al eliminar: " + e.message);
    }
  };

  return { patients, loading, error, create, remove, refresh };
}