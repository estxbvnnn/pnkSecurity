# Pruebas funcionales de QA

Suite de pruebas funcionales (requisito de la 3ra/4ta entrega: "usar IA para generar todas las
pruebas funcionales de QA"), escrita con **Jest + Supertest** contra la app real (`createApp()`
de `src/app.ts`), sin mocks del servidor — solo la base de datos es de pruebas.

## Qué cubren

- `publico.test.ts` — carta pública, validación del id del restaurante, `/health`.
- `auth.test.ts` — login correcto/incorrecto, CSRF, control de acceso al panel admin (VUL-13/VUL-14).
- `carrito.test.ts` — agregar al carrito, checkout real (crea un pedido), carrito vacío.
- `admin.test.ts` — dashboard, crear categoría, validación de foto obligatoria, toggle de carta.
- `rateLimiter.test.ts` — bloqueo tras 5 intentos de login fallidos (VUL-20). Va en su propio
  archivo para no compartir el contador en memoria con `auth.test.ts`.

## Cómo corren

1. `globalSetup.ts` aplica `db/schema.sql` (DROP + CREATE, deja todo limpio) contra una base de
   datos de **pruebas** separada (nunca la real) y siembra un usuario admin y uno cliente.
2. `env.setup.ts` fija las variables de entorno de la base de pruebas ANTES de que la app las lea,
   así nunca hay riesgo de que un test corra contra datos reales.
3. `npm test` (= `jest --runInBand`, en serie para no pisar datos entre tests).

## Variables de entorno (opcionales, para sobreescribir los defaults de pruebas)

`TEST_PGHOST`, `TEST_PGPORT`, `TEST_PGDATABASE`, `TEST_PGUSER`, `TEST_PGPASSWORD`.
Defaults: `127.0.0.1:5432/carta_digital_test`, usuario `carta_test`.
