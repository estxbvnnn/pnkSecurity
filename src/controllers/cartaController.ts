import { Request, Response, NextFunction } from "express";
import { obtenerRestaurantePorSlug, listarRestaurantesPublico } from "../models/restauranteModel";
import { listarCartas, listarCategorias, listarItemsPorCategoria, listarDestacados } from "../models/cartaModel";
import { listarComentarios } from "../models/comentarioModel";

/** GET /api/restaurantes — listado público para la portada de React. */
export async function listarRestaurantes(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantes = await listarRestaurantesPublico();
    res.json({ restaurantes });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/restaurantes/:slug — carta digital completa de un restaurante.
 * Por slug (no por id numérico): evita exponer/enumerar ids secuenciales
 * en la URL pública (ej. "/africarestobar" en vez de "/restaurante/1").
 */
export async function verCarta(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurante = await obtenerRestaurantePorSlug(req.params.slug);
    if (!restaurante) {
      res.status(404).json({ ok: false, error: "restaurante_no_encontrado" });
      return;
    }
    req.session.restauranteId = restaurante.id; // el carrito/pedidos siguen operando por id internamente

    const destacados = await listarDestacados(restaurante.id);
    const cartas = await listarCartas(restaurante.id);

    const secciones = await Promise.all(
      cartas.map(async (carta) => {
        const categorias = await listarCategorias(carta.id);
        const categoriasConItems = await Promise.all(
          categorias.map(async (categoria) => ({
            categoria,
            items: await listarItemsPorCategoria(categoria.id),
          }))
        );
        return { carta, categoriasConItems };
      })
    );

    const comentarios = await listarComentarios(restaurante.id);

    res.json({
      restaurante,
      destacados,
      secciones,
      comentarios,
      sesion: {
        nombreUsuario: req.session.nombre ?? null,
        esAdmin: req.session.rol === "admin",
      },
    });
  } catch (err) {
    next(err);
  }
}
