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
    req.session.carrito.push({ posicion, id: item.id, nombre: item.nombre, precio: item.precio });

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

/** Confirma el carrito actual como una venta real (tabla pedidos/detalle_pedido). */
export async function confirmar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restauranteId = idValido(req.session.restauranteId) ?? 1;
    const carrito = req.session.carrito ?? [];

    if (!carrito.length) {
      res.redirect("/carrito?error=vacio");
      return;
    }

    const clienteNombre = req.session.nombre ?? "Invitado";
    const pedido = await crearPedido(restauranteId, clienteNombre, carrito);
    req.session.carrito = [];

    res.render("pedido-confirmado", { restauranteId, pedido });
  } catch (err) {
    next(err);
  }
}
