import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { api, ItemCarrito, PedidoConfirmado } from "../api";

interface CarritoState {
  items: ItemCarrito[];
  total: number;
  cantidad: number;
  cargando: boolean;
  agregar: (itemId: number) => Promise<void>;
  eliminar: (posicion: number) => Promise<void>;
  vaciar: () => Promise<void>;
  confirmar: () => Promise<{ ok: boolean; pedidos?: PedidoConfirmado[]; error?: string }>;
}

const CartContext = createContext<CarritoState | null>(null);

export function CartProvider({ children }: { children: ReactNode }): JSX.Element {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    const datos = await api.verCarrito();
    setItems(datos.carrito);
  }, []);

  useEffect(() => {
    refrescar().finally(() => setCargando(false));
  }, [refrescar]);

  const agregar = useCallback(
    async (itemId: number) => {
      await api.agregarAlCarrito(itemId);
      await refrescar();
    },
    [refrescar]
  );

  const eliminar = useCallback(
    async (posicion: number) => {
      await api.eliminarDelCarrito(posicion);
      await refrescar();
    },
    [refrescar]
  );

  const vaciar = useCallback(async () => {
    await api.vaciarCarrito();
    await refrescar();
  }, [refrescar]);

  const confirmar = useCallback(async () => {
    try {
      const res = await api.confirmarCarrito();
      setItems([]);
      return { ok: true, pedidos: res.pedidos };
    } catch {
      return { ok: false, error: "No se pudo confirmar el pedido." };
    }
  }, []);

  const total = useMemo(() => items.reduce((s, i) => s + i.precio, 0), [items]);

  return (
    <CartContext.Provider value={{ items, total, cantidad: items.length, cargando, agregar, eliminar, vaciar, confirmar }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCarrito(): CarritoState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CartProvider>");
  return ctx;
}
