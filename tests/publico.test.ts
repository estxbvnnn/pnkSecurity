import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/config/db";

const app = createApp();

describe("Carta pública", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("GET / lista los restaurantes activos", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Afríca Restobar");
  });

  it("GET /restaurante/:id muestra la carta de un restaurante válido", async () => {
    const res = await request(app).get("/restaurante/1");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Ensalada Cesar");
  });

  it("GET /restaurante/:id con id inexistente devuelve 404", async () => {
    const res = await request(app).get("/restaurante/9999");
    expect(res.status).toBe(404);
  });

  it("GET /restaurante/:id con id no numérico devuelve 404 (no 500 ni refleja el valor crudo)", async () => {
    const res = await request(app).get("/restaurante/abc");
    expect(res.status).toBe(404);
  });

  it("GET /health responde ok (usado por el healthcheck de Docker)", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
