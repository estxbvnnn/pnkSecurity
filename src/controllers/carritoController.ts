import { Request, Response, NextFunction } from "express";
import { obtenerItemParaCarrito } from "../models/itemModel";
import { crearPedido } from "../models/pedidoModel";
import { idValido } from "../utils/validar";

export async function agregar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemId = idValido(req.body.itemId);
    if (itemId === null) {
      res.status(400).json({ ok: false, error: "id_invalido" });
      return;
    }

    const item = await obtenerItemParaCarrito(itemId);
    if (!item) {
      res.status(404).json({ ok: false, error: "item_no_encontrado" });
      return;
    }

    if (!req.session.carrito) req.session.carrito = [];
    const posicion = req.session.carrito.length + 1;
    req.session.carrito.push({
      posicion,
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
      restauranteId: item.restauranteId,
      restauranteNombre: item.restauranteNombre,
    });

    res.json({ ok: true, posicion });
  } catch (err) {
    next(err);
  }
}

export function eliminarItem(req: Request, res: Response): void {
  const posicion = idValido(req.body.posicion);
  if (posicion !== null && req.session.carrito) {
    req.session.carrito = req.session.carrito.filter((i) => i.posicion !== posicion);
  }
  res.json({ ok: true });
}

export function vaciar(req: Request, res: Response): void {
  // Solo se vacía el carrito, no se destruye toda la sesión del usuario
  // (equivalente a la corrección de VUL-13/IDOR en pnkSecurity).
  req.session.carrito = [];
  res.json({ ok: true });
}

export function mostrar(req: Request, res: Response): void {
  res.render("carrito", {
    restauranteId: idValido(req.session.restauranteId) ?? 1,
    carrito: req.session.carrito ?? [],
    csrfToken: req.session.csrfToken,
  });
}

/**
 * Confirma el carrito actual como venta(s) real(es). El carrito puede traer
 * ítems de varios restaurantes (se agregó uno en el restaurante 1, después
 * se navegó al restaurante 2 y se agregó otro) — cada restaurante representado
 * en el carrito se agrupa y se confirma como SU PROPIO pedido (tabla
 * pedidos/detalle_pedido), para que las Ventas de cada restaurante queden
 * correctas. No se mezclan items de distintos restaurantes en un mismo pedido.
 */
export async function confirmar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const carrito = req.session.carrito ?? [];

    if (!carrito.length) {
      res.redirect("/carrito?error=vacio");
      return;
    }

    const restauranteIdActual = idValido(req.session.restauranteId) ?? 1;
    const clienteNombre = req.session.nombre ?? "Invitado";

    const porRestaurante = new Map<number, { nombre: string; items: typeof carrito }>();
    for (const item of carrito) {
      const grupo = porRestaurante.get(item.restauranteId);
      if (grupo) {
        grupo.items.push(item);
      } else {
        porRestaurante.set(item.restauranteId, { nombre: item.restauranteNombre, items: [item] });
      }
    }

    const pedidos = [];
    for (const [restauranteId, grupo] of porRestaurante) {
      const pedido = await crearPedido(restauranteId, clienteNombre, grupo.items);
      pedidos.push({ ...pedido, restauranteId, restauranteNombre: grupo.nombre });
    }

    req.session.carrito = [];

    res.render("pedido-confirmado", { restauranteId: restauranteIdActual, pedidos });
  } catch (err) {
    next(err);
  }
}
