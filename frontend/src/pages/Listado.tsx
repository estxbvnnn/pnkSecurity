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
    <div>
      <section className="hero">
        <div className="contenedor hero__contenido">
          <span className="hero__etiqueta">Carta Digital</span>
          <h1>Elegí un restaurante y mirá su carta</h1>
          <p className="hero__subtitulo">Menús actualizados al instante, pedidos desde la mesa.</p>
        </div>
      </section>

      <section className="contenedor seccion">
        {error && <p className="estado-vacio">No se pudo cargar el listado de restaurantes. Probá de nuevo más tarde.</p>}

        {!restaurantes && !error && (
          <div className="grilla-restaurantes">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="tarjeta-restaurante tarjeta-restaurante--skeleton">
                <div className="skeleton tarjeta-restaurante__foto" />
                <div className="tarjeta-restaurante__cuerpo">
                  <div className="skeleton" style={{ height: 20, width: "70%" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {restaurantes && restaurantes.length === 0 && (
          <p className="estado-vacio">Todavía no hay restaurantes publicados.</p>
        )}

        {restaurantes && restaurantes.length > 0 && (
          <div className="grilla-restaurantes">
            {restaurantes.map((r) => {
              const foto = fotoUrl(r.id, r.foto);
              return (
                <Link to={`/${r.slug}`} key={r.id} className="tarjeta-restaurante">
                  <div className="tarjeta-restaurante__foto-wrap">
                    {foto ? (
                      <img src={foto} alt={r.nombre} className="tarjeta-restaurante__foto" loading="lazy" />
                    ) : (
                      <div className="tarjeta-restaurante__foto tarjeta-restaurante__foto--vacia" />
                    )}
                  </div>
                  <div className="tarjeta-restaurante__cuerpo">
                    <h3>{r.nombre}</h3>
                    <span className="tarjeta-restaurante__cta">Ver carta →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
