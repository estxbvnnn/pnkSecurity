import { Request, Response, NextFunction } from "express";
import { idValido } from "../utils/validar";
import { obtenerRestaurante, listarRestaurantes } from "../models/restauranteModel";
import { listarCartasAdmin, crearCarta, alternarVisibilidadCarta } from "../models/cartaModel";
import {
  listarCategoriasAdmin,
  crearCategoria,
  alternarVisibilidadCategoria,
} from "../models/categoriaModel";
import {
  listarItemsAdminPorCategoria,
  obtenerItemAdminPorId,
  crearItem,
  actualizarItem,
  eliminarItem,
} from "../models/itemModel";
import { borrarFoto } from "../middlewares/upload";
import { ItemInput } from "../types/models";
import { registrarEvento } from "../utils/logSeguridad";

/** Valida y normaliza el formulario de un ítem (nombre, precio, etc.). `foto` ya viene resuelta por el caller. */
function parsearItemInput(body: Record<string, unknown>, foto: string): ItemInput | null {
  const nombre = String(body.nombre ?? "").trim();
  const categoriaId = idValido(body.categoriaId);
  const precio = Number(body.precio);
  const puntuacion = Number(body.puntuacion ?? 0);

  if (!nombre || nombre.length > 100) return null;
  if (categoriaId === null) return null;
  if (!Number.isInteger(precio) || precio < 0 || precio > 99_999_999) return null;
  if (!Number.isInteger(puntuacion) || puntuacion < 0 || puntuacion > 5) return null;

  return {
    nombre,
    descripcion: String(body.descripcion ?? "").trim().slice(0, 300),
    tiempo: String(body.tiempo ?? "").trim().slice(0, 100),
    observaciones: String(body.observaciones ?? "").trim().slice(0, 300),
    precio,
    puntuacion,
    destacado: body.destacado === "on" || body.destacado === true,
    visible: body.visible === "on" || body.visible === true,
    categoriaId,
    foto,
  };
}

/** Panel principal: muestra toda la carta (incl. ítems ocultos) para gestionarla. */
export async function dashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // /admin/:id solo existe para CAMBIAR el restaurante activo (selector):
    // guarda el id en sesión y redirige a la URL limpia /admin, que es la
    // única que se muestra siempre, sin importar qué restaurante se
    // administre.
    const idDeRuta = idValido(req.params.id);
    if (idDeRuta !== null) {
      req.session.restauranteId = idDeRuta;
      res.redirect("/admin");
      return;
    }

    const restauranteId = idValido(req.session.restauranteId) ?? 1;
    req.session.restauranteId = restauranteId;

    const [restaurante, cartas, restaurantes] = await Promise.all([
      obtenerRestaurante(restauranteId),
      listarCartasAdmin(restauranteId),
      listarRestaurantes(),
    ]);

    const cartasConCategorias = await Promise.all(
      cartas.map(async (carta) => {
        const categorias = await listarCategoriasAdmin(carta.id);
        const categoriasConItems = await Promise.all(
          categorias.map(async (categoria) => ({
            categoria,
            items: await listarItemsAdminPorCategoria(categoria.id),
          }))
        );
        return { carta, categoriasConItems };
      })
    );

    // Estadísticas rápidas para las tarjetas del dashboard.
    const stats = { cartas: 0, categorias: 0, productos: 0, destacados: 0, ocultos: 0 };
    for (const seccion of cartasConCategorias) {
      stats.cartas++;
      for (const ci of seccion.categoriasConItems) {
        stats.categorias++;
        for (const item of ci.items) {
          stats.productos++;
          if (item.destacado) stats.destacados++;
          if (!item.visible) stats.ocultos++;
        }
      }
    }

    res.render("admin/dashboard", {
      restauranteId,
      restaurante,
      restaurantes,
      cartasConCategorias,
      stats,
      nombreUsuario: req.session.nombre,
      csrfToken: req.session.csrfToken,
      mensaje: (req.query.ok as string) ?? null,
    });
  } catch (err) {
    next(err);
  }
}

export async function crearCartaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restauranteId = idValido(req.session.restauranteId) ?? 1;
    const nombre = String(req.body.nombre ?? "").trim();
    const orden = Number(req.body.orden ?? 0) || 0;
    if (nombre && nombre.length <= 45) {
      await crearCarta(restauranteId, nombre, orden);
    }
    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
}

export async function toggleCartaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restauranteId = idValido(req.session.restauranteId) ?? 1;
    const cartaId = idValido(req.params.id);
    if (cartaId !== null) {
      await alternarVisibilidadCarta(cartaId, restauranteId);
    }
    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
}

