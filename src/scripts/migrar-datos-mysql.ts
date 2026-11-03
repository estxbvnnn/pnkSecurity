/**
 * Migración de datos reales desde el MySQL de producción (pnkSecurity,
 * 52.0.165.26) hacia el PostgreSQL de este proyecto. Reemplaza los datos de
 * ejemplo por los 7 restaurantes/11 cartas/14 categorías/5 ítems reales,
 * preservando los IDs originales para no romper las relaciones.
 *
 * Uso: npx ts-node src/scripts/migrar-datos-mysql.ts
 */
import { pool } from "../config/db";

const direcciones = [
  [1, "Los Arandanos", "1550", "La Serena", "Coquimbo"],
  [2, "Avenida Argentina", "951", "La Serena", "Coquimbo"],
  [3, "Balmaceda", "357", "La Serena", "Coquimbo"],
  [4, "Peru", "2255", "La Serena", "Coquimbo"],
  [5, "Miraflores", "36", "Ovalle", "Coquimbo"],
  [6, "Arrayanes", "66", "La Higuera", "Coquimbo"],
  [7, "Casa", "25", "La Higuera", "Coquimbo"],
  [8, "Guatemala", "55", "La Serena", "Coquimbo"],
] as const;

const restaurantes = [
  [1, "99887766-5", "Afríca Restobar", "22334455", "resto1.jpg", "mail@correo.cl", 2],
  [2, "88776655-4", "Restaurant la Bahía", "512323232", "resto2.png", "mail1@correo.cl", 3],
  [3, "22334455-6", "La Esquina del Sabor", "22334455", "logo_empresa_comodin.png", "mail2@correo.cl", 4],
  [4, "258-3", "La Pica de Armando", "223366", "logo_empresa_comodin.png", "mail3@correo.cl", 5],
  [5, "258-9", "Donde Carlos", "336699", "logo_empresa_comodin.png", "mail4@correo.cl", 6],
  [6, "258-6", "RestoPenka", "336699", "logo_empresa_comodin.png", "mail5@correo.cl", 7],
  [7, "369-5", "La Pica de Carolina", "336699", "logo_empresa_comodin.png", "mail6@correo.cl", 8],
] as const;

const cartas = [
  [1, "Vinos", 1, true, "carta2.jpg", 1],
  [2, "Bebidas", 2, true, "carta2.jpg", 1],
  [3, "Entradas", 3, true, "carta3.jpg", 1],
  [4, "Principales", 4, true, "carta6.jpg", 1],
  [5, "Postres", 5, true, "carta6.jpg", 1],
  [6, "Helados", 9, true, "carta6.jpg", 1],
  [7, "Pizzas", 6, true, "carta7.jpg", 1],
  [8, "Dulces", 7, true, "carta6.jpg", 1],
  [10, "Vinos", 1, true, "carta10.jpg", 2],
  [11, "Principal", 2, true, "carta11.jpg", 2],
  [12, "Comiditas", 2, true, "carta12.jpg", 2],
] as const;

const categorias = [
  [1, "Blancos", true, 1, 1],
  [2, "Tintos", true, 2, 1],
  [3, "Carnes", true, 1, 4],
  [4, "Pescados", true, 2, 4],
  [5, "Mariscos", true, 3, 4],
  [6, "Pastas", true, 4, 4],
  [7, "Frías", true, 1, 3],
  [8, "Calientes", true, 2, 3],
  [9, "Comida casera", false, 0, 4],
  [10, "Con Alcohol", true, 0, 2],
  [11, "Sin Alcohol", true, 2, 2],
  [12, "Blancos", true, 2, 10],
  [13, "Tintos", true, 1, 10],
  [14, "Carnes", true, 1, 11],
] as const;

const items = [
  [1, "Ensalada Cesar", "Ensalada con queso", "15 minutos", "", 3500, true, false, 4, "item1.jpg", 1, 7],
  [2, "Crema de espinacas", "Crema a base de espinacas y finas hierbas", "20 minutos", "", 2000, true, true, 4, "item2.jpg", 2, 8],
  [4, "Pisco Sour", "Pisco sour casero", "15 minutos", "", 3500, true, false, 0, "item4.jpg", 0, 10],
  [5, "Lomo a lo Pobre", "Lomo con papas fritas, huevo y cebolla", "30 minutos", "Muy sabroso", 12500, true, true, 5, "item5.jpg", 1, 3],
  [7, "Lomo a lo Pobre", "Lomo a lo Pobre", "20 minutos", "Rico Lomo a lo Pobre", 9900, true, true, 3, "item3.jpg", 2, 3],
] as const;

async function main(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Limpia los datos de ejemplo (y cualquier dato de prueba creado desde el
    // panel admin) respetando el orden de las FKs.
    await client.query("TRUNCATE comentarios, items, categorias, cartas, restaurantes, direcciones RESTART IDENTITY CASCADE");

    for (const [id, calle, numero, comuna, region] of direcciones) {
      await client.query(
        "INSERT INTO direcciones (id, calle, numero, comuna, region) VALUES ($1,$2,$3,$4,$5)",
        [id, calle, numero, comuna, region]
      );
    }

    for (const [id, rut, nombre, fono, foto, email, direccionId] of restaurantes) {
      await client.query(
        "INSERT INTO restaurantes (id, rut, nombre, fono, foto, email, direccion_id) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [id, rut, nombre, fono, foto, email, direccionId]
      );
    }

    for (const [id, nombre, orden, visible, foto, restauranteId] of cartas) {
      await client.query(
        "INSERT INTO cartas (id, nombre, orden, visible, foto, restaurante_id) VALUES ($1,$2,$3,$4,$5,$6)",
        [id, nombre, orden, visible, foto, restauranteId]
      );
    }

    for (const [id, nombre, visible, orden, cartaId] of categorias) {
      await client.query(
        "INSERT INTO categorias (id, nombre, visible, orden, carta_id) VALUES ($1,$2,$3,$4,$5)",
        [id, nombre, visible, orden, cartaId]
      );
    }

    for (const [id, nombre, descripcion, tiempo, observaciones, precio, visible, destacado, puntuacion, foto, orden, categoriaId] of items) {
      await client.query(
        `INSERT INTO items (id, nombre, descripcion, tiempo, observaciones, precio, visible, destacado, puntuacion, foto, orden, categoria_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [id, nombre, descripcion, tiempo, observaciones, precio, visible, destacado, puntuacion, foto, orden, categoriaId]
      );
    }

    // Reajusta las secuencias SERIAL para que los próximos INSERT (desde el
    // panel admin) no choquen con los IDs que acabamos de insertar a mano.
    for (const tabla of ["direcciones", "restaurantes", "cartas", "categorias", "items"]) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${tabla}', 'id'), COALESCE((SELECT MAX(id) FROM ${tabla}), 1))`
      );
    }

    await client.query("COMMIT");
    console.log(
      `Migración completa: ${direcciones.length} direcciones, ${restaurantes.length} restaurantes, ` +
        `${cartas.length} cartas, ${categorias.length} categorías, ${items.length} ítems.`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Error en la migración:", err);
  process.exit(1);
});
