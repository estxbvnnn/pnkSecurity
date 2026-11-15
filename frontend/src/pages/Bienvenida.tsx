import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api";

// No hay listado público para "elegir" restaurante como paso previo: al
// entrar a "/" sin slug (sin pasar por el QR de una mesa puntual) se entra
// directo a un restaurante (el primero de la lista) -- el selector lateral
// dentro de Carta.tsx permite cambiar a cualquiera de los 7 sin volver acá.
export function Bienvenida(): JSX.Element {
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .listarRestaurantes()
      .then((d) => {
        if (d.restaurantes.length > 0) setSlug(d.restaurantes[0].slug);
        else setError(true);
      })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="contenedor seccion" style={{ textAlign: "center" }}>
        <p className="estado-vacio">No se pudo cargar ningún restaurante. Probá de nuevo más tarde.</p>
      </div>
    );
  }

  if (!slug) {
    return (
      <div className="contenedor seccion">
        <div className="skeleton" style={{ height: 120, marginBottom: 28 }} />
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    );
  }

  return <Navigate to={`/${slug}`} replace />;
}
