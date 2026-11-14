// Cliente de la API JSON (ver src/routes/index.ts del backend). Todas las
// llamadas van con cookies de sesión (same-origin) y el token CSRF por
// header en vez de un campo oculto de formulario (equivalente a VUL-14,
// adaptado a una SPA).

export interface RestauranteResumen {
  id: number;
  slug: string;
  nombre: string;
  foto: string | null;
}

export interface Restaurante {
  id: number;
  nombre: string;
  slug: string;
  fono: string;
  email: string | null;
  foto: string | null;
  calle: string;
  numero: string;
  comuna: string;
  region: string | null;
}

export interface Item {
  id: number;
  nombre: string;
  descripcion: string | null;
  tiempo: string | null;
  observaciones: string | null;
  precio: number;
  puntuacion: number;
  foto: string | null;
}

export interface Categoria {
  id: number;
  nombre: string;
}

export interface Carta {
  id: number;
  nombre: string;
  orden: number | null;
}

export interface Seccion {
  carta: Carta;
  categoriasConItems: { categoria: Categoria; items: Item[] }[];
}

export interface Comentario {
  id: number;
  usuario: string;
  comentario: string;
  creado: string;
}

export interface CartaCompleta {
  restaurante: Restaurante;
  destacados: Item[];
  secciones: Seccion[];
  comentarios: Comentario[];
  sesion: { nombreUsuario: string | null; esAdmin: boolean };
}

export interface ItemCarrito {
  posicion: number;
  id: number;
  nombre: string;
  precio: number;
  restauranteId: number;
  restauranteNombre: string;
}

export interface PedidoConfirmado {
  id: number;
  total: number;
  restauranteId: number;
  restauranteNombre: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public cuerpo: unknown
  ) {
    super(message);
  }
}

let csrfTokenCache: string | null = null;

async function obtenerCsrfToken(): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache;
  const res = await fetch("/api/csrf", { credentials: "include" });
  const datos = (await res.json()) as { csrfToken: string };
  csrfTokenCache = datos.csrfToken;
  return csrfTokenCache;
}

async function peticion<T>(
  metodo: "GET" | "POST",
  ruta: string,
  cuerpo?: Record<string, unknown>
): Promise<T> {
  const headers: Record<string, string> = {};
  let body: string | undefined;

  if (metodo === "POST") {
    headers["Content-Type"] = "application/json";
    headers["X-CSRF-Token"] = await obtenerCsrfToken();
    body = JSON.stringify(cuerpo ?? {});
  }

  const res = await fetch(`/api${ruta}`, {
    method: metodo,
    credentials: "include",
    headers,
    body,
  });

  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((datos as { error?: string }).error ?? "error_desconocido", res.status, datos);
  }

  // Un login/2fa exitoso regenera la sesión en el servidor (y con ella el
  // csrfToken): si la respuesta trae uno nuevo, se actualiza el cache acá
  // para que la siguiente acción no quede usando el token viejo.
  const csrfNuevo = (datos as { csrfToken?: string }).csrfToken;
  if (csrfNuevo) csrfTokenCache = csrfNuevo;

  return datos as T;
}

export const api = {
  listarRestaurantes: () => peticion<{ restaurantes: RestauranteResumen[] }>("GET", "/restaurantes"),
  obtenerCarta: (slug: string) => peticion<CartaCompleta>("GET", `/restaurantes/${encodeURIComponent(slug)}`),
  sesion: () => peticion<{ nombreUsuario: string | null; esAdmin: boolean }>("GET", "/sesion"),

  login: (email: string, password: string) =>
    peticion<{ ok: true; requiere2fa?: boolean; nombre?: string; rol?: string; csrfToken?: string }>("POST", "/login", {
      email,
      password,
    }),
  verificar2fa: (codigo: string) =>
    peticion<{ ok: true; nombre: string; rol: string; csrfToken?: string }>("POST", "/login/2fa", { codigo }),
  logout: async () => {
    const res = await peticion<{ ok: true }>("POST", "/logout");
    // La sesión queda destruida del todo (no regenerada): se limpia el
    // cache para que la próxima acción pida un token fresco de la sesión
    // anónima nueva, en vez de reusar el de la sesión ya destruida.
    csrfTokenCache = null;
    return res;
  },

  verCarrito: () => peticion<{ restauranteId: number; carrito: ItemCarrito[] }>("GET", "/carrito"),
  agregarAlCarrito: (itemId: number) => peticion<{ ok: true; posicion: number }>("POST", "/carrito/agregar", { itemId }),
  eliminarDelCarrito: (posicion: number) => peticion<{ ok: true }>("POST", "/carrito/eliminar", { posicion }),
  vaciarCarrito: () => peticion<{ ok: true }>("POST", "/carrito/vaciar"),
  confirmarCarrito: () =>
    peticion<{ ok: true; restauranteId: number; pedidos: PedidoConfirmado[] }>("POST", "/carrito/confirmar"),

  comentar: (comentario: string) => peticion<{ ok: true }>("POST", "/comentarios", { comentario }),
};

export { ApiError };
