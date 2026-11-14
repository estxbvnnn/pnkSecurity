import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/config/db";
import { csrfDeApi } from "./helpers";

const app = createApp();

describe("Carrito y checkout", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("agregar un producto válido al carrito responde ok con su posición", async () => {
    const agent = request.agent(app);
    const csrf = await csrfDeApi(agent);

    const res = await agent.post("/api/carrito/agregar").set("X-CSRF-Token", csrf).send({ itemId: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, posicion: 1 });
  });

  it("agregar un producto inexistente devuelve 404", async () => {
    const agent = request.agent(app);
    const csrf = await csrfDeApi(agent);

    const res = await agent.post("/api/carrito/agregar").set("X-CSRF-Token", csrf).send({ itemId: 999999 });

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it("confirmar el carrito crea un pedido real y lo vacía", async () => {
    const agent = request.agent(app);
    const csrf = await csrfDeApi(agent);

    await agent.post("/api/carrito/agregar").set("X-CSRF-Token", csrf).send({ itemId: 1 });

    const carrito = await agent.get("/api/carrito");
    expect(carrito.body.carrito.map((i: { nombre: string }) => i.nombre)).toContain("Ensalada Cesar");

    const confirmar = await agent.post("/api/carrito/confirmar").set("X-CSRF-Token", csrf);
    expect(confirmar.status).toBe(200);
    expect(confirmar.body.pedidos).toHaveLength(1);

    // El carrito debe quedar vacío después de confirmar (no se puede duplicar el pedido).
    const carritoVacio = await agent.get("/api/carrito");
    expect(carritoVacio.body.carrito).toEqual([]);
  });

  it("un carrito con ítems de 2 restaurantes distintos crea un pedido separado por cada restaurante", async () => {
    const agent = request.agent(app);
    const csrf = await csrfDeApi(agent);

    // Ítem 1 (Ensalada Cesar) es del restaurante 1; ítem 3 (Ceviche) es del
    // restaurante 2 — se agregan los dos al mismo carrito de sesión.
    await agent.post("/api/carrito/agregar").set("X-CSRF-Token", csrf).send({ itemId: 1 });
    await agent.post("/api/carrito/agregar").set("X-CSRF-Token", csrf).send({ itemId: 3 });

    const carrito = await agent.get("/api/carrito");
    const nombres = carrito.body.carrito.map((i: { nombre: string }) => i.nombre);
    expect(nombres).toContain("Ensalada Cesar");
    expect(nombres).toContain("Ceviche");

    const confirmar = await agent.post("/api/carrito/confirmar").set("X-CSRF-Token", csrf);
    expect(confirmar.status).toBe(200);
    expect(confirmar.body.pedidos).toHaveLength(2);

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

  it("confirmar un carrito vacío responde 400 (validación server-side)", async () => {
    const agent = request.agent(app);
    const csrf = await csrfDeApi(agent);

    const carrito = await agent.get("/api/carrito");
    expect(carrito.body.carrito).toEqual([]);

    const res = await agent.post("/api/carrito/confirmar").set("X-CSRF-Token", csrf);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("carrito_vacio");
  });
});
