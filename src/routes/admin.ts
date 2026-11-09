import { Router, Request, Response, NextFunction } from "express";
import { requireAdmin } from "../middlewares/auth";
import { csrfValidar } from "../middlewares/csrf";
import { uploadFoto, uploadFotoRestaurante } from "../middlewares/upload";
import { idValido } from "../utils/validar";
import {
  dashboard,
  crearCartaHandler,
  toggleCartaHandler,
  crearCategoriaHandler,
  toggleCategoriaHandler,
  nuevoItemForm,
  editarItemForm,
  crearItemHandler,
  actualizarItemHandler,
  eliminarItemHandler,
} from "../controllers/adminController";
import {
  listarHandler as listarRestaurantesHandler,
  nuevoForm as nuevoRestauranteForm,
  crearHandler as crearRestauranteHandler,
  editarForm as editarRestauranteForm,
  actualizarHandler as actualizarRestauranteHandler,
} from "../controllers/restauranteAdminController";
import { ventas, actualizarEstado as actualizarEstadoPedidoHandler } from "../controllers/ventasController";
import {
  mostrar as mostrarSeguridad,
  generar as generar2fa,
  activar as activar2fa,
  desactivar as desactivar2fa,
} from "../controllers/seguridadController";
import { mostrarOwasp } from "../controllers/owaspController";

export const adminRouter = Router();

// Todas las rutas de administración exigen sesión con rol 'admin'
// (verificado server-side en cada petición, ver middlewares/auth.ts).
adminRouter.use(requireAdmin);

/**
 * Envuelve multer para que un error de subida (tipo no permitido, > 5 MB)
 * redirija de vuelta al formulario con un mensaje claro, en vez de caer en
 * la página de error genérica.
 */
function conManejoDeSubida(req: Request, res: Response, next: NextFunction): void {
  uploadFoto(req, res, (err: unknown) => {
    if (err) {
      const idItem = idValido(req.params.id);
      const destino = idItem ? `/admin/items/${idItem}/editar` : "/admin/items/nuevo";
      res.redirect(`${destino}?error=foto`);
      return;
    }
    next();
  });
}

function conManejoDeSubidaRestaurante(req: Request, res: Response, next: NextFunction): void {
  uploadFotoRestaurante(req, res, (err: unknown) => {
    if (err) {
      res.redirect(`/admin/restaurantes/${req.params.id}/editar?error=foto`);
      return;
    }
    next();
  });
}

adminRouter.get("/", dashboard);
// Id del restaurante como segmento de ruta (/admin/5) en vez de query string
// (/admin?id=5). El "(\\d+)" evita que choque con rutas literales como
// /admin/restaurantes, /admin/ventas, /admin/seguridad, /admin/owasp.
adminRouter.get("/:id(\\d+)", dashboard);

adminRouter.post("/cartas", csrfValidar, crearCartaHandler);
adminRouter.post("/cartas/:id/toggle", csrfValidar, toggleCartaHandler);

adminRouter.post("/categorias", csrfValidar, crearCategoriaHandler);
adminRouter.post("/categorias/:id/toggle", csrfValidar, toggleCategoriaHandler);

adminRouter.get("/items/nuevo", nuevoItemForm);
// multer debe ejecutarse ANTES que csrfValidar: con multipart/form-data,
// req.body (donde viaja el csrfToken) solo existe una vez que multer lo parsea.
adminRouter.post("/items", conManejoDeSubida, csrfValidar, crearItemHandler);
adminRouter.get("/items/:id/editar", editarItemForm);
adminRouter.post("/items/:id", conManejoDeSubida, csrfValidar, actualizarItemHandler);
adminRouter.post("/items/:id/eliminar", csrfValidar, eliminarItemHandler);

// --- Gestión de restaurantes (multi-tenant) ---
adminRouter.get("/restaurantes", listarRestaurantesHandler);
adminRouter.get("/restaurantes/nuevo", nuevoRestauranteForm);
adminRouter.post("/restaurantes", csrfValidar, crearRestauranteHandler);
adminRouter.get("/restaurantes/:id/editar", editarRestauranteForm);
adminRouter.post("/restaurantes/:id", conManejoDeSubidaRestaurante, csrfValidar, actualizarRestauranteHandler);

// --- Ventas ---
adminRouter.get("/ventas", ventas);
adminRouter.post("/pedidos/:id/estado", csrfValidar, actualizarEstadoPedidoHandler);

// --- Seguridad: 2FA (TOTP) del usuario admin logueado ---
adminRouter.get("/seguridad", mostrarSeguridad);
adminRouter.post("/seguridad/2fa/generar", csrfValidar, generar2fa);
adminRouter.post("/seguridad/2fa/activar", csrfValidar, activar2fa);
adminRouter.post("/seguridad/2fa/desactivar", csrfValidar, desactivar2fa);

// --- Informe de seguridad: mapeo OWASP Top 10 ---
adminRouter.get("/owasp", mostrarOwasp);