export async function crearCategoriaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cartaId = idValido(req.body.cartaId);
    const nombre = String(req.body.nombre ?? "").trim();
    const orden = Number(req.body.orden ?? 0) || 0;
    if (cartaId !== null && nombre && nombre.length <= 100) {
      await crearCategoria(cartaId, nombre, orden);
    }
    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
}

export async function toggleCategoriaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categoriaId = idValido(req.params.id);
    const cartaId = idValido(req.body.cartaId);
    if (categoriaId !== null && cartaId !== null) {
      await alternarVisibilidadCategoria(categoriaId, cartaId);
    }
    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
}

/** Formulario para crear un ítem nuevo. */
export async function nuevoItemForm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restauranteId = idValido(req.session.restauranteId) ?? 1;
    const cartas = await listarCartasAdmin(restauranteId);
    const categoriasPorCarta = await Promise.all(
      cartas.map(async (carta) => ({ carta, categorias: await listarCategoriasAdmin(carta.id) }))
    );
    res.render("admin/item-form", {
      restauranteId,
      item: null,
      categoriasPorCarta,
      csrfToken: req.session.csrfToken,
      error: (req.query.error as string) ?? null,
    });
  } catch (err) {
    next(err);
  }
}

/** Formulario para editar un ítem existente. */
export async function editarItemForm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restauranteId = idValido(req.session.restauranteId) ?? 1;
    const itemId = idValido(req.params.id);
    if (itemId === null) {
      res.status(404).send("Ítem no encontrado.");
      return;
    }
    const item = await obtenerItemAdminPorId(itemId);
    if (!item) {
      res.status(404).send("Ítem no encontrado.");
      return;
    }
    const cartas = await listarCartasAdmin(restauranteId);
    const categoriasPorCarta = await Promise.all(
      cartas.map(async (carta) => ({ carta, categorias: await listarCategoriasAdmin(carta.id) }))
    );
    res.render("admin/item-form", {
      restauranteId,
      item,
      categoriasPorCarta,
      csrfToken: req.session.csrfToken,
      error: (req.query.error as string) ?? null,
    });
  } catch (err) {
    next(err);
  }
}

export async function crearItemHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restauranteId = idValido(req.session.restauranteId) ?? 1;

    // La foto es OBLIGATORIA al crear un producto nuevo.
    if (!req.file) {
      res.redirect(`/admin/items/nuevo?error=foto_requerida`);
      return;
    }

    const datos = parsearItemInput(req.body, req.file.filename);
    if (!datos) {
      borrarFoto(restauranteId, req.file.filename); // no dejar el archivo huérfano
      res.redirect(`/admin/items/nuevo?error=1`);
      return;
    }
    await crearItem(datos);
    res.redirect("/admin?ok=creado");
  } catch (err) {
    next(err);
  }
}

export async function actualizarItemHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restauranteId = idValido(req.session.restauranteId) ?? 1;
    const itemId = idValido(req.params.id);
    if (itemId === null) {
      res.redirect(`/admin/items/${req.params.id}/editar?error=1`);
      return;
    }

    // Si se sube una foto nueva se usa esa; si no, se mantiene la actual
    // (editar un producto no debería forzar a resubir la imagen).
    let foto = req.file?.filename;
    if (!foto) {
      const actual = await obtenerItemAdminPorId(itemId);
      foto = actual?.foto ?? undefined;
    }
    if (!foto) {
      res.redirect(`/admin/items/${itemId}/editar?error=foto_requerida`);
      return;
    }

    const datos = parsearItemInput(req.body, foto);
    if (!datos) {
      if (req.file) borrarFoto(restauranteId, req.file.filename);
      res.redirect(`/admin/items/${itemId}/editar?error=1`);
      return;
    }

    // Si se reemplazó la foto, se borra la anterior para no acumular archivos huérfanos.
    if (req.file) {
      const actual = await obtenerItemAdminPorId(itemId);
      if (actual?.foto && actual.foto !== foto) borrarFoto(restauranteId, actual.foto);
    }

    await actualizarItem(itemId, datos);
    res.redirect("/admin?ok=actualizado");
  } catch (err) {
    next(err);
  }
}

export async function eliminarItemHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemId = idValido(req.params.id);
    if (itemId !== null) {
      await eliminarItem(itemId);
      // Nota: se conserva el archivo de imagen en disco aunque el producto se
      // elimine (borrado lógico), por si se necesita restaurar el registro.
      registrarEvento(req, "admin_item_eliminado", { itemId, usuarioId: req.session.usuarioId });
    }
    res.redirect("/admin?ok=eliminado");
  } catch (err) {
    next(err);
  }
}
