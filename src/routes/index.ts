import { Router } from "express";
import { verCarta, listarRestaurantes } from "../controllers/cartaController";
import { login, verificar2fa, logout, sesion } from "../controllers/authController";
import { agregar, eliminarItem, vaciar, mostrar, confirmar } from "../controllers/carritoController";
import { crear } from "../controllers/comentarioController";
import { csrfValidar } from "../middlewares/csrf";
import { loginLimiter } from "../middlewares/rateLimiter";

/**
 * API JSON pública (montada en /api): la consume el frontend React. El
 * panel de administración sigue siendo Express + EJS clásico (ver
 * routes/admin.ts), sin cambios.
 */
export const router = Router();

// El frontend pide el token CSRF una vez al cargar y lo manda en cada POST
// via header X-CSRF-Token (ver middlewares/csrf.ts).
router.get("/csrf", (req, res) => res.json({ csrfToken: req.session.csrfToken }));
router.get("/sesion", sesion);

router.get("/restaurantes", listarRestaurantes);
router.get("/restaurantes/:slug", verCarta);

router.post("/login", loginLimiter, csrfValidar, login);
router.post("/login/2fa", loginLimiter, csrfValidar, verificar2fa);
router.post("/logout", csrfValidar, logout);

router.get("/carrito", mostrar);
router.post("/carrito/agregar", csrfValidar, agregar);
router.post("/carrito/eliminar", csrfValidar, eliminarItem);
router.post("/carrito/vaciar", csrfValidar, vaciar);
router.post("/carrito/confirmar", csrfValidar, confirmar);

router.post("/comentarios", csrfValidar, crear);
