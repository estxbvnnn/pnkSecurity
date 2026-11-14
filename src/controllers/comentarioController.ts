import { Request, Response, NextFunction } from "express";
import { crearComentario } from "../models/comentarioModel";
import { idValido } from "../utils/validar";

/** POST /api/comentarios */
export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Control de acceso (equivalente a VUL-13): solo usuarios autenticados.
    if (!req.session.nombre) {
      res.status(403).json({ ok: false, error: "requiere_sesion" });
      return;
    }

    const restauranteId = idValido(req.session.restauranteId) ?? 1;
    const comentario = String(req.body.comentario ?? "").trim();

    if (comentario === "" || comentario.length > 1000) {
      res.status(400).json({ ok: false, error: "comentario_invalido" });
      return;
    }

    // El autor se toma de la SESIÓN, nunca de un campo del formulario.
    await crearComentario(req.session.nombre, comentario, restauranteId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
