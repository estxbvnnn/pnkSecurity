import { pool } from "../config/db";
import { CategoriaAdmin } from "../types/models";

/** Categorías de una carta, incluidas las ocultas (visible=false) — vista admin. */
export async function listarCategoriasAdmin(cartaId: number): Promise<CategoriaAdmin[]> {
  const { rows } = await pool.query<CategoriaAdmin>(
    `SELECT id, nombre, visible, carta_id AS "cartaId"
       FROM categorias
      WHERE carta_id = $1 AND eliminado IS NULL
      ORDER BY orden ASC NULLS LAST, nombre ASC`,
    [cartaId]
  );
  return rows;
}

export async function crearCategoria(cartaId: number, nombre: string, orden: number): Promise<void> {
  await pool.query(
    `INSERT INTO categorias (nombre, orden, visible, carta_id) VALUES ($1, $2, TRUE, $3)`,
    [nombre, orden, cartaId]
  );
}

export async function alternarVisibilidadCategoria(id: number, cartaId: number): Promise<void> {
  await pool.query(
    `UPDATE categorias SET visible = NOT visible WHERE id = $1 AND carta_id = $2`,
    [id, cartaId]
  );
}
