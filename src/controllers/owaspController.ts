import { Request, Response } from "express";

/**
 * Mapeo OWASP Top 10 (2021) mostrado dentro del propio panel de admin,
 * además del informe en docs/OWASP.md. Contenido estático y propio del
 * proyecto (no viene de ningún input de usuario), por eso se permite un
 * formato inline simple (negrita/código) sin depender de una librería de
 * markdown.
 */
interface SeccionOwasp {
  codigo: string;
  titulo: string;
  icono: string;
  puntos: string[];
  riesgoAceptado?: string;
}

const SECCIONES: SeccionOwasp[] = [
  {
    codigo: "A01:2021",
    titulo: "Broken Access Control",
    icono: "ti-lock",
    puntos: [
      "Todas las rutas `/admin/*` exigen sesión con `rol = 'admin'`, verificado en el servidor en **cada** petición: `middlewares/auth.ts` (`requireAdmin`).",
      "Las operaciones de edición están **ancladas al restaurante correcto** (multi-tenant): alternar visibilidad de una carta exige `id` Y `restaurante_id` en el `WHERE` (`models/cartaModel.ts`).",
      "El 2FA se verifica siempre contra el usuario de la **sesión**, nunca contra un id recibido por URL o body (`controllers/seguridadController.ts`) — evita que un admin active/desactive 2FA de otra cuenta.",
      "El carrito (`vaciar`) solo borra `req.session.carrito`, nunca la sesión completa.",
    ],
  },
  {
    codigo: "A02:2021",
    titulo: "Cryptographic Failures",
    icono: "ti-key",
    puntos: [
      "Contraseñas con **bcrypt** (costo 12), nunca texto plano: `scripts/seed.ts`, verificación en `controllers/authController.ts`.",
      "Secreto TOTP del 2FA **cifrado en reposo** con AES-256-GCM antes de guardarse en `usuarios.secreto_2fa`: `utils/cripto2fa.ts`.",
      "Cookie de sesión `HttpOnly` + `SameSite=Strict` (+ `Secure` si hay HTTPS): `middlewares/session.ts`.",
      "Comparaciones de CSRF con `crypto.timingSafeEqual` (sin diferencias de tiempo): `middlewares/csrf.ts`.",
    ],
    riesgoAceptado:
      "El tráfico HTTP de dev/QA no va por TLS (se asume que Producción sí, detrás de Cloudflare/AWS). `SESSION_SECURE_COOKIE` debe pasar a `true` en producción.",
  },
  {
    codigo: "A03:2021",
    titulo: "Injection",
    icono: "ti-alert",
    puntos: [
      "**100% de las consultas SQL son parametrizadas** (`$1, $2, …` vía `pg`), nunca concatenación de strings con datos del usuario — en todos los modelos.",
      "Las vistas EJS **auto-escapan** por defecto (`<%= %>`); no se usa `<%- %>` sin escapar en ningún lado — previene XSS reflejado/almacenado.",
    ],
  },
  {
    codigo: "A04:2021",
    titulo: "Insecure Design",
    icono: "ti-ruler-pencil",
    puntos: [
      "Login en **dos pasos** (contraseña + TOTP opcional) para admin, con el estado intermedio solo en sesión (`req.session.pendiente2fa`).",
      "Validación y normalización server-side de todo input de formularios (`idValido`, `parsearItemInput`, `parsearRestauranteInput`).",
      "Borrado lógico (columna `eliminado`/`eliminada`) en vez de `DELETE` físico para ítems/restaurantes.",
      "Subida de fotos con nombre de archivo aleatorio y carpeta de destino calculada por el servidor: `middlewares/upload.ts`.",
    ],
  },
  {
    codigo: "A05:2021",
    titulo: "Security Misconfiguration",
    icono: "ti-settings",
    puntos: [
      "Cabeceras de seguridad centralizadas con `helmet` (CSP, X-Frame-Options, X-Content-Type-Options, etc.): `middlewares/security.ts`.",
      "`X-Powered-By` deshabilitado: `app.ts`.",
      "Manejador de errores genérico, nunca stack traces al cliente: `middlewares/errorHandler.ts`.",
      "`.env` nunca se versiona; se distribuye como `.env.example`/`.env.docker.example`.",
      "Contenedor Docker corre con **usuario no-root** (`cartaapp`): `Dockerfile`.",
    ],
    riesgoAceptado:
      "Al desplegar detrás de un proxy/Cloudflare, falta agregar `app.set('trust proxy', 1)` para que `req.ip` (rate-limit y log de seguridad) refleje la IP real del cliente.",
  },
  {
    codigo: "A06:2021",
    titulo: "Vulnerable and Outdated Components",
    icono: "ti-package",
    puntos: [
      "Dependencias fijadas con `package-lock.json`; `npm ci` (no `npm install`) en el build de Docker.",
      "`npm audit` reporta 4 vulnerabilidades moderadas, todas en la cadena de build de `ejs` (`jake → filelist → minimatch`) — no es código que se ejecute en el camino de una petición HTTP.",
      "Imagen base `node:20-alpine` / `postgres:17-alpine`.",
    ],
    riesgoAceptado:
      "Se evaluó `npm audit fix --force` (salta a ejs@7, breaking change) y se decidió no aplicarlo sin pruebas de regresión completas; queda pendiente para una ventana de mantenimiento.",
  },
  {
    codigo: "A07:2021",
    titulo: "Identification and Authentication Failures",
    icono: "ti-id-badge",
    puntos: [
      "bcrypt para contraseñas + **segundo factor TOTP (2FA)** opcional para admin, con QR y confirmación del primer código antes de activarlo: `controllers/seguridadController.ts`.",
      "`req.session.regenerate()` en cada login exitoso (password y 2FA) — previene session fixation.",
      "Rate limiting de login: 5 intentos / 15 min por IP, también en la verificación del código 2FA: `middlewares/rateLimiter.ts`.",
    ],
  },
  {
    codigo: "A08:2021",
    titulo: "Software and Data Integrity Failures",
    icono: "ti-harddrive",
    puntos: [
      "`npm ci` instala exactamente lo que dice `package-lock.json`.",
      "Subida de archivos con whitelist doble (extensión Y MIME) y límite de 5 MB: `middlewares/upload.ts`.",
      "Build multi-stage de Docker: la imagen final no contiene el código TypeScript ni `devDependencies`.",
    ],
  },
  {
    codigo: "A09:2021",
    titulo: "Security Logging and Monitoring Failures",
    icono: "ti-eye",
    puntos: [
      "Registro estructurado de eventos de seguridad (`utils/logSeguridad.ts`), nunca con contraseñas/códigos/tokens: login fallido/exitoso, 2FA, acciones administrativas destructivas.",
      "En Docker, disponible con `docker compose logs app-<ambiente>`.",
    ],
    riesgoAceptado: "No hay alertas automáticas (correo/Slack) ni un SIEM — queda como mejora futura.",
  },
  {
    codigo: "A10:2021",
    titulo: "Server-Side Request Forgery (SSRF)",
    icono: "ti-server",
    puntos: ["No aplica: la aplicación no realiza peticiones salientes a URLs provistas por el usuario."],
  },
];

