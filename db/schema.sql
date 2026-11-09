-- =====================================================================
-- Carta Digital — esquema PostgreSQL
-- Migrado desde Script_BD/pnk_security.sql (MySQL) del proyecto pnkSecurity (PHP).
-- Cambios respecto al original: tipos nativos de Postgres (SERIAL, BOOLEAN,
-- TIMESTAMP), nombres de columnas en snake_case consistente, FKs explícitas.
-- Las contraseñas NO se siembran aquí: ver src/scripts/seed.ts (bcrypt).
-- =====================================================================

DROP TABLE IF EXISTS detalle_pedido CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS comentarios CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS cartas CASCADE;
DROP TABLE IF EXISTS restaurantes CASCADE;
DROP TABLE IF EXISTS direcciones CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE direcciones (
  id          SERIAL PRIMARY KEY,
  calle       VARCHAR(100) NOT NULL,
  numero      VARCHAR(15)  NOT NULL,
  comuna      VARCHAR(100) NOT NULL,
  region      VARCHAR(100),
  creado      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado TIMESTAMP,
  eliminado   TIMESTAMP
);

CREATE TABLE restaurantes (
  id            SERIAL PRIMARY KEY,
  rut           VARCHAR(11)  NOT NULL,
  nombre        VARCHAR(200) NOT NULL,
  fono          VARCHAR(45)  NOT NULL,
  mapa          VARCHAR(200),
  foto          VARCHAR(200),
  email         VARCHAR(100),
  creado        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado   TIMESTAMP,
  eliminado     TIMESTAMP,
  direccion_id  INTEGER NOT NULL REFERENCES direcciones(id)
);

CREATE TABLE cartas (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(45),
  orden           INTEGER,
  visible         BOOLEAN DEFAULT TRUE,
  foto            VARCHAR(200),
  creada          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizada     TIMESTAMP,
  eliminada       TIMESTAMP,
  restaurante_id  INTEGER NOT NULL REFERENCES restaurantes(id)
);

CREATE TABLE categorias (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  visible     BOOLEAN DEFAULT FALSE,
  foto        VARCHAR(200),
  orden       INTEGER,
  creado      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado TIMESTAMP,
  eliminado   TIMESTAMP,
  carta_id    INTEGER NOT NULL REFERENCES cartas(id)
);

CREATE TABLE items (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  descripcion   VARCHAR(300),
  tiempo        VARCHAR(100),
  observaciones VARCHAR(300),
  precio        INTEGER,
  visible       BOOLEAN DEFAULT FALSE,
  destacado     BOOLEAN DEFAULT FALSE,
  puntuacion    INTEGER DEFAULT 0,
  foto          VARCHAR(200),
  orden         INTEGER,
  creado        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado   TIMESTAMP,
  eliminado     TIMESTAMP,
  categoria_id  INTEGER NOT NULL REFERENCES categorias(id)
);

CREATE TABLE comentarios (
  id              SERIAL PRIMARY KEY,
  usuario         VARCHAR(255) NOT NULL,
  comentario      TEXT NOT NULL,
  restaurante_id  INTEGER NOT NULL REFERENCES restaurantes(id),
  creado          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
  id                SERIAL PRIMARY KEY,
  nombre            VARCHAR(255) NOT NULL,
  email             VARCHAR(255) NOT NULL UNIQUE,
  password          VARCHAR(255) NOT NULL,  -- hash bcrypt, nunca texto plano
  estado            VARCHAR(10) DEFAULT '1',
  rol               VARCHAR(20) NOT NULL DEFAULT 'cliente',  -- 'admin' | 'cliente'
  secreto_2fa       VARCHAR(128),            -- secreto TOTP cifrado (AES-256-GCM), NULL si no ha activado 2FA
  dosfa_habilitado  BOOLEAN NOT NULL DEFAULT FALSE
);

-- Ventas: un pedido se crea al confirmar el carrito (ver carritoController.confirmar).
-- nombre/precio en detalle_pedido quedan "congelados" al momento de la venta,
-- para que el historial de ventas no cambie si el producto se edita o elimina después.
CREATE TABLE pedidos (
  id              SERIAL PRIMARY KEY,
  restaurante_id  INTEGER NOT NULL REFERENCES restaurantes(id),
  cliente_nombre  VARCHAR(255) NOT NULL,
  total           INTEGER NOT NULL,
  estado          VARCHAR(20) NOT NULL DEFAULT 'confirmado', -- 'revision' | 'confirmado' | 'entregado' | 'cancelado'
  creado          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detalle_pedido (
  id         SERIAL PRIMARY KEY,
  pedido_id  INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  item_id    INTEGER REFERENCES items(id) ON DELETE SET NULL,
  nombre     VARCHAR(100) NOT NULL,
  precio     INTEGER NOT NULL,
  cantidad   INTEGER NOT NULL DEFAULT 1
);

-- =====================================================================
-- Datos de ejemplo (equivalentes a los del proyecto original pnkSecurity)
-- =====================================================================
INSERT INTO direcciones (calle, numero, comuna, region) VALUES
  ('Los Arandanos', '1550', 'La Serena', 'Coquimbo');

INSERT INTO restaurantes (rut, nombre, fono, foto, email, direccion_id) VALUES
  ('99887766-5', 'Afríca Restobar', '22334455', 'resto1.jpg', 'mail@correo.cl', 1),
  ('11223344-6', 'Bahía Restaurant', '22998877', 'resto2.jpg', 'mail2@correo.cl', 1);

INSERT INTO cartas (nombre, orden, visible, foto, restaurante_id) VALUES
  ('Entradas', 1, TRUE, 'carta3.jpg', 1),
  ('Principales', 2, TRUE, 'carta6.jpg', 1),
  ('Carta', 1, TRUE, 'carta7.jpg', 2);

INSERT INTO categorias (nombre, visible, orden, carta_id) VALUES
  ('Frías', TRUE, 1, 1),
  ('Carnes', TRUE, 1, 2),
  ('Mariscos', TRUE, 1, 3);

INSERT INTO items (nombre, descripcion, tiempo, precio, visible, destacado, puntuacion, foto, categoria_id) VALUES
  ('Ensalada Cesar', 'Ensalada con queso', '15 minutos', 3500, TRUE, FALSE, 4, 'item1.jpg', 1),
  ('Lomo a lo Pobre', 'Lomo con papas fritas, huevo y cebolla', '30 minutos', 12500, TRUE, TRUE, 5, 'item5.jpg', 2),
  ('Ceviche', 'Ceviche de pescado fresco', '20 minutos', 7500, TRUE, FALSE, 4, 'item2.jpg', 3);

-- Los usuarios (admin@gmail.com / alondra@gmail.com) se crean con `npm run seed`
-- (hashea las contraseñas con bcrypt antes de insertarlas).
