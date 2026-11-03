import { Request, Response, NextFunction } from "express";
import { estadisticasVentas, listarPedidosRecientes } from "../models/pedidoModel";
import { obtenerRestaurante, listarRestaurantes } from "../models/restauranteModel";
import { idValido } from "../utils/validar";

export async function ventas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restauranteId = idValido(req.query.id) ?? idValido(req.session.restauranteId) ?? 1;
    req.session.restauranteId = restauranteId;

    const [restaurante, restaurantes, stats, pedidos] = await Promise.all([
      obtenerRestaurante(restauranteId),
      listarRestaurantes(),
      estadisticasVentas(restauranteId),
      listarPedidosRecientes(restauranteId),
    ]);

    res.render("admin/ventas", { restauranteId, restaurante, restaurantes, stats, pedidos });
  } catch (err) {
    next(err);
  }
}