const BRECHAS_CERRADAS = [
  "2FA/TOTP para administradores (A04/A07) — no existía ningún segundo factor.",
  "Cifrado en reposo del secreto 2FA (A02) — para no introducir un secreto sensible nuevo en texto plano.",
  "Registro de eventos de seguridad (A09) — no existía ningún log de intentos de login, 2FA ni acciones administrativas destructivas.",
  "CSRF token faltante en la vista del carrito (A01) — `carrito.ejs` nunca tuvo `<meta name=\"csrf-token\">`, corregido junto con la pantalla de checkout.",
];

/** Convierte **negrita** y `código` a HTML seguro (el texto de origen es fijo, no viene de un usuario). */
function formatearInline(texto: string): string {
  const escapado = texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escapado
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

export function mostrarOwasp(_req: Request, res: Response): void {
  const secciones = SECCIONES.map((s, i) => ({
    ...s,
    indice: i + 1,
    puntosHtml: s.puntos.map(formatearInline),
    riesgoAceptadoHtml: s.riesgoAceptado ? formatearInline(s.riesgoAceptado) : null,
  }));
  const stats = {
    categorias: secciones.length,
    controles: secciones.reduce((acc, s) => acc + s.puntos.length, 0),
    pendientes: secciones.filter((s) => s.riesgoAceptado).length,
    brechas: BRECHAS_CERRADAS.length,
  };
  res.render("admin/owasp", {
    secciones,
    stats,
    brechasCerradas: BRECHAS_CERRADAS.map(formatearInline),
  });
}
