-- =====================================================================
-- Carta Digital — inicialización completa de PostgreSQL para Docker.
-- Postgres ejecuta este archivo automáticamente en el PRIMER arranque del
-- contenedor (montado en /docker-entrypoint-initdb.d/). Incluye: esquema +
-- datos reales (migrados desde pnk_security/MySQL) + usuarios con hash
-- bcrypt. No requiere ningún paso manual adicional (ni `npm run seed`).
-- =====================================================================

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
  password          VARCHAR(255) NOT NULL,
  estado            VARCHAR(10) DEFAULT '1',
  rol               VARCHAR(20) NOT NULL DEFAULT 'cliente',
  secreto_2fa       VARCHAR(128),
  dosfa_habilitado  BOOLEAN NOT NULL DEFAULT FALSE
);

-- Ventas: un pedido se crea al confirmar el carrito (ver carritoController.confirmar).
CREATE TABLE pedidos (
  id              SERIAL PRIMARY KEY,
  restaurante_id  INTEGER NOT NULL REFERENCES restaurantes(id),
  cliente_nombre  VARCHAR(255) NOT NULL,
  total           INTEGER NOT NULL,
  estado          VARCHAR(20) NOT NULL DEFAULT 'confirmado',
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
-- Datos reales (migrados desde el MySQL de producción pnk_security)
-- =====================================================================
INSERT INTO direcciones (id, calle, numero, comuna, region) VALUES
  (1, 'Los Arandanos', '1550', 'La Serena', 'Coquimbo'),
  (2, 'Avenida Argentina', '951', 'La Serena', 'Coquimbo'),
  (3, 'Balmaceda', '357', 'La Serena', 'Coquimbo'),
  (4, 'Peru', '2255', 'La Serena', 'Coquimbo'),
  (5, 'Miraflores', '36', 'Ovalle', 'Coquimbo'),
  (6, 'Arrayanes', '66', 'La Higuera', 'Coquimbo'),
  (7, 'Casa', '25', 'La Higuera', 'Coquimbo'),
  (8, 'Guatemala', '55', 'La Serena', 'Coquimbo');

INSERT INTO restaurantes (id, rut, nombre, fono, foto, email, direccion_id) VALUES
  (1, '99887766-5', 'Afríca Restobar', '22334455', 'resto1.jpg', 'mail@correo.cl', 2),
  (2, '88776655-4', 'Restaurant la Bahía', '512323232', 'bahia.jpg', 'mail1@correo.cl', 3),
  (3, '22334455-6', 'La Esquina del Sabor', '22334455', 'resto3.jpg', 'mail2@correo.cl', 4),
  (4, '258-3', 'La Pica de Armando', '223366', 'resto4.jpg', 'mail3@correo.cl', 5),
  (5, '258-9', 'Donde Carlos', '336699', 'resto5.jpg', 'mail4@correo.cl', 6),
  (6, '258-6', 'RestoPenka', '336699', 'resto6.jpg', 'mail5@correo.cl', 7),
  (7, '369-5', 'La Pica de Carolina', '336699', 'resto7.jpg', 'mail6@correo.cl', 8);

INSERT INTO cartas (id, nombre, orden, visible, foto, restaurante_id) VALUES
  (1, 'Vinos', 1, TRUE, 'carta2.jpg', 1),
  (2, 'Bebidas', 2, TRUE, 'carta2.jpg', 1),
  (3, 'Entradas', 3, TRUE, 'carta3.jpg', 1),
  (4, 'Principales', 4, TRUE, 'carta6.jpg', 1),
  (5, 'Postres', 5, TRUE, 'carta6.jpg', 1),
  (6, 'Helados', 9, TRUE, 'carta6.jpg', 1),
  (7, 'Pizzas', 6, TRUE, 'carta7.jpg', 1),
  (8, 'Dulces', 7, TRUE, 'carta6.jpg', 1),
  (10, 'Vinos', 1, TRUE, 'carta10.jpg', 2),
  (11, 'Principal', 2, TRUE, 'carta11.jpg', 2),
  (12, 'Comiditas', 2, TRUE, 'carta12.jpg', 2),
  (13, 'Platos', 1, TRUE, NULL, 3),
  (14, 'Comidas', 1, TRUE, NULL, 4),
  (15, 'Carta', 1, TRUE, NULL, 5),
  (16, 'Platos Típicos', 1, TRUE, NULL, 6),
  (17, 'Comida Casera', 1, TRUE, NULL, 7);

INSERT INTO categorias (id, nombre, visible, orden, carta_id) VALUES
  (1, 'Blancos', TRUE, 1, 1),
  (2, 'Tintos', TRUE, 2, 1),
  (3, 'Carnes', TRUE, 1, 4),
  (4, 'Pescados', TRUE, 2, 4),
  (5, 'Mariscos', TRUE, 3, 4),
  (6, 'Pastas', TRUE, 4, 4),
  (7, 'Frías', TRUE, 1, 3),
  (8, 'Calientes', TRUE, 2, 3),
  (9, 'Comida casera', FALSE, 0, 4),
  (10, 'Con Alcohol', TRUE, 0, 2),
  (11, 'Sin Alcohol', TRUE, 2, 2),
  (12, 'Blancos', TRUE, 2, 10),
  (13, 'Tintos', TRUE, 1, 10),
  (14, 'Carnes', TRUE, 1, 11),
  (15, 'Mariscos', TRUE, 1, 12),
  (16, 'Principales', TRUE, 1, 13),
  (17, 'A la Parrilla', TRUE, 1, 14),
  (18, 'Platos de Fondo', TRUE, 1, 15),
  (19, 'Parrilla Criolla', TRUE, 1, 16),
  (20, 'Platos de la Casa', TRUE, 1, 17);

INSERT INTO items (id, nombre, descripcion, tiempo, observaciones, precio, visible, destacado, puntuacion, foto, orden, categoria_id) VALUES
  (1, 'Ensalada Cesar', 'Ensalada con queso', '15 minutos', '', 3500, TRUE, FALSE, 4, 'item1.jpg', 1, 7),
  (2, 'Crema de espinacas', 'Crema a base de espinacas y finas hierbas', '20 minutos', '', 2000, TRUE, TRUE, 4, '598a694e4879774af73912a3f8e38767.jpg', 2, 8),
  (4, 'Pisco Sour', 'Pisco sour casero', '15 minutos', '', 3500, TRUE, FALSE, 0, 'item4.jpg', 0, 10),
  (5, 'Lomo a lo Pobre', 'Lomo con papas fritas, huevo y cebolla', '30 minutos', 'Muy sabroso', 12500, TRUE, TRUE, 5, 'item5.jpg', 1, 3),
  (7, 'Lomo a lo Pobre', 'Lomo a lo Pobre', '20 minutos', 'Rico Lomo a lo Pobre', 9900, TRUE, TRUE, 3, 'item3.jpg', 2, 3),
  (10, 'Vino Blanco de la Casa', 'Sauvignon Blanc fresco, ideal para mariscos', '', NULL, 6500, TRUE, FALSE, 0, 'vino_blanco.jpg', 1, 12),
  (11, 'Vino Tinto Reserva', 'Cabernet Sauvignon con cuerpo, nota a frutos rojos', '', NULL, 7500, TRUE, FALSE, 0, 'vino_tinto.jpg', 1, 13),
  (12, 'Lomo a la Parrilla', 'Lomo vetado a la parrilla con guarnicion a elección', '25 minutos', NULL, 11900, TRUE, FALSE, 5, 'lomo_parrilla.jpg', 1, 14),
  (13, 'Sándwich Barros Luco', 'Sándwich de lomo y queso derretido, pan amasado', '15 minutos', NULL, 5900, TRUE, FALSE, 4, 'sandwich_barros_luco.jpg', 1, 16),
  (14, 'Choripán Armando', 'Chorizo a la parrilla en pan artesanal con pebre', '10 minutos', NULL, 3900, TRUE, FALSE, 5, 'choripan.jpg', 1, 17),
  (15, 'Ceviche de la Bahía', 'Pescado blanco marinado en limón con cebolla morada y cilantro', '15 minutos', NULL, 8900, TRUE, FALSE, 5, 'ceviche.jpg', 1, 15),
  (16, 'Empanada de Pino', 'Empanada horneada, relleno tradicional de pino', '10 minutos', NULL, 2200, TRUE, FALSE, 4, 'empanada_pino.jpg', 1, 16),
  (17, 'Cazuela de Pollo', 'Cazuela casera con pollo, papa, zapallo y choclo', '25 minutos', NULL, 6500, TRUE, FALSE, 4, 'cazuela_pollo.jpg', 1, 16),
  (18, 'Costillar a la Parrilla', 'Costillar de cerdo ahumado a la parrilla con salsa BBQ', '30 minutos', NULL, 9900, TRUE, FALSE, 5, 'costillar.jpg', 1, 17),
  (19, 'Anticuchos Armando', 'Brochetas de carne a la parrilla, estilo criollo', '20 minutos', NULL, 5500, TRUE, FALSE, 4, 'anticuchos.jpg', 1, 17),
  (20, 'Hamburguesa Carlos', 'Hamburguesa con queso cheddar, tocino y papas fritas', '15 minutos', NULL, 6900, TRUE, FALSE, 5, 'hamburguesa.jpg', 1, 18),
  (21, 'Pollo a la Plancha', 'Pechuga de pollo a la plancha con guarnición', '20 minutos', NULL, 6200, TRUE, FALSE, 4, 'pollo_plancha.jpg', 1, 18),
  (22, 'Papas Fritas con Salsas', 'Papas fritas crocantes con salsas a elección', '10 minutos', NULL, 3500, TRUE, FALSE, 3, 'papas_fritas.jpg', 1, 18),
  (23, 'Parrillada Criolla', 'Selección de carnes a la parrilla para compartir', '35 minutos', NULL, 15900, TRUE, FALSE, 5, 'parrillada.jpg', 1, 19),
  (24, 'Empanadas Criollas', 'Empanadas fritas de pino, por unidad', '10 minutos', NULL, 2000, TRUE, FALSE, 4, 'empanadas.jpg', 1, 19),
  (25, 'Cazuela de Ave Penka', 'Cazuela campesina con ave y verduras de estación', '25 minutos', NULL, 6800, TRUE, FALSE, 4, 'cazuela_ave.jpg', 1, 19),
  (26, 'Pollo al Horno Casero', 'Pollo asado al horno con hierbas, estilo casero', '40 minutos', NULL, 7200, TRUE, FALSE, 5, 'pollo_carolina.jpg', 1, 20),
  (27, 'Sopa de Lentejas Casera', 'Lentejas guisadas con verduras, receta de la casa', '25 minutos', NULL, 4500, TRUE, FALSE, 4, 'lentejas_carolina.jpg', 1, 20),
  (28, 'Pastel de Choclo', 'Pastel de choclo tradicional chileno con pino', '35 minutos', NULL, 6500, TRUE, FALSE, 5, 'pastel_choclo_carolina.jpg', 1, 20);

-- Usuarios de prueba (contraseña real: admin01 / alondra01 — hash bcrypt, nunca texto plano).
INSERT INTO usuarios (nombre, email, password, estado, rol) VALUES
  ('Administrador', 'admin@gmail.com', '$2a$12$4KVxXhdbPERGV.Iw92dZDO5Tg6YNLCYkKHUFGHTRdULMMc7p9Wz6a', '1', 'admin'),
  ('Alondra', 'alondra@gmail.com', '$2a$12$.gGFqAX.1NWZDSOofTLWve/AAHlM5KI234DhkjX67SXn1.Y6ZN3H.', '1', 'cliente');

-- Reajusta las secuencias SERIAL (los INSERT de arriba usan IDs explícitos).
SELECT setval(pg_get_serial_sequence('direcciones', 'id'), (SELECT MAX(id) FROM direcciones));
SELECT setval(pg_get_serial_sequence('restaurantes', 'id'), (SELECT MAX(id) FROM restaurantes));
SELECT setval(pg_get_serial_sequence('cartas', 'id'), (SELECT MAX(id) FROM cartas));
SELECT setval(pg_get_serial_sequence('categorias', 'id'), (SELECT MAX(id) FROM categorias));
SELECT setval(pg_get_serial_sequence('items', 'id'), (SELECT MAX(id) FROM items));
