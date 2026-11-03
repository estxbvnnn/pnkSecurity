import rateLimit from "express-rate-limit";
import { idValido } from "../utils/validar";

/**
 * Límite de intentos de login (equivalente a VUL-20 del informe pnkSecurity):
 * 5 intentos cada 15 minutos por IP, luego bloqueo temporal. El formulario de
 * login es un POST tradicional (no fetch), así que al bloquear se redirige de
 * vuelta a la carta con `?login=bloqueado` para que el cliente muestre el
 * aviso (en vez de una página de texto plano).
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const id = idValido(req.session.restauranteId) ?? 1;
    res.redirect(`/restaurante/${id}?login=bloqueado`);
  },
});
