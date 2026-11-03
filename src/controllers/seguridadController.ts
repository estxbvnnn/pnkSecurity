import { Request, Response, NextFunction } from "express";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import {
  buscarPorId,
  guardarSecreto2faPendiente,
  activar2fa,
  desactivar2fa,
} from "../models/usuarioModel";
import { registrarEvento } from "../utils/logSeguridad";

/**
 * Panel de seguridad del propio usuario admin logueado (2FA/TOTP).
 * El id del usuario se toma de la SESIÓN, nunca de la URL — nadie puede
 * activar/desactivar el 2FA de otra cuenta.
 */
export async function mostrar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const usuario = req.session.usuarioId ? await buscarPorId(req.session.usuarioId) : null;
    if (!usuario) {
      res.redirect("/");
      return;
    }

    let qr: string | null = null;
    if (usuario.secreto2fa && !usuario.dosfaHabilitado) {
      const otpauthUrl = authenticator.keyuri(usuario.email, "Carta Digital", usuario.secreto2fa);
      qr = await QRCode.toDataURL(otpauthUrl);
    }

    res.render("admin/seguridad", {
      csrfToken: req.session.csrfToken,
      habilitado: usuario.dosfaHabilitado,
      pendienteConfirmar: Boolean(usuario.secreto2fa && !usuario.dosfaHabilitado),
      qr,
      error: (req.query.error as string) ?? null,
      ok: (req.query.ok as string) ?? null,
    });
  } catch (err) {
    next(err);
  }
}

export async function generar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.session.usuarioId) {
      res.redirect("/");
      return;
    }
    const secreto = authenticator.generateSecret();
    await guardarSecreto2faPendiente(req.session.usuarioId, secreto);
    res.redirect("/admin/seguridad");
  } catch (err) {
    next(err);
  }
}

export async function activar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const usuario = req.session.usuarioId ? await buscarPorId(req.session.usuarioId) : null;
    if (!usuario || !usuario.secreto2fa) {
      res.redirect("/admin/seguridad");
      return;
    }

    const codigo = String(req.body.codigo ?? "").trim();
    if (!authenticator.check(codigo, usuario.secreto2fa)) {
      res.redirect("/admin/seguridad?error=1");
      return;
    }

    await activar2fa(usuario.id);
    registrarEvento(req, "2fa_activado", { usuarioId: usuario.id });
    res.redirect("/admin/seguridad?ok=activado");
  } catch (err) {
    next(err);
  }
}

export async function desactivar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.session.usuarioId) {
      res.redirect("/admin/seguridad");
      return;
    }
    await desactivar2fa(req.session.usuarioId);
    registrarEvento(req, "2fa_desactivado", { usuarioId: req.session.usuarioId });
    res.redirect("/admin/seguridad?ok=desactivado");
  } catch (err) {
    next(err);
  }
}
