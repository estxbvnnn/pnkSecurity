import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCarrito } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { formatearCLP } from "../utils";
import { PedidoConfirmado } from "../api";

export function Carrito(): JSX.Element {
  const { items, total, cargando, eliminar, vaciar, confirmar } = useCarrito();
  const { mostrar } = useToast();
  const [confirmando, setConfirmando] = useState(false);
  const [pedidosConfirmados, setPedidosConfirmados] = useState<PedidoConfirmado[] | null>(null);

  const restaurantesDistintos = useMemo(
    () => Array.from(new Set(items.map((i) => i.restauranteNombre))),
    [items]
  );

  async function handleConfirmar(): Promise<void> {
    setConfirmando(true);
    const res = await confirmar();
    setConfirmando(false);
    if (!res.ok) {
      mostrar(res.error ?? "No se pudo confirmar el pedido.", "error");
      return;
    }
    setPedidosConfirmados(res.pedidos ?? []);
  }

  if (pedidosConfirmados) {
    return (
      <div className="container">
        <div className="confirmacion">
          <div className="confirmacion__icono">
            <i className="ti-check" />
          </div>
          <h2>{pedidosConfirmados.length > 1 ? "¡Pedidos confirmados!" : "¡Pedido confirmado!"}</h2>
          {pedidosConfirmados.map((p) => (
            <div key={p.id} className="confirmacion__pedido">
              {pedidosConfirmados.length > 1 && <p className="confirmacion__restaurante">{p.restauranteNombre}</p>}
              <p>
                N.º de pedido: <strong>#{p.id}</strong>
              </p>
              <p className="confirmacion__total">{formatearCLP(p.total)}</p>
            </div>
          ))}
          <p className="texto-ayuda mt-2">Avisale al garzón tu número de pedido para que lo prepare.</p>
          <Link to="/" className="button mt-2 d-inline-block">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="container my-4">
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  return (
    <div>
      <section>
        <div className="container contendor">
          <div className="row">
            <div className="col-lg-12 d-flex justify-content-between align-items-center">
              <img className="logosintituciones" src="/img/logo.png" width="170" alt="" />
              <div>
                <Link className="btn btn-primary" to="/">
                  Volver a la Carta
                </Link>
                {items.length > 0 && (
                  <button className="btn btn-secondary ms-2" onClick={() => vaciar()}>
                    Eliminar Todo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container contendor">
          <h4 className="text-center">Productos Agregados para Solicitar</h4>

          {items.length === 0 ? (
            <h5 className="text-center text-muted">Tu carrito está vacío.</h5>
          ) : (
            <>
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Restaurante</th>
                    <th>Precio</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.posicion}>
                      <td>{item.id}</td>
                      <td>{item.nombre}</td>
                      <td>{item.restauranteNombre}</td>
                      <td>{formatearCLP(item.precio)}</td>
                      <td>
                        <a
                          href="#"
                          className="text-danger"
                          onClick={(e) => {
                            e.preventDefault();
                            eliminar(item.posicion);
                          }}
                        >
                          <i className="ti-trash" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {restaurantesDistintos.length > 1 && (
                <p className="text-center text-muted">
                  Tu carrito tiene productos de {restaurantesDistintos.length} restaurantes distintos (
                  {restaurantesDistintos.join(", ")}) — se van a confirmar como pedidos separados, uno por restaurante.
                </p>
              )}

              <h3 className="text-center">Total: {formatearCLP(total)}</h3>

              <div className="text-center">
                <button className="btn btn-success btn-lg" onClick={handleConfirmar} disabled={confirmando}>
                  {confirmando ? "Confirmando..." : "✅ Confirmar Pedido"}
                </button>
              </div>
              <p className="text-center text-muted mt-2">o avísale directamente al garzón para solicitarlo.</p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
