import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, CartaCompleta, Item } from "../api";
import { fotoUrl, formatearCLP } from "../utils";
import { useCarrito } from "../context/CartContext";
import { useSesion } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";

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
    <article className="item-tarjeta">
      {foto && <img src={foto} alt={item.nombre} className="item-tarjeta__foto" loading="lazy" />}
      <div className="item-tarjeta__cuerpo">
        <div className="item-tarjeta__encabezado">
          <h4>{item.nombre}</h4>
          <span className="item-tarjeta__precio">{formatearCLP(item.precio)}</span>
        </div>
        {item.descripcion && <p className="item-tarjeta__descripcion">{item.descripcion}</p>}
        {item.tiempo && <p className="item-tarjeta__tiempo">⏱ {item.tiempo}</p>}
        <button className="boton boton--primario boton--chico" onClick={handleAgregar} disabled={agregando}>
          {agregando ? "Agregando..." : "Agregar al carrito"}
        </button>
      </div>
    </article>
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
    <section className="seccion-comentarios">
      <h2>Comentarios</h2>
      {nombreUsuario ? (
        <form onSubmit={enviar} className="comentario-form">
          <textarea
            placeholder="Contanos qué te pareció..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            maxLength={1000}
          />
          <button type="submit" className="boton boton--primario boton--chico" disabled={enviando}>
            {enviando ? "Publicando..." : "Publicar"}
          </button>
        </form>
      ) : (
        <p className="modal-texto-ayuda">Iniciá sesión para dejar un comentario.</p>
      )}

      {datos.comentarios.length === 0 ? (
        <p className="estado-vacio">Todavía no hay comentarios.</p>
      ) : (
        <ul className="lista-comentarios">
          {datos.comentarios.map((c) => (
            <li key={c.id}>
              <strong>{c.usuario}</strong>
              <p>{c.comentario}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Carta(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const [datos, setDatos] = useState<CartaCompleta | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);

  function cargar(): void {
    if (!slug) return;
    api
      .obtenerCarta(slug)
      .then(setDatos)
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
        <div className="skeleton" style={{ height: 220, borderRadius: 22, marginBottom: 32 }} />
      </div>
    );
  }

  const { restaurante } = datos;
  const fotoPortada = fotoUrl(restaurante.id, restaurante.foto);

  return (
    <div>
      <section
        className="carta-portada"
        style={fotoPortada ? { backgroundImage: `linear-gradient(180deg, rgba(35,28,22,.15), rgba(35,28,22,.55)), url(${fotoPortada})` } : undefined}
      >
        <div className="contenedor carta-portada__contenido">
          <h1>{restaurante.nombre}</h1>
          <p>
            {restaurante.calle} {restaurante.numero}, {restaurante.comuna}
            {restaurante.region ? `, ${restaurante.region}` : ""} · {restaurante.fono}
          </p>
        </div>
      </section>

      <div className="contenedor seccion">
        {datos.destacados.length > 0 && (
          <section className="seccion-carta">
            <h2>Destacados</h2>
            <div className="grilla-items">
              {datos.destacados.map((item) => (
                <TarjetaItem key={`destacado-${item.id}`} item={item} restauranteId={restaurante.id} />
              ))}
            </div>
          </section>
        )}

        {datos.secciones.map(({ carta, categoriasConItems }) => (
          <section key={carta.id} className="seccion-carta">
            <h2>{carta.nombre}</h2>
            {categoriasConItems.map(({ categoria, items }) => (
              <div key={categoria.id} className="categoria-bloque">
                <h3>{categoria.nombre}</h3>
                {items.length === 0 ? (
                  <p className="estado-vacio estado-vacio--chico">Sin productos por ahora.</p>
                ) : (
                  <div className="grilla-items">
                    {items.map((item) => (
                      <TarjetaItem key={item.id} item={item} restauranteId={restaurante.id} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}

        <SeccionComentarios datos={datos} onComentarioNuevo={cargar} />
      </div>
    </div>
  );
}
