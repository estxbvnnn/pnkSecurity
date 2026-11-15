import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, CartaCompleta, Item } from "../api";
import { fotoUrl, formatearCLP } from "../utils";
import { useCarrito } from "../context/CartContext";
import { useSesion } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import { SelectorRestaurantes } from "../components/SelectorRestaurantes";

function TarjetaDestacado({ item, restauranteId }: { item: Item; restauranteId: number }): JSX.Element {
  const { agregar } = useCarrito();
  const { mostrar } = useToast();
  const [agregando, setAgregando] = useState(false);
  const foto = fotoUrl(restauranteId, item.foto);

  async function handleAgregar(): Promise<void> {
    setAgregando(true);
    try {
      await agregar(item.id);
      mostrar(`${item.nombre} agregado al carrito.`, "exito");
    } catch {
      mostrar("No se pudo agregar el producto.", "error");
    } finally {
      setAgregando(false);
    }
  }

  return (
    <div className="tarjeta tarjeta--destacada">
      <div className="tarjeta__foto-wrap">
        {foto ? (
          <img src={foto} alt={item.nombre} className="tarjeta__foto" loading="lazy" />
        ) : (
          <div className="tarjeta__foto" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti-shopping-cart-full" style={{ fontSize: 26, color: "#c3c9d6" }} />
          </div>
        )}
      </div>
      <div className="tarjeta__cuerpo">
        <span className="badge-pill badge-pill--marca" style={{ alignSelf: "flex-start" }}>
          ★ Destacado
        </span>
        <div className="tarjeta__titulo-fila">
          <h4>{item.nombre}</h4>
          <span className="precio">{formatearCLP(item.precio)}</span>
        </div>
        {item.descripcion && <p className="tarjeta__descripcion">{item.descripcion}</p>}
        <div className="tarjeta__acciones">
          <button className="boton boton--marca boton--bloque" onClick={handleAgregar} disabled={agregando}>
            {agregando ? "Agregando..." : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TarjetaItem({ item, restauranteId }: { item: Item; restauranteId: number }): JSX.Element {
  const { agregar } = useCarrito();
  const { mostrar } = useToast();
  const [agregando, setAgregando] = useState(false);
  const foto = fotoUrl(restauranteId, item.foto);

  async function handleAgregar(): Promise<void> {
    setAgregando(true);
    try {
      await agregar(item.id);
      mostrar(`${item.nombre} agregado al carrito.`, "exito");
    } catch {
      mostrar("No se pudo agregar el producto.", "error");
    } finally {
      setAgregando(false);
    }
  }

  return (
    <div className="tarjeta">
      <div className="tarjeta__foto-wrap">
        {foto ? (
          <img src={foto} alt={item.nombre} className="tarjeta__foto" loading="lazy" />
        ) : (
          <div className="tarjeta__foto" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti-shopping-cart-full" style={{ fontSize: 26, color: "#c3c9d6" }} />
          </div>
        )}
      </div>
      <div className="tarjeta__cuerpo">
        <div className="tarjeta__titulo-fila">
          <h4>{item.nombre}</h4>
          <span className="precio">{formatearCLP(item.precio)}</span>
        </div>
        {item.descripcion && <p className="tarjeta__descripcion">{item.descripcion}</p>}
        {item.tiempo && (
          <span className="fila-info">
            <i className="ti-timer" /> {item.tiempo}
          </span>
        )}
        <div className="tarjeta__acciones">
          <button className="boton boton--primario boton--bloque" onClick={handleAgregar} disabled={agregando}>
            {agregando ? "Agregando..." : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SeccionComentarios({ datos, onComentarioNuevo }: { datos: CartaCompleta; onComentarioNuevo: () => void }): JSX.Element {
  const { nombreUsuario } = useSesion();
  const { mostrar } = useToast();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(ev: FormEvent): Promise<void> {
    ev.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await api.comentar(texto.trim());
      setTexto("");
      onComentarioNuevo();
      mostrar("Comentario publicado.", "exito");
    } catch {
      mostrar("No se pudo publicar el comentario.", "error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="categoria-bloque">
      <h2>Comentarios</h2>
      <div className="caja-comentarios">
        {nombreUsuario ? (
          <form onSubmit={enviar}>
            <textarea
              placeholder="Contanos qué te pareció..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              maxLength={1000}
            />
            <button type="submit" className="boton boton--primario boton--chico" disabled={enviando}>
              {enviando ? "Publicando..." : "Publicar"}
            </button>
          </form>
        ) : (
          <p className="texto-ayuda">Iniciá sesión para dejar un comentario.</p>
        )}

        {datos.comentarios.length === 0 ? (
          <p className="estado-vacio" style={{ padding: "16px 0" }}>
            Todavía no hay comentarios.
          </p>
        ) : (
          <ul className="lista-comentarios">
            {datos.comentarios.map((c) => (
              <li key={c.id}>
                <strong>{c.usuario}</strong>
                <p style={{ margin: "4px 0 0" }}>{c.comentario}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function Carta(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const [datos, setDatos] = useState<CartaCompleta | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [tabActiva, setTabActiva] = useState<number | null>(null);
  const { esAdmin } = useSesion();

  function cargar(): void {
    if (!slug) return;
    api
      .obtenerCarta(slug)
      .then((d) => {
        setDatos(d);
        setTabActiva(d.secciones[0]?.carta.id ?? null);
      })
      .catch(() => setNoEncontrado(true));
  }

  useEffect(() => {
    setDatos(null);
    setNoEncontrado(false);
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (noEncontrado) {
    return (
      <div className="contenedor seccion">
        <p className="estado-vacio">No encontramos ese restaurante.</p>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="contenedor seccion">
        <div className="skeleton" style={{ height: 120, marginBottom: 28 }} />
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    );
  }

  const { restaurante } = datos;
  const fotoRestaurante = fotoUrl(restaurante.id, restaurante.foto);

  return (
    <div>
      {slug && <SelectorRestaurantes slugActual={slug} />}
      <section
        className="portada-restaurante"
        style={fotoRestaurante ? { backgroundImage: `url(${fotoRestaurante})` } : undefined}
      >
        <div className="contenedor portada-restaurante__fila">
          <img className="portada-restaurante__foto" src={fotoRestaurante ?? "/img/logo_empresa_comodin.png"} alt="" />
          <div className="portada-restaurante__datos">
            <h1>{restaurante.nombre}</h1>
            <div className="portada-restaurante__filas">
              <span className="fila-info">
                <i className="ti-location-pin" /> {restaurante.calle} #{restaurante.numero}, {restaurante.comuna}
                {restaurante.region ? `, ${restaurante.region}` : ""}
              </span>
              {restaurante.fono && (
                <span className="fila-info">
                  <i className="ti-mobile" /> {restaurante.fono}
                </span>
              )}
              {restaurante.email && (
                <span className="fila-info">
                  <i className="ti-email" /> {restaurante.email}
                </span>
              )}
            </div>
          </div>
          <div className="portada-restaurante__acciones">
            {esAdmin && (
              <a className="boton boton--fantasma boton--chico" href="/admin">
                Administrar
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="contenedor seccion">
        {datos.destacados.length > 0 && (
          <section className="categoria-bloque">
            <h2>Destacados</h2>
            <div className="grilla-tarjetas">
              {datos.destacados.map((item) => (
                <TarjetaDestacado key={`destacado-${item.id}`} item={item} restauranteId={restaurante.id} />
              ))}
            </div>
          </section>
        )}

        {datos.secciones.length > 0 && (
          <>
            <div className="tabs-carta">
              {datos.secciones.map((s) => (
                <button
                  key={s.carta.id}
                  className={`tab-pastilla${tabActiva === s.carta.id ? " activa" : ""}`}
                  onClick={() => setTabActiva(s.carta.id)}
                >
                  {s.carta.nombre}
                </button>
              ))}
            </div>

            {datos.secciones
              .filter((s) => s.carta.id === tabActiva)
              .map((s) => (
                <div key={s.carta.id}>
                  {s.categoriasConItems.length === 0 && <p className="estado-vacio">No hay información para mostrar.</p>}
                  {s.categoriasConItems.map((ci) => (
                    <div key={ci.categoria.id} className="categoria-bloque">
                      <h3>{ci.categoria.nombre}</h3>
                      {ci.items.length === 0 ? (
                        <p className="estado-vacio" style={{ padding: "12px 0" }}>
                          Sin productos por ahora.
                        </p>
                      ) : (
                        <div className="grilla-tarjetas">
                          {ci.items.map((item) => (
                            <TarjetaItem key={item.id} item={item} restauranteId={restaurante.id} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
          </>
        )}

        <SeccionComentarios datos={datos} onComentarioNuevo={cargar} />
      </div>
    </div>
  );
}
