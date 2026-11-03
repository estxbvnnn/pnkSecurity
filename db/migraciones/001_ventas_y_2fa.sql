-- Migración incremental para una base de datos YA desplegada con el esquema
-- original (previo a ventas/2FA) — p. ej. el Postgres real de producción,
-- que se creó antes de que estas tablas/columnas existieran. Los despliegues
-- NUEVOS no necesitan este archivo: db/init.sql (Docker) y db/schema.sql ya
-- incluyen todo desde cero. Es seguro ejecutarla más de una vez (IF NOT EXISTS).

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS secreto_2fa VARCHAR(128);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dosfa_habilitado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS pedidos (
  id              SERIAL PRIMARY KEY,
  restaurante_id  INTEGER NOT NULL REFERENCES restaurantes(id),
  cliente_nombre  VARCHAR(255) NOT NULL,
  total           INTEGER NOT NULL,
  estado          VARCHAR(20) NOT NULL DEFAULT 'confirmado',
  creado          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detalle_pedido (
  id         SERIAL PRIMARY KEY,
  pedido_id  INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  item_id    INTEGER REFERENCES items(id) ON DELETE SET NULL,
  nombre     VARCHAR(100) NOT NULL,
  precio     INTEGER NOT NULL,
  cantidad   INTEGER NOT NULL DEFAULT 1
);
