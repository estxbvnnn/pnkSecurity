import { pool } from "../config/db";
import { ItemAdmin, ItemInput } from "../types/models";

/** Ítems de una categoría, incluidos los ocultos — vista admin. */
export async function listarItemsAdminPorCategoria(categoriaId: number): Promise<ItemAdmin[]> {
  const { rows } = await pool.query<ItemAdmin>(
    `SELECT id, nombre, descripcion, tiempo, observaciones, precio, puntuacion, foto,
            visible, destacado, categoria_id AS "categoriaId"
       FROM items
      WHERE categoria_id = $1 AND eliminado IS NULL
      ORDER BY orden ASC NULLS LAST, nombre ASC`,
    [categoriaId]
  );
  return rows;
}

export async function obtenerItemAdminPorId(id: number): Promise<ItemAdmin | null> {
  const { rows } = await pool.query<ItemAdmin>(
    `SELECT id, nombre, descripcion, tiempo, observaciones, precio, puntuacion, foto,
            visible, destacado, categoria_id AS "categoriaId"
       FROM items
      WHERE id = $1 AND eliminado IS NULL
      LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function crearItem(datos: ItemInput): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO items (nombre, descripcion, tiempo, observaciones, precio, puntuacion,
                         destacado, visible, categoria_id, foto)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      datos.nombre,
      datos.descripcion,
      datos.tiempo,
      datos.observaciones,
      datos.precio,
      datos.puntuacion,
      datos.destacado,
      datos.visible,
      datos.categoriaId,
      datos.foto,
    ]
  );
  return rows[0].id;
}

export async function actualizarItem(id: number, datos: ItemInput): Promise<void> {
  await pool.query(
    `UPDATE items SET
        nombre = $1, descripcion = $2, tiempo = $3, observaciones = $4,
        precio = $5, puntuacion = $6, destacado = $7, visible = $8,
        categoria_id = $9, foto = $10, actualizado = CURRENT_TIMESTAMP
      WHERE id = $11 AND eliminado IS NULL`,
    [
      datos.nombre,
      datos.descripcion,
      datos.tiempo,
      datos.observaciones,
      datos.precio,
      datos.puntuacion,
      datos.destacado,
      datos.visible,
      datos.categoriaId,
      datos.foto,
      id,
    ]
  );
}

/** Borrado lógico (soft delete): se marca `eliminado`, no se borra la fila. */
export async function eliminarItem(id: number): Promise<void> {
  await pool.query(`UPDATE items SET eliminado = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
}
