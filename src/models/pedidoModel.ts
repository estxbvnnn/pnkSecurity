import { pool } from "../config/db";
import { EstadisticasVentas, ItemCarrito, Pedido } from "../types/models";

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

export async function listarPedidosRecientes(restauranteId: number, limite = 20): Promise<Pedido[]> {
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

export async function estadisticasVentas(restauranteId: number): Promise<EstadisticasVentas> {
  const { rows: totales } = await pool.query<{ total: string; cantidad: string }>(
    `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS cantidad
       FROM pedidos WHERE restaurante_id = $1 AND estado = 'confirmado'`,
    [restauranteId]
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
      WHERE p.restaurante_id = $1 AND p.estado = 'confirmado'
      GROUP BY dp.nombre
      ORDER BY "totalRecaudado" DESC
      LIMIT 5`,
    [restauranteId]
  );

  const { rows: ventasPorDia } = await pool.query<{ fecha: string; total: string }>(
    `SELECT TO_CHAR(creado, 'YYYY-MM-DD') AS fecha, SUM(total) AS total
       FROM pedidos
      WHERE restaurante_id = $1 AND estado = 'confirmado' AND creado >= CURRENT_DATE - INTERVAL '13 days'
      GROUP BY fecha
      ORDER BY fecha ASC`,
    [restauranteId]
  );

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
  };
}
