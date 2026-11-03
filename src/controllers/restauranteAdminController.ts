import { Request, Response, NextFunction } from "express";
import {
  listarRestaurantesAdmin,
  obtenerRestauranteAdmin,
  crearRestaurante,
  actualizarRestaurante,
} from "../models/restauranteModel";
import { idValido } from "../utils/validar";
import { RestauranteInput } from "../types/models";
import { registrarEvento } from "../utils/logSeguridad";

function parsearRestauranteInput(body: Record<string, unknown>, foto?: string): RestauranteInput | null {
  const nombre = String(body.nombre ?? "").trim();
  const rut = String(body.rut ?? "").trim();
  const fono = String(body.fono ?? "").trim();
  const calle = String(body.calle ?? "").trim();
  const numero = String(body.numero ?? "").trim();
  const comuna = String(body.comuna ?? "").trim();

  if (!nombre || nombre.length > 200) return null;
  if (!rut || rut.length > 11) return null;
  if (!fono || fono.length > 45) return null;
  if (!calle || !numero || !comuna) return null;

  return {
    nombre,
    rut,
    fono,
    email: String(body.email ?? "").trim().slice(0, 100),
    calle: calle.slice(0, 100),
    numero: numero.slice(0, 15),
    comuna: comuna.slice(0, 100),
    region: String(body.region ?? "").trim().slice(0, 100),
    foto,
  };
}

export async function listarHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantes = await listarRestaurantesAdmin();
    res.render("admin/restaurantes", { restaurantes });
  } catch (err) {
    next(err);
  }
}

export function nuevoForm(req: Request, res: Response): void {
  res.render("admin/restaurante-form", {
    restaurante: null,
    csrfToken: req.session.csrfToken,
    error: (req.query.error as string) ?? null,
  });
}

export async function crearHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const datos = parsearRestauranteInput(req.body);
    if (!datos) {
      res.redirect("/admin/restaurantes/nuevo?error=1");
      return;
    }
    const id = await crearRestaurante(datos);
    registrarEvento(req, "admin_restaurante_creado", { id, usuarioId: req.session.usuarioId });
    res.redirect(`/admin/restaurantes?ok=creado&id=${id}`);
  } catch (err) {
    next(err);
  }
}

export async function editarForm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = idValido(req.params.id);
    if (id === null) {
      res.status(404).send("Restaurante no encontrado.");
      return;
    }
    const restaurante = await obtenerRestauranteAdmin(id);
    if (!restaurante) {
      res.status(404).send("Restaurante no encontrado.");
      return;
    }
    res.render("admin/restaurante-form", {
      restaurante,
      csrfToken: req.session.csrfToken,
      error: (req.query.error as string) ?? null,
    });
  } catch (err) {
    next(err);
  }
}

export async function actualizarHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = idValido(req.params.id);
    if (id === null) {
      res.status(404).send("Restaurante no encontrado.");
      return;
    }
    const datos = parsearRestauranteInput(req.body, req.file?.filename);
    if (!datos) {
      res.redirect(`/admin/restaurantes/${id}/editar?error=1`);
      return;
    }
    await actualizarRestaurante(id, datos);
    registrarEvento(req, "admin_restaurante_actualizado", { id, usuarioId: req.session.usuarioId });
    res.redirect(`/admin/restaurantes?ok=actualizado`);
  } catch (err) {
    next(err);
  }
}
