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
      <div className="contenedor seccion seccion--angosta">
        <div className="tarjeta confirmacion">
          <div className="confirmacion__icono">✓</div>
          <h2>{pedidosConfirmados.length > 1 ? "¡Pedidos confirmados!" : "¡Pedido confirmado!"}</h2>
          {pedidosConfirmados.map((p) => (
            <div key={p.id} className="confirmacion__pedido">
              {pedidosConfirmados.length > 1 && <p className="confirmacion__restaurante">{p.restauranteNombre}</p>}
              <p className="confirmacion__numero">
                N.º de pedido: <strong>#{p.id}</strong>
              </p>
              <p className="confirmacion__total">{formatearCLP(p.total)}</p>
            </div>
          ))}
          <p className="modal-texto-ayuda">Avisale al garzón tu número de pedido para que lo prepare.</p>
          <Link to="/" className="boton boton--primario">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="contenedor seccion seccion--angosta">
        <div className="skeleton" style={{ height: 240, borderRadius: 22 }} />
      </div>
    );
  }

  return (
    <div className="contenedor seccion seccion--angosta">
      <h1 className="titulo-pagina">Tu carrito</h1>

      {items.length === 0 ? (
        <div className="estado-vacio-tarjeta">
          <p>Tu carrito está vacío.</p>
          <Link to="/" className="boton boton--primario">
            Ver restaurantes
          </Link>
        </div>
      ) : (
        <>
          <ul className="lista-carrito">
            {items.map((item) => (
              <li key={item.posicion}>
                <div>
                  <p className="lista-carrito__nombre">{item.nombre}</p>
                  <p className="lista-carrito__restaurante">{item.restauranteNombre}</p>
                </div>
                <div className="lista-carrito__derecha">
                  <span>{formatearCLP(item.precio)}</span>
                  <button
                    className="boton boton--peligro boton--chico"
                    onClick={() => eliminar(item.posicion)}
                    aria-label={`Quitar ${item.nombre}`}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {restaurantesDistintos.length > 1 && (
            <p className="aviso-multi-restaurante">
              Tu carrito tiene productos de {restaurantesDistintos.length} restaurantes distintos (
              {restaurantesDistintos.join(", ")}) — se van a confirmar como pedidos separados, uno por restaurante.
            </p>
          )}

          <div className="total-carrito">
            <span>Total</span>
            <strong>{formatearCLP(total)}</strong>
          </div>

          <div className="carrito-acciones">
            <button className="boton boton--fantasma" onClick={() => vaciar()}>
              Vaciar carrito
            </button>
            <button className="boton boton--primario boton--bloque" onClick={handleConfirmar} disabled={confirmando}>
              {confirmando ? "Confirmando..." : "Confirmar pedido"}
            </button>
          </div>
          <p className="modal-texto-ayuda" style={{ textAlign: "center" }}>
            o avisale directamente al garzón para solicitarlo.
          </p>
        </>
      )}
    </div>
  );
}
