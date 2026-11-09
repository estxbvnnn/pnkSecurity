# Carta Digital — Node.js + Express + TypeScript + PostgreSQL

Reimplementación de la carta digital (3ra/4ta entrega) usando el stack pedido:
**Backend**: Node.js + Express + TypeScript · **Frontend**: TypeScript compilado a JS plano (sin framework), servido por el mismo Express con vistas EJS · **Base de datos**: PostgreSQL.

Misma funcionalidad/gráfica que el proyecto original (ver carta, comentar, agregar al carrito, login/logout), reconstruida con arquitectura **MVC** y las buenas prácticas de seguridad aprendidas en la remediación de `pnkSecurity` (consultas parametrizadas, hash bcrypt, CSRF, cabeceras de seguridad, control de acceso, rate-limit de login).

## Estructura (MVC)

```
src/
├── app.ts / server.ts      ← ensamblado de la app y arranque
├── config/                 ← env, conexión a PostgreSQL (pool)
├── middlewares/             ← sesión, CSRF, cabeceras de seguridad, rate-limit, errores
├── models/                  ← acceso a datos (consultas parametrizadas $1,$2…)
├── controllers/              ← lógica de cada ruta
├── routes/                   ← mapeo URL → controlador
├── views/                    ← plantillas EJS (autoescapadas por defecto, anti-XSS)
├── scripts/seed.ts           ← siembra usuarios con bcrypt
└── public/                   ← estáticos (css/img/vendors) + TS del cliente (public/js/src → compila a public/js/dist)
db/schema.sql                ← esquema Postgres (migrado desde pnk_security.sql)
```

## Requisitos

- Node.js 18+ (probado con Node 24)
- Acceso a un PostgreSQL 15+ (local, Docker, o el ya provisionado en el servidor AWS)

## Puesta en marcha (desarrollo local)

1. `npm install`
2. Copiar `.env.example` → `.env` y completar `PGPASSWORD` (y el resto si aplica).
3. Conectar a una base de datos Postgres:
   - **Opción A — contra el servidor real (más simple para partir ahora)**: abrir un túnel SSH y dejar `.env` apuntando a `127.0.0.1:5432` (ya es el default):
     ```bash
     ssh -i test.pem -L 5432:127.0.0.1:5432 ec2-user@52.0.165.26
     ```
   - **Opción B — Postgres local/Docker** (recomendado cuando se arme el `docker-compose` de los 3 ambientes): levantar un contenedor Postgres propio y apuntar `.env` a él.
4. Cargar el esquema: `psql -h 127.0.0.1 -U carta_app -d carta_digital -f db/schema.sql`
5. Sembrar usuarios de prueba: `npm run seed`
6. Levantar en modo desarrollo: `npm run dev` (recompila TS al vuelo, backend y necesitas compilar el cliente una vez: `npm run build:client`)
7. Abrir `http://localhost:3000/`

## Build de producción

```bash
npm run build     # compila backend (dist/) y cliente (public/js/dist/)
npm start         # node dist/server.js
```

## Credenciales de prueba

| Usuario | Contraseña |
|---|---|
| admin@gmail.com | admin01 |
| alondra@gmail.com | alondra01 |

## Seguridad implementada (de fábrica, no como parche)

- **Sin inyección SQL**: `pg` parametriza todas las consultas ($1, $2…); nunca se concatena input del usuario en el SQL.
- **Contraseñas**: hash bcrypt (`bcryptjs`, costo 12), nunca texto plano.
- **XSS**: EJS escapa automáticamente (`<%= %>`) todo lo que se imprime; no hace falta un helper manual como en PHP.
- **CSRF**: token por sesión, validado en cada POST (formularios y fetch del cliente).
- **Sesión**: cookie `HttpOnly` + `SameSite=Strict` (+ `Secure` si se sirve por HTTPS), respaldada en PostgreSQL (no en memoria).
- **Cabeceras de seguridad**: `helmet` (CSP, X-Frame-Options, X-Content-Type-Options, etc.).
- **Fuerza bruta**: `express-rate-limit` en `/login` (5 intentos / 15 min por IP).
- **Errores**: nunca se devuelve el stack trace ni detalle de SQL al cliente; solo se registra en el servidor.
- **Control de acceso**: comentar requiere sesión iniciada; el autor del comentario se toma de la sesión, no del formulario.

## Estado de la entrega

1. **Dockerizado** (`Dockerfile` + `docker-compose.yml`) con los 3 ambientes (desarrollo, QA, producción) — ✅. Validados automáticamente en GitHub Actions en cada push (`.github/workflows/ambientes.yml`, ver pestaña "Actions" del repo): un job construye y levanta Desarrollo, otro QA (+ corre la suite de pruebas funcionales), y otro valida que la imagen de Producción compile.
2. **Desplegado** en AWS (EC2 de Producción) detrás de un Worker de Cloudflare como capa de seguridad (WAF ligero + rate limiting + bloqueo de bots, ver `cloudflare-worker/README.md`) — ✅.
3. **Jenkins** (en una instancia aparte) con plugins OWASP/MITRE: pipeline Checkout → Build → QA → npm audit → OWASP Dependency-Check → despliegue automático a Producción si pasa los filtros de seguridad — ✅ (`Jenkinsfile`).
