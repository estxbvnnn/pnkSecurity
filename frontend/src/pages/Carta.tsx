import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, CartaCompleta, Item } from "../api";
import { fotoUrl, formatearCLP } from "../utils";
import { useCarrito } from "../context/CartContext";
import { useSesion } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";

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
    <div className="col-lg-4 col-md-6 mb-4">
      <div className="featured-item h-100">
        <img className="card-img rounded-0" width="350" height="235" src={foto ?? "/img/carta_comodin.png"} alt="" />
        <div className="item-body">
          <h3>{item.nombre}</h3>
          <p>{item.descripcion}</p>
          <div className="d-flex justify-content-between">
            <span>{"★".repeat(item.puntuacion)}</span>
            <h3 className="price-tag">{formatearCLP(item.precio)}</h3>
          </div>
          <button className="button" onClick={handleAgregar} disabled={agregando}>
            {agregando ? "Agregando..." : "Seleccionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TarjetaItem({
  item,
  restauranteId,
  ancho,
}: {
  item: Item;
  restauranteId: number;
  ancho: "col-lg-6" | "col-lg-12";
}): JSX.Element {
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
    <div className={ancho}>
      <div className="d-flex align-items-center food-card">
        <img className="me-3" width="120" src={foto ?? "/img/carta_comodin.png"} alt="" />
        <div className="media-body flex-grow-1">
          <div className="d-flex justify-content-between food-card-title">
            <h4>{item.nombre}</h4>
            <h3 className="price-tag">{formatearCLP(item.precio)}</h3>
          </div>
          <p>{item.descripcion}</p>
          {item.tiempo && <p className="text-muted small mb-1">⏱ {item.tiempo}</p>}
          <button className="button float-end" onClick={handleAgregar} disabled={agregando}>
            {agregando ? "Agregando..." : "Seleccionar"}
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
    <section>
      <div className="container contendor">
        <h4 className="intro-title">Comentarios</h4>
        {nombreUsuario ? (
          <form onSubmit={enviar}>
            <div className="form-group">
              <label>Nombre:</label>
              <input type="text" className="form-control" value={nombreUsuario} readOnly />
            </div>
            <div className="form-group">
              <label>Comentario:</label>
              <textarea
                className="form-control"
                rows={4}
                maxLength={1000}
                required
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-success" disabled={enviando}>
              {enviando ? "Publicando..." : "Comentar"}
            </button>
          </form>
        ) : (
          <p className="texto-ayuda">Iniciá sesión para dejar un comentario.</p>
        )}
        <br />
        {datos.comentarios.length === 0 && <p className="estado-vacio">Todavía no hay comentarios.</p>}
        {datos.comentarios.map((c) => (
          <div className="card bg-light mb-2" key={c.id}>
            <div className="card-body">
              <b>{c.usuario}</b>
              <br />
              {c.comentario}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Carta(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const [datos, setDatos] = useState<CartaCompleta | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [tabActiva, setTabActiva] = useState<number | null>(null);
  const { nombreUsuario, esAdmin } = useSesion();
  const { cantidad } = useCarrito();

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
      <div className="container my-5">
        <p className="estado-vacio">No encontramos ese restaurante.</p>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="container my-5">
        <div className="skeleton" style={{ height: 180 }} />
      </div>
    );
  }

  const { restaurante } = datos;
  const fotoRestaurante = fotoUrl(restaurante.id, restaurante.foto);

  return (
    <div>
      <section className="cabecera">
        <div className="container contendor">
          <div className="row">
            <div className="col-lg-4">
              <div style={{ textAlign: "center" }}>
                <img className="logosintituciones" src="/img/logo.png" width="190" alt="" />
              </div>
            </div>
            <div className="col-lg-4">
              <div style={{ textAlign: "center" }}>
                <img
                  className="logosintituciones"
                  src={fotoRestaurante ?? "/img/logo_empresa_comodin.png"}
                  width="170"
                  alt=""
                />
              </div>
            </div>
            <div className="col-lg-4">
              <div className="carro">
                <div className="media float-end">
                  {nombreUsuario && esAdmin && (
                    <a className="btn btn-sm btn-outline-light me-2" href="/admin">
                      Administrar Carta
                    </a>
                  )}
                  <Link className="button_carrito" to="/carrito">
                    <i className="ti-shopping-cart" /> Productos Seleccionados
                    {cantidad > 0 && ` (${cantidad})`}
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-12 text-center">
              <h4>{restaurante.nombre}</h4>
              <h5>
                📍 {restaurante.calle} #{restaurante.numero}, {restaurante.comuna}
              </h5>
              <h5>
                {restaurante.fono && <>📞 {restaurante.fono} </>}
                {restaurante.email && <> ✉️ {restaurante.email}</>}
              </h5>
            </div>
          </div>
        </div>
      </section>

      {datos.destacados.length > 0 && (
        <section className="destacados">
          <div className="container contendor">
            <div className="section-intro">
              <h4 className="intro-title">Menús Destacados</h4>
            </div>
            <div className="row">
              {datos.destacados.map((item) => (
                <TarjetaDestacado key={`destacado-${item.id}`} item={item} restauranteId={restaurante.id} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="container contendor">
          <nav>
            <div className="nav nav-tabs nav-fill" id="nav-tab" role="tablist">
              {datos.secciones.map((s) => (
                <a
                  key={s.carta.id}
                  href="#"
                  className={`nav-item nav-link carta-tab${tabActiva === s.carta.id ? " active" : ""}`}
                  role="tab"
                  onClick={(e) => {
                    e.preventDefault();
                    setTabActiva(s.carta.id);
                  }}
                >
                  {s.carta.nombre}
                </a>
              ))}
            </div>
          </nav>
          <div className="tab-content py-3">
            {datos.secciones.map((s) => (
              <div
                key={s.carta.id}
                className={`tab-pane fade${tabActiva === s.carta.id ? " show active" : ""}`}
                role="tabpanel"
                style={{ display: tabActiva === s.carta.id ? "block" : "none" }}
              >
                {s.categoriasConItems.length === 0 && (
                  <div className="text-center">
                    <h4>No hay información para mostrar</h4>
                  </div>
                )}
                {s.categoriasConItems.map((ci) => (
                  <div key={ci.categoria.id}>
                    <div className="section-intro mb-20px">
                      <h4 className="intro-title">{ci.categoria.nombre}</h4>
                    </div>
                    <div className="row">
                      {ci.items.map((item) => (
                        <TarjetaItem
                          key={item.id}
                          item={item}
                          restauranteId={restaurante.id}
                          ancho={ci.items.length > 1 ? "col-lg-6" : "col-lg-12"}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <SeccionComentarios datos={datos} onComentarioNuevo={cargar} />
    </div>
  );
}
