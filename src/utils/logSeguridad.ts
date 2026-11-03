import { Request } from "express";

/**
 * Registro de eventos de seguridad (OWASP A09 - Security Logging and
 * Monitoring Failures). No hay una pila de monitoreo externa en este
 * proyecto, así que se deja un registro estructurado en stderr —en Docker
 * esto ya queda disponible vía `docker logs` / `docker compose logs`— con
 * suficiente detalle para detectar fuerza bruta, abuso del 2FA o accesos
 * indebidos al panel de administración. Nunca se registran contraseñas,
 * códigos 2FA ni tokens, solo METADATOS del intento.
 */
export function registrarEvento(req: Request, evento: string, detalle: Record<string, unknown> = {}): void {
  const linea = {
    ts: new Date().toISOString(),
    evento,
    ip: req.ip,
    ...detalle,
  };
  console.warn(`[seguridad] ${JSON.stringify(linea)}`);
}
