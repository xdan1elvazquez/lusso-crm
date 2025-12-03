import { useEffect, useState, useCallback } from "react";
import {
  getPatients,
  createPatient,
  deletePatient,
  seedPatientsIfEmpty
} from "../services/patientsStorage";

export function usePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para cargar datos (ahora es async)
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPatients();
      setPatients(data);
      
      // Auto-seed solo si está vacío (opcional)
      if (data.length === 0) {
         // seedPatientsIfEmpty(); // Descomentar si quieres que cree uno automático
      }
    } catch (err) {
      console.error(err);
      setError("Error al cargar pacientes");
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Wrappers para las acciones
  const create = async (data) => {
    try {
      await createPatient(data);
      await refresh(); // Recargamos la lista tras crear
      return true;
    } catch (e) {
      alert("Error al crear: " + e.message);
      return false;
    }
  };

  const remove = async (id) => {
    if(!confirm("¿Eliminar paciente permanentemente?")) return;
    try {
      await deletePatient(id);
      await refresh(); // Recargamos la lista tras borrar
    } catch (e) {
      alert("Error al eliminar: " + e.message);
    }
  };

  return { patients, loading, error, create, remove, refresh };
}