import { Router } from "express";
import { verCarta, listarRestaurantes } from "../controllers/cartaController";
import { login, mostrarFormulario2fa, verificar2fa, logout } from "../controllers/authController";
import { agregar, eliminarItem, vaciar, mostrar, confirmar } from "../controllers/carritoController";
import { crear } from "../controllers/comentarioController";
import { csrfValidar } from "../middlewares/csrf";
import { loginLimiter } from "../middlewares/rateLimiter";

export const router = Router();

router.get("/", listarRestaurantes);
router.get("/restaurante/:id", verCarta);

router.post("/login", loginLimiter, csrfValidar, login);
router.get("/login/2fa", mostrarFormulario2fa);
router.post("/login/2fa", loginLimiter, csrfValidar, verificar2fa);
router.get("/logout", logout);

router.get("/carrito", mostrar);
router.post("/carrito/agregar", csrfValidar, agregar);
router.post("/carrito/eliminar", csrfValidar, eliminarItem);
router.post("/carrito/vaciar", csrfValidar, vaciar);
router.post("/carrito/confirmar", csrfValidar, confirmar);

router.post("/comentarios", csrfValidar, crear);
