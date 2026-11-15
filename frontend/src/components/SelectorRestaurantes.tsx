import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, RestauranteResumen } from "../api";
import { fotoUrl } from "../utils";

// Panel lateral para cambiar de restaurante sin volver a escanear un QR
// distinto. Vive dentro de Carta.tsx (se ve en cualquier restaurante,
// sea cual sea el slug por el que se entró).
export function SelectorRestaurantes({ slugActual }: { slugActual: string }): JSX.Element | null {
  const [restaurantes, setRestaurantes] = useState<RestauranteResumen[] | null>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    api
      .listarRestaurantes()
      .then((d) => setRestaurantes(d.restaurantes))
      .catch(() => setRestaurantes([]));
  }, []);

  if (!restaurantes || restaurantes.length < 2) return null;

  return (
    <>
      <button
        className="selector-restaurantes__toggle"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Elegir otro restaurante"
      >
        <i className="ti-layout-grid2" />
      </button>

      <aside className={`selector-restaurantes${abierto ? " selector-restaurantes--abierto" : ""}`}>
        <div className="selector-restaurantes__titulo">
          <span>Otros restaurantes</span>
          <button className="selector-restaurantes__cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar">
            <i className="ti-close" />
          </button>
        </div>
        <ul>
          {restaurantes.map((r) => {
            const foto = fotoUrl(r.id, r.foto);
            const activo = r.slug === slugActual;
            return (
              <li key={r.id}>
                <Link
                  to={`/${r.slug}`}
                  className={`selector-restaurantes__item${activo ? " activo" : ""}`}
                  onClick={() => setAbierto(false)}
                >
                  {foto ? (
                    <img src={foto} alt="" />
                  ) : (
                    <span className="selector-restaurantes__sinfoto">
                      <i className="ti-home" />
                    </span>
                  )}
                  <span>{r.nombre}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
