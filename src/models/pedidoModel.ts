import { pool } from "../config/db";
import { EstadisticasVentas, EstadoPedido, ItemCarrito, Pedido } from "../types/models";

/**
 * Confirma el carrito de la sesión como una venta real: crea el pedido y su
 * detalle en una transacción. nombre/precio quedan "congelados" en
 * detalle_pedido para que el historial de ventas no cambie si el producto
 * se edita o elimina después.
 */
export async function crearPedido(
  restauranteId: number,
  clienteNombre: string,
  carrito: ItemCarrito[]
): Promise<{ id: number; total: number }> {
  const total = carrito.reduce((suma, item) => suma + item.precio, 0);

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rows } = await cliente.query<{ id: number }>(
      `INSERT INTO pedidos (restaurante_id, cliente_nombre, total) VALUES ($1, $2, $3) RETURNING id`,
      [restauranteId, clienteNombre, total]
    );
    const pedidoId = rows[0].id;

    for (const item of carrito) {
      await cliente.query(
        `INSERT INTO detalle_pedido (pedido_id, item_id, nombre, precio, cantidad)
         VALUES ($1, $2, $3, $4, 1)`,
        [pedidoId, item.id, item.nombre, item.precio]
      );
    }

    await cliente.query("COMMIT");
    return { id: pedidoId, total };
  } catch (err) {
    await cliente.query("ROLLBACK");
    throw err;
  } finally {
    cliente.release();
  }
}

/**
 * Cambia el estado de un pedido. Se filtra también por restauranteId (no solo
 * por id del pedido) para que un admin de un restaurante no pueda editar el
 * pedido de otro restaurante con solo adivinar/probar el id (equivalente al
 * mismo control IDOR que ya se aplica en el resto del panel de admin).
 */
export async function actualizarEstadoPedido(
  id: number,
  restauranteId: number,
  estado: EstadoPedido
): Promise<void> {
  await pool.query(`UPDATE pedidos SET estado = $1 WHERE id = $2 AND restaurante_id = $3`, [
    estado,
    id,
    restauranteId,
  ]);
}

/**
 * Pedidos recientes. restauranteId === null => panel "General" (todos los
 * restaurantes juntos); en ese caso cada fila trae además el nombre del
 * restaurante, porque se mezclan pedidos de varios.
 */
export async function listarPedidosRecientes(restauranteId: number | null, limite = 20): Promise<Pedido[]> {
  if (restauranteId === null) {
    const { rows } = await pool.query<Pedido>(
      `SELECT p.id, p.cliente_nombre AS "clienteNombre", p.total, p.estado, p.creado,
              r.nombre AS "restauranteNombre"
         FROM pedidos p
         JOIN restaurantes r ON r.id = p.restaurante_id
        ORDER BY p.creado DESC
        LIMIT $1`,
      [limite]
    );
    return rows;
  }

  const { rows } = await pool.query<Pedido>(
    `SELECT id, cliente_nombre AS "clienteNombre", total, estado, creado
       FROM pedidos
      WHERE restaurante_id = $1
      ORDER BY creado DESC
      LIMIT $2`,
    [restauranteId, limite]
  );
  return rows;
}

/** Igual que arriba: restauranteId === null => estadísticas de TODOS los restaurantes juntos. */
export async function estadisticasVentas(restauranteId: number | null): Promise<EstadisticasVentas> {
  const filtroRestaurante = restauranteId !== null ? "AND p.restaurante_id = $2" : "";
  const filtroRestaurantePlano = restauranteId !== null ? "AND restaurante_id = $2" : "";
  const params = restauranteId !== null ? [restauranteId] : [];

  const { rows: totales } = await pool.query<{ total: string; cantidad: string }>(
    `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS cantidad
       FROM pedidos WHERE estado = 'confirmado' ${filtroRestaurantePlano}`,
    params
  );
  const totalVentas = Number(totales[0].total);
  const cantidadPedidos = Number(totales[0].cantidad);

  const { rows: topProductos } = await pool.query<{
    nombre: string;
    cantidadVendida: string;
    totalRecaudado: string;
  }>(
    `SELECT dp.nombre, SUM(dp.cantidad) AS "cantidadVendida", SUM(dp.cantidad * dp.precio) AS "totalRecaudado"
       FROM detalle_pedido dp
       JOIN pedidos p ON p.id = dp.pedido_id
      WHERE p.estado = 'confirmado' ${filtroRestaurante}
      GROUP BY dp.nombre
      ORDER BY "totalRecaudado" DESC
      LIMIT 5`,
    params
  );

  const { rows: ventasPorDia } = await pool.query<{ fecha: string; total: string }>(
    `SELECT TO_CHAR(creado, 'YYYY-MM-DD') AS fecha, SUM(total) AS total
       FROM pedidos
      WHERE estado = 'confirmado' AND creado >= CURRENT_DATE - INTERVAL '13 days' ${filtroRestaurantePlano}
      GROUP BY fecha
      ORDER BY fecha ASC`,
    params
  );

  let ventasPorRestaurante: EstadisticasVentas["ventasPorRestaurante"];
  if (restauranteId === null) {
    const { rows } = await pool.query<{
      restauranteId: number;
      restauranteNombre: string;
      total: string;
      pedidos: string;
    }>(
      `SELECT r.id AS "restauranteId", r.nombre AS "restauranteNombre",
              COALESCE(SUM(p.total), 0) AS total, COUNT(p.id) AS pedidos
         FROM restaurantes r
         LEFT JOIN pedidos p ON p.restaurante_id = r.id AND p.estado = 'confirmado'
        GROUP BY r.id, r.nombre
        ORDER BY total DESC`
    );
    ventasPorRestaurante = rows.map((r) => ({
      restauranteId: r.restauranteId,
      restauranteNombre: r.restauranteNombre,
      total: Number(r.total),
      pedidos: Number(r.pedidos),
    }));
  }

  return {
    totalVentas,
    cantidadPedidos,
    ticketPromedio: cantidadPedidos > 0 ? Math.round(totalVentas / cantidadPedidos) : 0,
    topProductos: topProductos.map((p) => ({
      nombre: p.nombre,
      cantidadVendida: Number(p.cantidadVendida),
      totalRecaudado: Number(p.totalRecaudado),
    })),
    ventasPorDia: ventasPorDia.map((v) => ({ fecha: v.fecha, total: Number(v.total) })),
    ventasPorRestaurante,
  };
}
