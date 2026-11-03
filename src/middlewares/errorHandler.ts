import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

/**
 * Manejo de errores sin divulgación de información (equivalente a VUL-17 del
 * informe pnkSecurity): al cliente solo se le devuelve un mensaje genérico;
 * el detalle (stack, consulta SQL, etc.) se registra únicamente en el
 * servidor, nunca en la respuesta HTTP.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error("Error no controlado:", err);
  if (res.headersSent) return;
  res.status(500).send(env.isProd ? "Error interno del servidor." : `Error interno: ${err.message}`);
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).send("Página no encontrada.");
}
