# Informe OWASP Top 10 (2021) — Carta Digital (Node.js + Express + TypeScript + PostgreSQL)

Mismo objetivo que el informe de remediación de `pnkSecurity` (PHP), pero aplicado a esta reimplementación: por cada categoría del OWASP Top 10 se indica **qué control existe**, **dónde está** (archivo:línea) y, si corresponde, **qué riesgo queda documentado como aceptado** por alcance del proyecto.

---

## A01:2021 — Broken Access Control

- Todas las rutas `/admin/*` exigen sesión con `rol = 'admin'`, verificado en el servidor en **cada** petición (nunca se confía en lo que muestre el front-end): `src/middlewares/auth.ts:8` (`requireAdmin`), montado en `src/routes/admin.ts` con `adminRouter.use(requireAdmin)`.
- Las operaciones de edición están **ancladas al tenant** correcto (multi-restaurante): alternar visibilidad de una carta exige `id` Y `restaurante_id` en el `WHERE` (`src/models/cartaModel.ts:62`), evitando que el admin de un restaurante edite datos de otro aunque adivine un ID.
- El 2FA (`secreto_2fa`/`req.session.usuarioId`, ver A07) se verifica siempre contra el usuario de la **sesión**, nunca contra un ID recibido por URL o body (`src/controllers/seguridadController.ts`), evitando que un admin active/desactive 2FA de otra cuenta (IDOR).
- El carrito (`vaciar`) solo borra `req.session.carrito`, nunca la sesión completa — evita el IDOR/DoS de sesión que existía en pnkSecurity (`src/controllers/carritoController.ts`, comentario "equivalente a la corrección de VUL-13").

## A02:2021 — Cryptographic Failures

- Contraseñas con **bcrypt** (costo 12), nunca texto plano ni hash propio: `src/scripts/seed.ts:16`, verificación en `src/controllers/authController.ts:40`.
- Secreto TOTP del 2FA **cifrado en reposo** con AES-256-GCM (clave derivada de `SESSION_SECRET`) antes de guardarse en `usuarios.secreto_2fa` — nunca se almacena en texto plano, aunque técnicamente no es una contraseña: `src/utils/cripto2fa.ts`, usado en `src/models/usuarioModel.ts`.
- Cookie de sesión `HttpOnly` + `SameSite=Strict` (+ `Secure` si `SESSION_SECURE_COOKIE=true`, para cuando se sirva por HTTPS): `src/middlewares/session.ts:23`.
- Comparaciones sensibles (CSRF) con `crypto.timingSafeEqual` para evitar timing attacks: `src/middlewares/csrf.ts`.
- **Riesgo aceptado documentado**: en este entregable el tráfico HTTP del ambiente de desarrollo/QA no va por TLS (se asume que Producción sí, detrás de Cloudflare/AWS en la fase de despliegue). `SESSION_SECURE_COOKIE` queda en `false` en dev/QA y debe pasarse a `true` en producción.

## A03:2021 — Injection

- **100% de las consultas SQL son parametrizadas** (`$1, $2, …` vía el driver `pg`), nunca concatenación de strings con datos del usuario — ejemplo representativo: `src/models/usuarioModel.ts:17,25,38`. Se repite en todos los modelos (`cartaModel`, `categoriaModel`, `itemModel`, `restauranteModel`, `pedidoModel`, `comentarioModel`).
- Las vistas EJS **auto-escapan** por defecto (`<%= %>`); no se usa `<%- %>` (sin escapar) en ningún lado del proyecto — previene XSS reflejado/almacenado (nombres de producto, comentarios, nombre de cliente en pedidos, etc. se muestran siempre escapados).

## A04:2021 — Insecure Design

- Login en **dos pasos** (contraseña + TOTP opcional) para `admin`, con el estado intermedio guardado solo en sesión (`req.session.pendiente2fa`) — el diseño evita completar la sesión autenticada hasta validar ambos factores: `src/controllers/authController.ts`.
- Validación y normalización server-side de **todo** input de formularios antes de tocar la base de datos (`idValido`, `parsearItemInput`, `parsearRestauranteInput`), nunca se confía en validación solo del cliente.
- Borrado lógico (soft delete, columna `eliminado`/`eliminada`) en vez de `DELETE` físico para ítems/restaurantes — permite auditar y revertir, reduce el impacto de un borrado accidental o malicioso.
- Subida de fotos con nombre de archivo aleatorio (nunca el nombre original) y carpeta de destino calculada por el servidor, no por el cliente: `src/middlewares/upload.ts`.

## A05:2021 — Security Misconfiguration

- Cabeceras de seguridad centralizadas con `helmet` (CSP `script-src 'self'`, `X-Frame-Options`, `X-Content-Type-Options`, etc.): `src/middlewares/security.ts:9`.
- `X-Powered-By` deshabilitado para no anunciar la tecnología/versión del servidor: `src/app.ts:13`.
- Manejador de errores genérico: nunca se devuelve el stack trace ni detalles internos al cliente (`src/middlewares/errorHandler.ts`); los detalles solo van a `console.error` en el servidor.
- `.env` nunca se versiona (`.gitignore`); se distribuye como `.env.example`/`.env.docker.example` sin valores reales.
- Contenedor Docker corre con **usuario no-root** (`cartaapp`), reduciendo el impacto de un RCE dentro del contenedor: `Dockerfile`.
- **Pendiente para la fase de despliegue**: cuando la app quede detrás de un proxy/Cloudflare, agregar `app.set('trust proxy', 1)` para que `req.ip` (usado en rate-limit y en el log de seguridad, ver A09) refleje la IP real del cliente y no la del proxy.

