import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/config/db";
import { csrfDeApi } from "./helpers";

const app = createApp();

describe("Autenticación y control de acceso", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("login con credenciales válidas responde ok y crea sesión", async () => {
    const agent = request.agent(app);
    const csrf = await csrfDeApi(agent);

    const res = await agent
      .post("/api/login")
      .set("X-CSRF-Token", csrf)
      .send({ email: "admin@test.local", password: "admin01" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, nombre: "Admin QA", rol: "admin" });
    expect(typeof res.body.csrfToken).toBe("string");
  });

  it("login con contraseña incorrecta responde 401 (no revela si el email existe)", async () => {
    const agent = request.agent(app);
    const csrf = await csrfDeApi(agent);

    const res = await agent
      .post("/api/login")
      .set("X-CSRF-Token", csrf)
      .send({ email: "admin@test.local", password: "incorrecta" });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it("POST /api/login sin token CSRF es rechazado con 403 (equivalente VUL-14)", async () => {
    const agent = request.agent(app);
    await csrfDeApi(agent); // solo para que haya sesión con csrfToken generado

    const res = await agent.post("/api/login").send({ email: "admin@test.local", password: "admin01" });

    expect(res.status).toBe(403);
  });

  it("acceder a /admin sin sesión devuelve 403 (equivalente VUL-13)", async () => {
    const res = await request(app).get("/admin");
    expect(res.status).toBe(403);
  });

  it("un usuario autenticado pero sin rol admin no puede entrar a /admin", async () => {
    const agent = request.agent(app);
    const csrf = await csrfDeApi(agent);
    await agent.post("/api/login").set("X-CSRF-Token", csrf).send({ email: "cliente@test.local", password: "cliente01" });

    const res = await agent.get("/admin");
    expect(res.status).toBe(403);
  });

  it("logout destruye la sesión (ya no se puede entrar a /admin después)", async () => {
    const agent = request.agent(app);
    const csrf = await csrfDeApi(agent);
    const login = await agent
      .post("/api/login")
      .set("X-CSRF-Token", csrf)
      .send({ email: "admin@test.local", password: "admin01" });

    // El login regenera la sesión (y con ella el csrfToken) — hay que usar
    // el token nuevo que devuelve la respuesta, no el de antes de loguearse.
    await agent.post("/api/logout").set("X-CSRF-Token", login.body.csrfToken);
    const res = await agent.get("/admin");
    expect(res.status).toBe(403);
  });
});
