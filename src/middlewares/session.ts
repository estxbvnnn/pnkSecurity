import session from "express-session";
import { env } from "../config/env";

/**
 * Sesión de servidor para mantener el login (equivalente a lo que
 * session_start() hacía en pnkSecurity, pero centralizado en un único
 * middleware de Express en vez de llamadas dispersas por archivo).
 */
export const sessionMiddleware = session({
  secret: env.session.secret,
  resave: false,
  saveUninitialized: false,
});
