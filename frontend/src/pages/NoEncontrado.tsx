import { Link } from "react-router-dom";

export function NoEncontrado(): JSX.Element {
  return (
    <div className="container contendor text-center my-5">
      <h3>Página no encontrada</h3>
      <p className="texto-ayuda mb-3">El restaurante o la página que buscás no existe.</p>
      <Link to="/" className="button">
        Volver al inicio
      </Link>
    </div>
  );
}
