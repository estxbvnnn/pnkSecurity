import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { buscarPorEmail } from "../models/usuarioModel";
import { idValido } from "../utils/validar";

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // El restaurante que se estaba viendo se captura ANTES de regenerar la
    // sesión (session.regenerate() borra todos los datos de la sesión vieja,
    // incluido restauranteId).
    const restauranteId = idValido(req.session.restauranteId) ?? 1;

    const email = String(req.body.email ?? "").trim();
    const password = String(req.body.password ?? "");

    // Consulta parametrizada ($1) — sin concatenación de SQL (equivalente a VUL-01).
    const usuario = await buscarPorEmail(email);

    // Comparación con password_verify/bcrypt (equivalente a VUL-02): nunca se
    // guarda ni compara la contraseña en texto plano.
    const valido = usuario ? await bcrypt.compare(password, usuario.password) : false;

    if (!usuario || !valido || usuario.estado !== "1") {
      res.redirect(`/restaurante/${restauranteId}?login=error`);
      return;
    }

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.usuarioId = usuario.id;
      req.session.nombre = usuario.nombre;
      req.session.rol = usuario.rol;
      req.session.restauranteId = restauranteId;
      res.redirect(`/restaurante/${restauranteId}`);
    });
  } catch (err) {
    next(err);
  }
}

export function logout(req: Request, res: Response, next: NextFunction): void {
  const restauranteId = idValido(req.session.restauranteId) ?? 1;
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("cartaSid");
    res.redirect(`/restaurante/${restauranteId}`);
  });
}