## A06:2021 — Vulnerable and Outdated Components

- Dependencias fijadas con `package-lock.json` (instalación reproducible, `npm ci` en el build de Docker).
- `npm audit` (dependencias de producción) reporta 4 vulnerabilidades moderadas, todas en la **cadena de build de `ejs`** (`jake → filelist → minimatch`, ReDoS en `minimatch`) — es decir, una dependencia que `ejs` usa para compilarse a sí mismo, **no** código que se ejecute en el camino de una petición HTTP de este servidor. Se evaluó `npm audit fix --force` (salta a `ejs@7`, breaking change de la API de templates) y se decidió **no aplicarlo sin pruebas de regresión completas** tan cerca de la entrega; queda documentado como riesgo de bajo impacto real y pendiente de actualizar en una ventana de mantenimiento.
- Imagen base `node:20-alpine` / `postgres:17-alpine` (versiones soportadas, superficie reducida de Alpine).

## A07:2021 — Identification and Authentication Failures

- `bcrypt` para contraseñas (ver A02) + **segundo factor TOTP (2FA)** opcional para cuentas `admin`, con enrolamiento vía código QR y confirmación del primer código antes de activarlo: `src/controllers/seguridadController.ts`, vista `src/views/admin/seguridad.ejs`.
- `req.session.regenerate()` en cada login exitoso (password y, si aplica, 2FA) — previene *session fixation*: `src/controllers/authController.ts:15` y en `verificar2fa`.
- Rate limiting de intentos de login: 5 intentos / 15 min por IP, también aplicado al paso de verificación del código 2FA (evita fuerza bruta de 6 dígitos): `src/middlewares/rateLimiter.ts:11`, usado en `POST /login` y `POST /login/2fa` (`src/routes/index.ts`).
- Ningún endpoint ni log expone contraseñas ni códigos 2FA en texto plano (ver A09).

## A08:2021 — Software and Data Integrity Failures

- `npm ci` (no `npm install`) en el build de Docker: instala exactamente lo que dice `package-lock.json`, sin resolución de versiones "sorpresa".
- Subida de archivos con **whitelist doble** (extensión Y MIME type deben coincidir) y límite de tamaño (5 MB): `src/middlewares/upload.ts`. Evita subir un `.php`/`.js` disfrazado de imagen.
- Build multi-stage de Docker: la imagen final de producción no contiene el código fuente TypeScript ni `devDependencies`, solo `dist/` + dependencias de producción.

## A09:2021 — Security Logging and Monitoring Failures

- Se agregó un **registro estructurado de eventos de seguridad** (`src/utils/logSeguridad.ts`), que nunca registra contraseñas, códigos 2FA ni tokens — solo metadatos (IP, usuario, evento, timestamp). Eventos cubiertos:
  - `login_fallido`, `login_exitoso`, `login_password_ok_esperando_2fa`, `login_exitoso_2fa`, `2fa_codigo_invalido` (`src/controllers/authController.ts`).
  - `2fa_activado`, `2fa_desactivado` (`src/controllers/seguridadController.ts`).
  - `admin_item_eliminado`, `admin_restaurante_creado`, `admin_restaurante_actualizado` (`src/controllers/adminController.ts`, `src/controllers/restauranteAdminController.ts`).
- En Docker estos eventos quedan disponibles con `docker compose logs app-<ambiente>` (van a stderr, `console.warn`), sin necesidad de infraestructura adicional para este entregable.
- **Riesgo aceptado documentado**: no hay alertas automáticas (correo/Slack) ni un SIEM — para un proyecto de este tamaño se consideró suficiente dejar el registro estructurado, listo para conectarse a una herramienta externa en un entregable futuro.

## A10:2021 — Server-Side Request Forgery (SSRF)

- No aplica: la aplicación no realiza peticiones salientes a URLs provistas por el usuario (no hay "importar desde URL", webhooks salientes, ni proxies). Se documenta como **no aplicable** en vez de omitirlo, para dejar explícito que se evaluó.

---

## Resumen de brechas cerradas en esta fase (antes no existían)

1. **2FA/TOTP para administradores** (A04/A07) — no existía ningún segundo factor.
2. **Cifrado en reposo del secreto 2FA** (A02) — se agregó junto con el punto anterior, para no introducir un secreto sensible nuevo en texto plano.
3. **Registro de eventos de seguridad** (A09) — no existía ningún log de intentos de login, 2FA ni acciones administrativas destructivas.
4. **CSRF token faltante en la vista del carrito** (A01, variante de *missing function-level access control*): `src/views/carrito.ejs` nunca tuvo `<meta name="csrf-token">`, por lo que las llamadas AJAX a `/carrito/eliminar` y `/carrito/vaciar` iban con el token vacío. Corregido junto con la nueva pantalla de checkout.
