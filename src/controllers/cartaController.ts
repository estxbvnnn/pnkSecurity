import { Request, Response, NextFunction } from "express";
import { obtenerRestaurante, listarRestaurantesPublico } from "../models/restauranteModel";
import { listarCartas, listarCategorias, listarItemsPorCategoria, listarDestacados } from "../models/cartaModel";
import { listarComentarios } from "../models/comentarioModel";
import { idValido } from "../utils/validar";

/** Landing "/": selector público de restaurantes (cada uno con su propia carta). */
export async function listarRestaurantes(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantes = await listarRestaurantesPublico();
    res.render("restaurantes", { restaurantes });
  } catch (err) {
    next(err);
  }
}

/** Carta digital de un restaurante específico: GET /restaurante/:id */
export async function verCarta(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restauranteId = idValido(req.params.id);
    if (restauranteId === null) {
      res.status(404).send("Restaurante no encontrado.");
      return;
    }

    const restaurante = await obtenerRestaurante(restauranteId);
    if (!restaurante) {
      res.status(404).send("Restaurante no encontrado.");
      return;
    }

    const destacados = await listarDestacados(restauranteId);
    const cartas = await listarCartas(restauranteId);

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

    const comentarios = await listarComentarios(restauranteId);

    res.render("index", {
      restauranteId,
      restaurante,
      destacados,
      secciones,
      comentarios,
      nombreUsuario: req.session.nombre ?? null,
      esAdmin: req.session.rol === "admin",
      loginEstado: (req.query.login as string) ?? null,
      csrfToken: req.session.csrfToken,
    });
  } catch (err) {
    next(err);
  }
}
