import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

/**
 * Protección CSRF (equivalente a VUL-14 del informe pnkSecurity): token
 * aleatorio por sesión, incrustado en los formularios/fetch del cliente y
 * validado en cada POST con comparación segura (sin diferencias de tiempo).
 */
export function csrfToken(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  next();
}

export function csrfValidar(req: Request, res: Response, next: NextFunction): void {
  const enviado = (req.body?.csrfToken as string) || (req.get("X-CSRF-Token") ?? "");
  const esperado = req.session.csrfToken;

  if (
    !esperado ||
    typeof enviado !== "string" ||
    enviado.length !== esperado.length ||
    !crypto.timingSafeEqual(Buffer.from(enviado), Buffer.from(esperado))
  ) {
    res.status(403).send("Token CSRF inválido o ausente.");
    return;
  }
  next();
}
