import { Request, Response, NextFunction } from "express";

/**
 * Control de acceso del panel de administración: solo usuarios con
 * rol = 'admin' (verificado server-side en cada petición, nunca confiando
 * en lo que muestre el front-end) pueden gestionar la carta.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.nombre) {
    res.status(403).send("Debe iniciar sesión.");
    return;
  }
  if (req.session.rol !== "admin") {
    res.status(403).send("No tiene permisos de administrador.");
    return;
  }
  next();
}
