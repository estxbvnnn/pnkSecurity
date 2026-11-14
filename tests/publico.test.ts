import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/config/db";

const app = createApp();

describe("API pública (carta)", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("GET /api/restaurantes lista los restaurantes activos", async () => {
    const res = await request(app).get("/api/restaurantes");
    expect(res.status).toBe(200);
    expect(res.body.restaurantes.map((r: { nombre: string }) => r.nombre)).toContain("Afríca Restobar");
  });

  it("GET /api/restaurantes/:slug muestra la carta de un restaurante válido", async () => {
    const res = await request(app).get("/api/restaurantes/africarestobar");
    expect(res.status).toBe(200);
    const nombres = res.body.secciones.flatMap((s: { categoriasConItems: { items: { nombre: string }[] }[] }) =>
      s.categoriasConItems.flatMap((c) => c.items.map((i) => i.nombre))
    );
    expect(nombres).toContain("Ensalada Cesar");
  });

  it("GET /api/restaurantes/:slug con slug inexistente devuelve 404", async () => {
    const res = await request(app).get("/api/restaurantes/noexiste");
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it("GET /health responde ok (usado por el healthcheck de Docker)", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
