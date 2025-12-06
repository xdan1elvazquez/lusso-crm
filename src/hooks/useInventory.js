import { useState, useEffect, useCallback } from "react";
import { 
  getAllProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getInventoryStats // 👈 Importamos
} from "@/services/inventoryStorage";

export function useInventory() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ totalFrames: 0, inventoryValue: 0, byGender: { HOMBRE:0, MUJER:0, UNISEX:0, NIÑO:0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Cargamos productos Y estadísticas por separado
      const [prodData, statsData] = await Promise.all([
          getAllProducts(),
          getInventoryStats()
      ]);
      
      setProducts(prodData);
      setStats(statsData); // 👈 Usamos el dato directo de DB
      
    } catch (err) {
      console.error(err);
      setError("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Actions wrappers
  const add = async (data) => { await createProduct(data); refresh(); };
  const edit = async (id, data) => { await updateProduct(id, data); refresh(); };
  const remove = async (id) => { await deleteProduct(id); refresh(); };

  return { 
    products, 
    stats, // 👈 Ahora viene de DB, no de useMemo
    loading, 
    error, 
    add, 
    edit, 
    remove, 
    refresh 
  };
}