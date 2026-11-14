import rateLimit from "express-rate-limit";

/**
 * Límite de intentos de login (equivalente a VUL-20 del informe pnkSecurity):
 * 5 intentos cada 15 minutos por IP, luego bloqueo temporal.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ ok: false, error: "demasiados_intentos" });
  },
});
