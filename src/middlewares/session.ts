import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../config/db";
import { env } from "../config/env";

const PgSession = connectPgSimple(session);

/**
 * Sesión respaldada por PostgreSQL (tabla "session", se crea sola la primera
 * vez con createTableIfMissing), en vez del MemoryStore por defecto de
 * express-session. Centraliza y hace consistente el manejo de sesión en un
 * único lugar — equivalente a la corrección de session_start() disperso e
 * inconsistente, centralizado en setup.php.
 */
export const sessionMiddleware = session({
  store: new PgSession({ pool, tableName: "session", createTableIfMissing: true }),
  name: "cartaSid",
  secret: env.session.secret,
  resave: false,
  saveUninitialized: false,
});
