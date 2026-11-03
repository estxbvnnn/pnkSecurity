import { pool } from "../config/db";
import { Carta, CartaAdmin, Categoria, Item } from "../types/models";

export async function listarCartas(restauranteId: number): Promise<Carta[]> {
  const { rows } = await pool.query<Carta>(
    `SELECT id, nombre, orden
       FROM cartas
      WHERE restaurante_id = $1 AND visible = TRUE AND eliminada IS NULL
      ORDER BY orden ASC`,
    [restauranteId]
  );
  return rows;
}

export async function listarCategorias(cartaId: number): Promise<Categoria[]> {
  const { rows } = await pool.query<Categoria>(
    `SELECT id, nombre
       FROM categorias
      WHERE carta_id = $1 AND visible = TRUE AND eliminado IS NULL
      ORDER BY orden ASC`,
    [cartaId]
  );
  return rows;
}

export async function listarItemsPorCategoria(categoriaId: number): Promise<Item[]> {
  const { rows } = await pool.query<Item>(
    `SELECT id, nombre, descripcion, tiempo, observaciones, precio, puntuacion, foto
       FROM items
      WHERE categoria_id = $1 AND visible = TRUE AND eliminado IS NULL
      ORDER BY orden ASC`,
    [categoriaId]
  );
  return rows;
}

// ---------------------------------------------------------------------
// Operaciones de administración (requieren rol admin — ver middlewares/auth.ts)
// ---------------------------------------------------------------------

/** Igual que listarCartas() pero incluye las ocultas (visible=false), para gestionarlas. */
export async function listarCartasAdmin(restauranteId: number): Promise<CartaAdmin[]> {
  const { rows } = await pool.query<CartaAdmin>(
    `SELECT id, nombre, orden, visible
       FROM cartas
      WHERE restaurante_id = $1 AND eliminada IS NULL
      ORDER BY orden ASC NULLS LAST, nombre ASC`,
    [restauranteId]
  );
  return rows;
}

export async function crearCarta(restauranteId: number, nombre: string, orden: number): Promise<void> {
  await pool.query(
    `INSERT INTO cartas (nombre, orden, visible, restaurante_id) VALUES ($1, $2, TRUE, $3)`,
    [nombre, orden, restauranteId]
  );
}

export async function alternarVisibilidadCarta(id: number, restauranteId: number): Promise<void> {
  await pool.query(
    `UPDATE cartas SET visible = NOT visible WHERE id = $1 AND restaurante_id = $2`,
    [id, restauranteId]
  );
}

export async function listarDestacados(restauranteId: number): Promise<Item[]> {
  const { rows } = await pool.query<Item>(
    `SELECT i.id, i.nombre, i.descripcion, i.tiempo, i.observaciones, i.precio, i.puntuacion, i.foto
       FROM items i
       JOIN categorias c ON c.id = i.categoria_id
       JOIN cartas ca ON ca.id = c.carta_id
      WHERE i.destacado = TRUE AND i.visible = TRUE AND i.eliminado IS NULL
        AND c.visible = TRUE AND c.eliminado IS NULL
        AND ca.restaurante_id = $1 AND ca.eliminada IS NULL`,
    [restauranteId]
  );
  return rows;
}
