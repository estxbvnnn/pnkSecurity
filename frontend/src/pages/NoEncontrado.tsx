import { Link } from "react-router-dom";

export function NoEncontrado(): JSX.Element {
  return (
    <div className="contenedor seccion" style={{ textAlign: "center" }}>
      <h1 className="titulo-pagina">Página no encontrada</h1>
      <p className="texto-ayuda" style={{ marginBottom: 20 }}>
        El restaurante o la página que buscás no existe.
      </p>
      <Link to="/" className="boton boton--primario">
        Volver al inicio
      </Link>
    </div>
  );
}
