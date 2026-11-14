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
    <section>
      <div className="container contendor my-4">
        <div className="text-center mb-4">
          <img className="logosintituciones" src="/img/logo.png" width="190" alt="" />
          <h3 className="mt-3">Elige un restaurante</h3>
        </div>

        {error && <p className="estado-vacio">No se pudo cargar el listado de restaurantes. Probá de nuevo más tarde.</p>}

        <div className="row">
          {!restaurantes &&
            !error &&
            Array.from({ length: 6 }).map((_, i) => (
              <div className="col-lg-4 col-md-6 mb-4" key={i}>
                <div className="featured-item h-100 text-center p-3">
                  <div className="skeleton mb-2" style={{ width: 140, height: 140, margin: "0 auto" }} />
                  <div className="skeleton" style={{ height: 20, width: "70%", margin: "0 auto" }} />
                </div>
              </div>
            ))}

          {restaurantes &&
            restaurantes.map((r) => {
              const foto = fotoUrl(r.id, r.foto);
              return (
                <div className="col-lg-4 col-md-6 mb-4" key={r.id}>
                  <Link className="text-decoration-none" to={`/${r.slug}`}>
                    <div className="featured-item h-100 text-center p-3">
                      <img
                        className="card-img rounded-0 mb-2"
                        width="140"
                        height="140"
                        style={{ objectFit: "contain" }}
                        src={foto ?? "/img/logo_empresa_comodin.png"}
                        alt=""
                      />
                      <h5>{r.nombre}</h5>
                    </div>
                  </Link>
                </div>
              );
            })}
        </div>

        {restaurantes && restaurantes.length === 0 && (
          <p className="text-center text-muted">No hay restaurantes disponibles todavía.</p>
        )}
      </div>
    </section>
  );
}
