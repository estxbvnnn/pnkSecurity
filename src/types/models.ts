export interface Restaurante {
  id: number;
  nombre: string;
  fono: string;
  email: string | null;
  foto: string | null;
  calle: string;
  numero: string;
  comuna: string;
  region: string | null;
}

/** Fila liviana para listados (selector del admin, landing pública). */
export interface RestauranteResumen {
  id: number;
  nombre: string;
  foto: string | null;
}

/** Vista admin: todos los campos propios + los de su dirección, para editar. */
export interface RestauranteAdmin {
  id: number;
  rut: string;
  nombre: string;
  fono: string;
  email: string | null;
  foto: string | null;
  direccionId: number;
  calle: string;
  numero: string;
  comuna: string;
  region: string | null;
}

export interface RestauranteInput {
  rut: string;
  nombre: string;
  fono: string;
  email: string;
  calle: string;
  numero: string;
  comuna: string;
  region: string;
  foto?: string;
}

export interface Carta {
  id: number;
  nombre: string;
  orden: number | null;
}

export interface Categoria {
  id: number;
  nombre: string;
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

/** Vistas "admin" — incluyen elementos ocultos (visible=false) para gestionar la carta. */
export interface CartaAdmin extends Carta {
  visible: boolean;
}

export interface CategoriaAdmin extends Categoria {
  visible: boolean;
  cartaId: number;
}

export interface ItemAdmin extends Item {
  visible: boolean;
  destacado: boolean;
  categoriaId: number;
}

export interface ItemInput {
  nombre: string;
  descripcion: string;
  tiempo: string;
  observaciones: string;
  precio: number;
  puntuacion: number;
  destacado: boolean;
  visible: boolean;
  categoriaId: number;
  foto: string;
}

export interface Comentario {
  id: number;
  usuario: string;
  comentario: string;
  creado: Date;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  password: string;
  estado: string;
  rol: "admin" | "cliente";
  secreto2fa: string | null;
  dosfaHabilitado: boolean;
}

export interface ItemCarrito {
  posicion: number;
  id: number;
  nombre: string;
  precio: number;
}

export interface Pedido {
  id: number;
  clienteNombre: string;
  total: number;
  estado: string;
  creado: Date;
}

export interface EstadisticasVentas {
  totalVentas: number;
  cantidadPedidos: number;
  ticketPromedio: number;
  topProductos: { nombre: string; cantidadVendida: number; totalRecaudado: number }[];
  ventasPorDia: { fecha: string; total: number }[];
}

// Augmenta express-session con los datos propios de la app.
declare module "express-session" {
  interface SessionData {
    usuarioId?: number;
    nombre?: string;
    rol?: "admin" | "cliente";
    restauranteId?: number;
    carrito?: ItemCarrito[];
    csrfToken?: string;
    loginIntentos?: { count: number; inicio: number; bloqueadoHasta: number };
    // Login en 2 pasos: se guarda el usuario ya autenticado con clave mientras
    // se espera el código TOTP (ver controllers/authController.ts).
    pendiente2fa?: { usuarioId: number; restauranteId: number };
  }
}
