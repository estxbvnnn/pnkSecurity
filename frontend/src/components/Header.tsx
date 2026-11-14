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
    <header className="barra-publica">
      <div className="contenedor barra-publica__fila">
        <Link to="/" className="barra-publica__marca">
          Carta Digital
        </Link>

        <div className="barra-publica__acciones">
          {nombreUsuario ? (
            <>
              <span className="barra-publica__saludo">
                <i className="ti-user" /> {nombreUsuario}
              </span>
              {esAdmin && (
                <a className="boton boton--fantasma boton--chico" href="/admin">
                  Panel admin
                </a>
              )}
              <button className="boton boton--fantasma boton--chico" onClick={cerrarSesion}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <button className="boton boton--fantasma boton--chico" onClick={() => setMostrarLogin(true)}>
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
    </header>
  );
}
