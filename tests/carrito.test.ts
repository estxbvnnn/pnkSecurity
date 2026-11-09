import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/config/db";
import { csrfDeMeta, csrfDeFormulario } from "./helpers";

const app = createApp();

describe("Carrito y checkout", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("agregar un producto válido al carrito responde ok con su posición", async () => {
    const agent = request.agent(app);
    const home = await agent.get("/restaurante/1");
    const csrf = csrfDeMeta(home.text);

    const res = await agent
      .post("/carrito/agregar")
      .set("X-CSRF-Token", csrf)
      .send({ itemId: 1, csrfToken: csrf });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, posicion: 1 });
  });

  it("agregar un producto inexistente devuelve 404", async () => {
    const agent = request.agent(app);
    const home = await agent.get("/restaurante/1");
    const csrf = csrfDeMeta(home.text);

    const res = await agent
      .post("/carrito/agregar")
      .set("X-CSRF-Token", csrf)
      .send({ itemId: 999999, csrfToken: csrf });

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it("confirmar el carrito crea un pedido real y lo vacía", async () => {
    const agent = request.agent(app);
    const home = await agent.get("/restaurante/1");
    const csrfMeta = csrfDeMeta(home.text);

    await agent.post("/carrito/agregar").set("X-CSRF-Token", csrfMeta).send({ itemId: 1, csrfToken: csrfMeta });

    const carrito = await agent.get("/carrito");
    expect(carrito.text).toContain("Ensalada Cesar");
    const csrfForm = csrfDeFormulario(carrito.text);

    const confirmar = await agent.post("/carrito/confirmar").type("form").send({ csrfToken: csrfForm });
    expect(confirmar.status).toBe(200);
    expect(confirmar.text).toContain("Pedido confirmado");

    // El carrito debe quedar vacío después de confirmar (no se puede duplicar el pedido).
    const carritoVacio = await agent.get("/carrito");
    expect(carritoVacio.text).toContain("Tu carrito está vacío");
  });

  it("un carrito con ítems de 2 restaurantes distintos crea un pedido separado por cada restaurante", async () => {
    const agent = request.agent(app);
    const home = await agent.get("/restaurante/1");
    const csrfMeta = csrfDeMeta(home.text);

    // Ítem 1 (Ensalada Cesar) es del restaurante 1; ítem 3 (Ceviche) es del
    // restaurante 2 — se agregan los dos al mismo carrito de sesión.
    await agent.post("/carrito/agregar").set("X-CSRF-Token", csrfMeta).send({ itemId: 1, csrfToken: csrfMeta });
    await agent.post("/carrito/agregar").set("X-CSRF-Token", csrfMeta).send({ itemId: 3, csrfToken: csrfMeta });

    const carrito = await agent.get("/carrito");
    expect(carrito.text).toContain("Ensalada Cesar");
    expect(carrito.text).toContain("Ceviche");
    expect(carrito.text).toContain("restaurantes distintos");
    const csrfForm = csrfDeFormulario(carrito.text);

    const confirmar = await agent.post("/carrito/confirmar").type("form").send({ csrfToken: csrfForm });
    expect(confirmar.status).toBe(200);
    expect(confirmar.text).toContain("¡Pedidos confirmados!");

    const { rows } = await pool.query(
      `SELECT p.restaurante_id, dp.nombre
         FROM pedidos p
         JOIN detalle_pedido dp ON dp.pedido_id = p.id
        WHERE p.creado > NOW() - INTERVAL '1 minute'
        ORDER BY p.id DESC
        LIMIT 2`
    );
    const porRestaurante = new Map(rows.map((r) => [r.nombre, r.restaurante_id]));
    expect(porRestaurante.get("Ensalada Cesar")).toBe(1);
    expect(porRestaurante.get("Ceviche")).toBe(2);
  });

  it("confirmar un carrito vacío no crea un pedido (validación server-side: la vista ni siquiera muestra el botón)", async () => {
    const agent = request.agent(app);
    await agent.get("/restaurante/1");
    const carrito = await agent.get("/carrito");
    expect(carrito.text).toContain("Tu carrito está vacío");
    // La vista no renderiza el formulario de confirmar cuando el carrito está
    // vacío (no hay botón que mostrar) — el token se saca del <meta>, que sí
    // está siempre presente, para probar igual la validación del servidor.
    const csrf = csrfDeMeta(carrito.text);

    const res = await agent.post("/carrito/confirmar").type("form").send({ csrfToken: csrf });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=vacio");
  });
});
