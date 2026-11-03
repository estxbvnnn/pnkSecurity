import { Request, Response, NextFunction } from "express";
import { crearComentario } from "../models/comentarioModel";
import { idValido } from "../utils/validar";

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Control de acceso (equivalente a VUL-13): solo usuarios autenticados.
    if (!req.session.nombre) {
      res.status(403).send("Debe iniciar sesión para comentar.");
      return;
    }

    const restauranteId = idValido(req.session.restauranteId) ?? 1;
    const comentario = String(req.body.comentario ?? "").trim();

    if (comentario === "" || comentario.length > 1000) {
      res.redirect(`/restaurante/${restauranteId}`);
      return;
    }

    // El autor se toma de la SESIÓN, nunca de un campo del formulario.
    await crearComentario(req.session.nombre, comentario, restauranteId);
    res.redirect(`/restaurante/${restauranteId}`);
  } catch (err) {
    next(err);
  }
}
