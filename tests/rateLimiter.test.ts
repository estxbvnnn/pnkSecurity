// Archivo separado a propósito: usa su PROPIA instancia de createApp() para
// que el contador de intentos del rate limiter (en memoria, por proceso) no
// se mezcle con los intentos de login de tests/auth.test.ts.
import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/config/db";
import { csrfDeFormulario } from "./helpers";

const app = createApp();

describe("Rate limiting de login (equivalente VUL-20)", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("bloquea el login tras 5 intentos fallidos consecutivos", async () => {
    const agent = request.agent(app);
    const home = await agent.get("/restaurante/1");
    const csrf = csrfDeFormulario(home.text);

    for (let i = 0; i < 5; i++) {
      await agent
        .post("/login")
        .type("form")
        .send({ email: "admin@test.local", password: "clave-incorrecta", csrfToken: csrf });
    }

    const res = await agent
      .post("/login")
      .type("form")
      .send({ email: "admin@test.local", password: "clave-incorrecta", csrfToken: csrf });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("login=bloqueado");
  });
});
