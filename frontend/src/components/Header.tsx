import { useState } from "react";
import { Link } from "react-router-dom";
import { useSesion } from "../context/SessionContext";
import { useCarrito } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { LoginModal } from "./LoginModal";

export function Header(): JSX.Element {
  const { nombreUsuario, esAdmin, logout } = useSesion();
  const { cantidad } = useCarrito();
  const { mostrar } = useToast();
  const [mostrarLogin, setMostrarLogin] = useState(false);

  async function cerrarSesion(): Promise<void> {
    await logout();
    mostrar("Sesión cerrada.", "info");
  }

  return (
    <nav className="navbar navbar-light bg-light navbar-publica">
      <div className="container d-flex justify-content-between align-items-center flex-wrap">
        <Link to="/" className="navbar-brand">
          Carta Digital
        </Link>

        <div className="d-flex align-items-center gap-3 flex-wrap">
          {nombreUsuario ? (
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span>
                <i className="ti-user" /> {nombreUsuario}
              </span>
              {esAdmin && (
                <a className="btn btn-sm btn-outline-dark" href="/admin">
                  Administrar Carta
                </a>
              )}
              <button className="btn btn-sm btn-outline-secondary" onClick={cerrarSesion}>
                Cerrar sesión
              </button>
            </div>
          ) : (
            <button className="btn btn-sm btn-outline-primary" onClick={() => setMostrarLogin(true)}>
              Ingresar
            </button>
          )}

          <Link to="/carrito" className="carrito-link" aria-label="Ver carrito">
            <i className="ti-shopping-cart" />
            {cantidad > 0 && <span className="carrito-badge">{cantidad}</span>}
          </Link>
        </div>
      </div>

      {mostrarLogin && <LoginModal onCerrar={() => setMostrarLogin(false)} />}
    </nav>
  );
}
