// Archivo separado a propósito: usa su PROPIA instancia de createApp() para
// que el contador de intentos del rate limiter (en memoria, por proceso) no
// se mezcle con los intentos de login de tests/auth.test.ts.
import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/config/db";
import { csrfDeApi } from "./helpers";

const app = createApp();

describe("Rate limiting de login (equivalente VUL-20)", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("bloquea el login tras 5 intentos fallidos consecutivos", async () => {
    const agent = request.agent(app);
    const csrf = await csrfDeApi(agent);

    for (let i = 0; i < 5; i++) {
      await agent
        .post("/api/login")
        .set("X-CSRF-Token", csrf)
        .send({ email: "admin@test.local", password: "clave-incorrecta" });
    }

    const res = await agent
      .post("/api/login")
      .set("X-CSRF-Token", csrf)
      .send({ email: "admin@test.local", password: "clave-incorrecta" });

    expect(res.status).toBe(429);
    expect(res.body.ok).toBe(false);
  });
});
