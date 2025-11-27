import { useEffect, useMemo, useState } from "react";
import {
  seedPatientsIfEmpty,
  getPatients,
  createPatient,
  deletePatient,
} from "../services/patientsStorage";

export function usePatients() {
  const [patients, setPatients] = useState([]);

  const refresh = () => setPatients(getPatients());

  useEffect(() => {
    seedPatientsIfEmpty();
    refresh();
  }, []);

  const actions = useMemo(
    () => ({
      refresh,
      create: (data) => {
        const p = createPatient(data);
        refresh();
        return p;
      },
      remove: (id) => {
        deletePatient(id);
        refresh();
      },
    }),
    []
  );

  return { patients, ...actions };
}
