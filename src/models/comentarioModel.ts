import { pool } from "../config/db";
import { Comentario } from "../types/models";

export async function listarComentarios(restauranteId: number): Promise<Comentario[]> {
  const { rows } = await pool.query<Comentario>(
    `SELECT id, usuario, comentario, creado
       FROM comentarios
      WHERE restaurante_id = $1
      ORDER BY creado DESC`,
    [restauranteId]
  );
  return rows;
}

export async function crearComentario(
  usuario: string,
  comentario: string,
  restauranteId: number
): Promise<void> {
  await pool.query(
    `INSERT INTO comentarios (usuario, comentario, restaurante_id) VALUES ($1, $2, $3)`,
    [usuario, comentario, restauranteId]
  );
}
