import { pool } from "../config/db";
import { Usuario } from "../types/models";
import { cifrar, descifrar } from "../utils/cripto2fa";

const COLUMNAS = `id, nombre, email, password, estado, rol,
                   secreto_2fa AS "secreto2fa", dosfa_habilitado AS "dosfaHabilitado"`;

/** El secreto TOTP se guarda cifrado (ver utils/cripto2fa.ts) — se descifra solo en memoria, nunca en la BD. */
function descifrarUsuario(usuario: Usuario): Usuario {
  if (usuario.secreto2fa) {
    usuario.secreto2fa = descifrar(usuario.secreto2fa);
  }
  return usuario;
}

export async function buscarPorEmail(email: string): Promise<Usuario | null> {
  const { rows } = await pool.query<Usuario>(
    `SELECT ${COLUMNAS} FROM usuarios WHERE email = $1 LIMIT 1`,
    [email]
  );
  return rows[0] ? descifrarUsuario(rows[0]) : null;
}

export async function buscarPorId(id: number): Promise<Usuario | null> {
  const { rows } = await pool.query<Usuario>(
    `SELECT ${COLUMNAS} FROM usuarios WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ? descifrarUsuario(rows[0]) : null;
}

export async function crearUsuario(
  nombre: string,
  email: string,
  passwordHash: string,
  rol: "admin" | "cliente" = "cliente"
): Promise<void> {
  await pool.query(
    `INSERT INTO usuarios (nombre, email, password, estado, rol) VALUES ($1, $2, $3, '1', $4)
     ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, rol = EXCLUDED.rol`,
    [nombre, email, passwordHash, rol]
  );
}

/** Guarda el secreto TOTP generado (cifrado), pero SIN activar el 2FA todavía (se activa al confirmar el primer código). */
export async function guardarSecreto2faPendiente(usuarioId: number, secreto: string): Promise<void> {
  await pool.query(
    `UPDATE usuarios SET secreto_2fa = $1, dosfa_habilitado = FALSE WHERE id = $2`,
    [cifrar(secreto), usuarioId]
  );
}

export async function activar2fa(usuarioId: number): Promise<void> {
  await pool.query(`UPDATE usuarios SET dosfa_habilitado = TRUE WHERE id = $1`, [usuarioId]);
}

export async function desactivar2fa(usuarioId: number): Promise<void> {
  await pool.query(
    `UPDATE usuarios SET dosfa_habilitado = FALSE, secreto_2fa = NULL WHERE id = $1`,
    [usuarioId]
  );
}
