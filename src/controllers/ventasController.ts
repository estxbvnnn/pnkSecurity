import { Request, Response, NextFunction } from "express";
import { actualizarEstadoPedido, estadisticasVentas, listarPedidosRecientes } from "../models/pedidoModel";
import { obtenerRestaurante, listarRestaurantes } from "../models/restauranteModel";
import { idValido } from "../utils/validar";
import { ESTADOS_PEDIDO, EstadoPedido } from "../types/models";

export async function ventas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Panel "General" (?id=todos): ventas de TODOS los restaurantes juntos,
    // además del panel por restaurante que ya existía. No toca
    // session.restauranteId (eso sigue siendo "el restaurante activo" para
    // el resto del panel de admin).
    if (req.query.id === "todos") {
      const [restaurantes, stats, pedidos] = await Promise.all([
        listarRestaurantes(),
        estadisticasVentas(null),
        listarPedidosRecientes(null),
      ]);

      res.render("admin/ventas", {
        restauranteId: "todos",
        restaurante: null,
        restaurantes,
        stats,
        pedidos,
        estadosPedido: ESTADOS_PEDIDO,
        csrfToken: req.session.csrfToken,
        general: true,
      });
      return;
    }

    const restauranteId = idValido(req.query.id) ?? idValido(req.session.restauranteId) ?? 1;
    req.session.restauranteId = restauranteId;

    const [restaurante, restaurantes, stats, pedidos] = await Promise.all([
      obtenerRestaurante(restauranteId),
      listarRestaurantes(),
      estadisticasVentas(restauranteId),
      listarPedidosRecientes(restauranteId),
    ]);

    res.render("admin/ventas", {
      restauranteId,
      restaurante,
      restaurantes,
      stats,
      pedidos,
      estadosPedido: ESTADOS_PEDIDO,
      csrfToken: req.session.csrfToken,
      general: false,
    });
  } catch (err) {
    next(err);
  }
}

/** Cambia el estado de un pedido (revision/confirmado/entregado/cancelado). */
export async function actualizarEstado(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restauranteId = idValido(req.session.restauranteId) ?? 1;
    const pedidoId = idValido(req.params.id);
    const estado = String(req.body.estado ?? "") as EstadoPedido;

    if (pedidoId !== null && (ESTADOS_PEDIDO as readonly string[]).includes(estado)) {
      await actualizarEstadoPedido(pedidoId, restauranteId, estado);
    }

    res.redirect("/admin/ventas");
  } catch (err) {
    next(err);
  }
}
