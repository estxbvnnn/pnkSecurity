import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/config/db";
import { csrfDeFormulario } from "./helpers";

const app = createApp();

describe("Autenticación y control de acceso", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("login con credenciales válidas redirige a la carta y crea sesión", async () => {
    const agent = request.agent(app);
    const home = await agent.get("/restaurante/1");
    const csrf = csrfDeFormulario(home.text);

    const res = await agent
      .post("/login")
      .type("form")
      .send({ email: "admin@test.local", password: "admin01", csrfToken: csrf });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/restaurante/1");
  });

  it("login con contraseña incorrecta redirige con ?login=error (no revela si el email existe)", async () => {
    const agent = request.agent(app);
    const home = await agent.get("/restaurante/1");
    const csrf = csrfDeFormulario(home.text);

    const res = await agent
      .post("/login")
      .type("form")
      .send({ email: "admin@test.local", password: "incorrecta", csrfToken: csrf });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("login=error");
  });

  it("POST /login sin token CSRF es rechazado con 403 (equivalente VUL-14)", async () => {
    const agent = request.agent(app);
    await agent.get("/restaurante/1");

    const res = await agent
      .post("/login")
      .type("form")
      .send({ email: "admin@test.local", password: "admin01" });

    expect(res.status).toBe(403);
  });

  it("acceder a /admin sin sesión devuelve 403 (equivalente VUL-13)", async () => {
    const res = await request(app).get("/admin");
    expect(res.status).toBe(403);
  });

  it("un usuario autenticado pero sin rol admin no puede entrar a /admin", async () => {
    const agent = request.agent(app);
    const home = await agent.get("/restaurante/1");
    const csrf = csrfDeFormulario(home.text);
    await agent
      .post("/login")
      .type("form")
      .send({ email: "cliente@test.local", password: "cliente01", csrfToken: csrf });

    const res = await agent.get("/admin");
    expect(res.status).toBe(403);
  });

  it("logout destruye la sesión (ya no se puede entrar a /admin después)", async () => {
    const agent = request.agent(app);
    const home = await agent.get("/restaurante/1");
    const csrf = csrfDeFormulario(home.text);
    await agent
      .post("/login")
      .type("form")
      .send({ email: "admin@test.local", password: "admin01", csrfToken: csrf });

    await agent.get("/logout");
    const res = await agent.get("/admin");
    expect(res.status).toBe(403);
  });
});
