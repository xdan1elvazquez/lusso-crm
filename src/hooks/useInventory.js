import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  getAllProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  computeInventoryStats
} from "@/services/inventoryStorage";

export function useInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllProducts();
      setProducts(data);
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

  // Estadísticas calculadas automáticamente cuando cambian los productos
  const stats = useMemo(() => computeInventoryStats(products), [products]);

  // Actions wrappers
  const add = async (data) => {
    await createProduct(data);
    refresh();
  };

  const edit = async (id, data) => {
    await updateProduct(id, data);
    refresh();
  };

  const remove = async (id) => {
    await deleteProduct(id);
    refresh();
  };

  return { 
    products, 
    stats, 
    loading, 
    error, 
    add, 
    edit, 
    remove, 
    refresh 
  };
}