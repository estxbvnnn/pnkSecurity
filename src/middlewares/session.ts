import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../config/db";
import { env } from "../config/env";

const PgSession = connectPgSimple(session);

/**
 * Sesión respaldada por PostgreSQL (tabla "session", se crea sola la primera
 * vez con createTableIfMissing). Equivalente a VUL-16/18 del informe
 * pnkSecurity: cookie HttpOnly + SameSite=Strict (+ Secure si hay HTTPS),
 * nombre de cookie propio, inicializada una sola vez y de forma centralizada.
 */
export const sessionMiddleware = session({
  store: new PgSession({ pool, tableName: "session", createTableIfMissing: true }),
  name: "cartaSid",
  secret: env.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: env.session.secureCookie,
    maxAge: 1000 * 60 * 60 * 4, // 4 horas
  },
});
