import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { buscarPorEmail, buscarPorId } from "../models/usuarioModel";
import { idValido } from "../utils/validar";
import { registrarEvento } from "../utils/logSeguridad";

function completarSesion(
  req: Request,
  res: Response,
  next: NextFunction,
  usuario: { id: number; nombre: string; rol: "admin" | "cliente" },
  restauranteId: number
): void {
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.usuarioId = usuario.id;
    req.session.nombre = usuario.nombre;
    req.session.rol = usuario.rol;
    req.session.restauranteId = restauranteId;
    // regenerate() borra el csrfToken anterior junto con el resto de la
    // sesión vieja: se genera uno nuevo y se devuelve en la respuesta para
    // que el frontend (SPA, sin recarga de página) actualice el que tiene
    // en memoria. Sin esto, la primera acción después de loguearse (ej.
    // confirmar el carrito) sería rechazada por CSRF inválido.
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    res.json({ ok: true, nombre: usuario.nombre, rol: usuario.rol, csrfToken: req.session.csrfToken });
  });
}

/** POST /api/login */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // El restaurante que se estaba viendo se captura ANTES de regenerar la
    // sesión (session.regenerate() borra todos los datos de la sesión vieja,
    // incluido restauranteId).
    const restauranteId = idValido(req.session.restauranteId) ?? 1;

    const email = String(req.body.email ?? "").trim();
    const password = String(req.body.password ?? "");

    // Consulta parametrizada ($1) — sin concatenación de SQL (equivalente a VUL-01).
    const usuario = await buscarPorEmail(email);

    // Comparación con password_verify/bcrypt (equivalente a VUL-02): nunca se
    // guarda ni compara la contraseña en texto plano.
    const valido = usuario ? await bcrypt.compare(password, usuario.password) : false;

    if (!usuario || !valido || usuario.estado !== "1") {
      registrarEvento(req, "login_fallido", { email });
      res.status(401).json({ ok: false, error: "credenciales_invalidas" });
      return;
    }

    // Segundo factor (TOTP): el panel de administración lo exige si el admin
    // lo activó. La sesión NO se confirma hasta validar el código — solo se
    // recuerda qué usuario quedó "a medio camino" del login.
    if (usuario.rol === "admin" && usuario.dosfaHabilitado && usuario.secreto2fa) {
      req.session.pendiente2fa = { usuarioId: usuario.id, restauranteId };
      registrarEvento(req, "login_password_ok_esperando_2fa", { usuarioId: usuario.id });
      res.json({ ok: true, requiere2fa: true });
      return;
    }

    registrarEvento(req, "login_exitoso", { usuarioId: usuario.id, rol: usuario.rol });
    completarSesion(req, res, next, usuario, restauranteId);
  } catch (err) {
    next(err);
  }
}

/** POST /api/login/2fa */
export async function verificar2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pendiente = req.session.pendiente2fa;
    if (!pendiente) {
      res.status(400).json({ ok: false, error: "sin_login_pendiente" });
      return;
    }

    const codigo = String(req.body.codigo ?? "").trim();
    const usuario = await buscarPorId(pendiente.usuarioId);

    const valido =
      usuario?.secreto2fa && usuario.dosfaHabilitado
        ? authenticator.check(codigo, usuario.secreto2fa)
        : false;

    if (!usuario || !valido) {
      registrarEvento(req, "2fa_codigo_invalido", { usuarioId: pendiente.usuarioId });
      res.status(401).json({ ok: false, error: "codigo_invalido" });
      return;
    }

    registrarEvento(req, "login_exitoso_2fa", { usuarioId: usuario.id });
    delete req.session.pendiente2fa;
    completarSesion(req, res, next, usuario, pendiente.restauranteId);
  } catch (err) {
    next(err);
  }
}

/** GET /api/sesion — con qué usuario (si hay alguno) arranca la SPA. */
export function sesion(req: Request, res: Response): void {
  res.json({
    nombreUsuario: req.session.nombre ?? null,
    esAdmin: req.session.rol === "admin",
  });
}

/** POST /api/logout */
export function logout(req: Request, res: Response, next: NextFunction): void {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("cartaSid");
    res.json({ ok: true });
  });
}
