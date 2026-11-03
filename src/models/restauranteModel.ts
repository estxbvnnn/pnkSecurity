import { pool } from "../config/db";
import { Restaurante, RestauranteAdmin, RestauranteInput, RestauranteResumen } from "../types/models";

/** Lista liviana de restaurantes (solo id + nombre) — usada en el selector del panel admin. */
export async function listarRestaurantes(): Promise<{ id: number; nombre: string }[]> {
  const { rows } = await pool.query<{ id: number; nombre: string }>(
    `SELECT id, nombre FROM restaurantes WHERE eliminado IS NULL ORDER BY nombre ASC`
  );
  return rows;
}

/** Listado público (landing "/"): un card por restaurante activo, con su foto. */
export async function listarRestaurantesPublico(): Promise<RestauranteResumen[]> {
  const { rows } = await pool.query<RestauranteResumen>(
    `SELECT id, nombre, foto FROM restaurantes WHERE eliminado IS NULL ORDER BY nombre ASC`
  );
  return rows;
}

export async function obtenerRestaurante(id: number): Promise<Restaurante | null> {
  const { rows } = await pool.query<Restaurante>(
    `SELECT r.id, r.nombre, r.fono, r.email, r.foto,
            d.calle, d.numero, d.comuna, d.region
       FROM restaurantes r
       JOIN direcciones d ON d.id = r.direccion_id
      WHERE r.id = $1 AND r.eliminado IS NULL`,
    [id]
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------
// Operaciones de administración (requieren rol admin — ver middlewares/auth.ts)
// ---------------------------------------------------------------------

/** Todos los restaurantes con sus datos completos (+ dirección), para la tabla de gestión. */
export async function listarRestaurantesAdmin(): Promise<RestauranteAdmin[]> {
  const { rows } = await pool.query<RestauranteAdmin>(
    `SELECT r.id, r.rut, r.nombre, r.fono, r.email, r.foto,
            r.direccion_id AS "direccionId", d.calle, d.numero, d.comuna, d.region
       FROM restaurantes r
       JOIN direcciones d ON d.id = r.direccion_id
      WHERE r.eliminado IS NULL
      ORDER BY r.nombre ASC`
  );
  return rows;
}

export async function obtenerRestauranteAdmin(id: number): Promise<RestauranteAdmin | null> {
  const { rows } = await pool.query<RestauranteAdmin>(
    `SELECT r.id, r.rut, r.nombre, r.fono, r.email, r.foto,
            r.direccion_id AS "direccionId", d.calle, d.numero, d.comuna, d.region
       FROM restaurantes r
       JOIN direcciones d ON d.id = r.direccion_id
      WHERE r.id = $1 AND r.eliminado IS NULL`,
    [id]
  );
  return rows[0] ?? null;
}

/** Crea la dirección y el restaurante en una sola transacción. Devuelve el id nuevo. */
export async function crearRestaurante(datos: RestauranteInput): Promise<number> {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rows: direccionRows } = await cliente.query<{ id: number }>(
      `INSERT INTO direcciones (calle, numero, comuna, region) VALUES ($1, $2, $3, $4) RETURNING id`,
      [datos.calle, datos.numero, datos.comuna, datos.region || null]
    );
    const direccionId = direccionRows[0].id;

    const { rows: restauranteRows } = await cliente.query<{ id: number }>(
      `INSERT INTO restaurantes (rut, nombre, fono, email, foto, direccion_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [datos.rut, datos.nombre, datos.fono, datos.email || null, datos.foto ?? null, direccionId]
    );

    await cliente.query("COMMIT");
    return restauranteRows[0].id;
  } catch (err) {
    await cliente.query("ROLLBACK");
    throw err;
  } finally {
    cliente.release();
  }
}

/** Actualiza el restaurante y su dirección ligada. Si no llega `foto`, conserva la actual. */
export async function actualizarRestaurante(id: number, datos: RestauranteInput): Promise<void> {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query(
      `UPDATE restaurantes SET rut = $1, nombre = $2, fono = $3, email = $4,
              foto = COALESCE($5, foto), actualizado = CURRENT_TIMESTAMP
        WHERE id = $6 AND eliminado IS NULL`,
      [datos.rut, datos.nombre, datos.fono, datos.email || null, datos.foto ?? null, id]
    );
    await cliente.query(
      `UPDATE direcciones SET calle = $1, numero = $2, comuna = $3, region = $4,
              actualizado = CURRENT_TIMESTAMP
        WHERE id = (SELECT direccion_id FROM restaurantes WHERE id = $5)`,
      [datos.calle, datos.numero, datos.comuna, datos.region || null, id]
    );
    await cliente.query("COMMIT");
  } catch (err) {
    await cliente.query("ROLLBACK");
    throw err;
  } finally {
    cliente.release();
  }
}
