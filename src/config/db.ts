import { Pool } from "pg";
import { env } from "./env";

/**
 * Pool de conexiones a PostgreSQL. `pg` parametriza las consultas de forma
 * nativa ($1, $2, …) — equivalente a los prepared statements que se usaron
 * para corregir las inyecciones SQL del proyecto pnkSecurity (PHP): nunca se
 * concatenan datos del usuario directamente en el texto del SQL.
 */
export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  max: 5, // servidor con poca RAM: no abrir demasiadas conexiones a la vez
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  // Nunca se filtra el detalle al cliente; solo se registra en el servidor.
  console.error("Error inesperado en el pool de PostgreSQL:", err.message);
});

export async function pingDb(): Promise<void> {
  await pool.query("SELECT 1");
}
