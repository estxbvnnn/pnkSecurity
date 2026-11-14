import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, RestauranteResumen } from "../api";
import { fotoUrl } from "../utils";

export function Listado(): JSX.Element {
  const [restaurantes, setRestaurantes] = useState<RestauranteResumen[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .listarRestaurantes()
      .then((d) => setRestaurantes(d.restaurantes))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="contenedor seccion">
      <h1 className="titulo-pagina">Elegí un restaurante</h1>

      {error && <p className="estado-vacio">No se pudo cargar el listado de restaurantes. Probá de nuevo más tarde.</p>}

      {!restaurantes && !error && (
        <div className="grilla-tarjetas">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="tarjeta">
              <div className="skeleton tarjeta__foto-wrap" />
              <div className="tarjeta__cuerpo">
                <div className="skeleton" style={{ height: 18, width: "70%" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {restaurantes && restaurantes.length === 0 && (
        <p className="estado-vacio">Todavía no hay restaurantes publicados.</p>
      )}

      {restaurantes && restaurantes.length > 0 && (
        <div className="grilla-tarjetas">
          {restaurantes.map((r) => {
            const foto = fotoUrl(r.id, r.foto);
            return (
              <Link to={`/${r.slug}`} key={r.id} className="tarjeta">
                <div className="tarjeta__foto-wrap">
                  {foto ? (
                    <img src={foto} alt={r.nombre} className="tarjeta__foto" loading="lazy" />
                  ) : (
                    <div className="tarjeta__foto" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="ti-home" style={{ fontSize: 28, color: "#c3c9d6" }} />
                    </div>
                  )}
                </div>
                <div className="tarjeta__cuerpo">
                  <div className="tarjeta__titulo-fila">
                    <h3>{r.nombre}</h3>
                  </div>
                  <div className="tarjeta__acciones">
                    <span className="boton boton--primario boton--bloque">Ver carta →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
