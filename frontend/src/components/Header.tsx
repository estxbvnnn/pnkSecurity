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
    <header className="header">
      <div className="contenedor header__fila">
        <Link to="/" className="header__marca">
          Carta Digital
        </Link>

        <nav className="header__acciones">
          {nombreUsuario ? (
            <div className="header__usuario">
              <span className="header__saludo">Hola, {nombreUsuario}</span>
              {esAdmin && (
                <a className="boton boton--fantasma boton--chico" href="/admin">
                  Panel admin
                </a>
              )}
              <button className="boton boton--fantasma boton--chico" onClick={cerrarSesion}>
                Cerrar sesión
              </button>
            </div>
          ) : (
            <button className="boton boton--fantasma boton--chico" onClick={() => setMostrarLogin(true)}>
              Iniciar sesión
            </button>
          )}

          <Link to="/carrito" className="header__carrito" aria-label="Ver carrito">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6h15l-1.5 9h-12L5 3H2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="20" r="1.4" fill="currentColor" />
              <circle cx="17" cy="20" r="1.4" fill="currentColor" />
            </svg>
            {cantidad > 0 && <span className="header__carrito-contador">{cantidad}</span>}
          </Link>
        </nav>
      </div>

      {mostrarLogin && <LoginModal onCerrar={() => setMostrarLogin(false)} />}
    </header>
  );
}
