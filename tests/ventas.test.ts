import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/config/db";
import { csrfDeFormulario } from "./helpers";

// Archivo propio (y por lo tanto su propia instancia de `app`/rate-limiter en
// memoria) por el mismo motivo que rateLimiter.test.ts: cada test que hace
// login cuenta contra el límite de 5 intentos por IP (el limiter no excluye
// los logins exitosos) — si estos tests compartieran app con admin.test.ts,
// la suma de logins de ambos archivos terminaría bloqueando los últimos.
const app = createApp();

async function loginAdmin(agent: ReturnType<typeof request.agent>): Promise<void> {
  const home = await agent.get("/restaurante/1");
  const csrf = csrfDeFormulario(home.text);
  await agent
    .post("/login")
    .type("form")
    .send({ email: "admin@test.local", password: "admin01", csrfToken: csrf });
}

describe("Ventas: estado de pedido y panel General", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("el admin puede cambiar el estado de un pedido de SU restaurante activo", async () => {
    const agent = request.agent(app);
    await loginAdmin(agent);
    await agent.get("/admin/1"); // activa el restaurante 1 en sesión

    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO pedidos (restaurante_id, cliente_nombre, total) VALUES (1, 'Cliente QA Estado', 1000) RETURNING id`
    );
    const pedidoId = rows[0].id;

    const ventas = await agent.get("/admin/ventas");
    const csrf = csrfDeFormulario(ventas.text);

    const res = await agent
      .post(`/admin/pedidos/${pedidoId}/estado`)
      .type("form")
      .send({ estado: "entregado", csrfToken: csrf });
    expect(res.status).toBe(302);

    const { rows: actualizado } = await pool.query<{ estado: string }>(`SELECT estado FROM pedidos WHERE id = $1`, [
      pedidoId,
    ]);
    expect(actualizado[0].estado).toBe("entregado");
  });

  it("el admin NO puede cambiar el estado de un pedido de OTRO restaurante (IDOR)", async () => {
    const agent = request.agent(app);
    await loginAdmin(agent);
    await agent.get("/admin/2"); // activa el restaurante 2 en sesión

    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO pedidos (restaurante_id, cliente_nombre, total) VALUES (1, 'Cliente QA IDOR', 1000) RETURNING id`
    );
    const pedidoId = rows[0].id;

    const ventas = await agent.get("/admin/ventas");
    const csrf = csrfDeFormulario(ventas.text);

    // El admin está "parado" en el restaurante 2, pero el pedido es del 1:
    // el intento no debe tener efecto (filtro por restaurante en el UPDATE).
    await agent.post(`/admin/pedidos/${pedidoId}/estado`).type("form").send({ estado: "cancelado", csrfToken: csrf });

    const { rows: sinCambios } = await pool.query<{ estado: string }>(`SELECT estado FROM pedidos WHERE id = $1`, [
      pedidoId,
    ]);
    expect(sinCambios[0].estado).toBe("confirmado");
  });

  it("el panel General de Ventas muestra pedidos de varios restaurantes con su nombre", async () => {
    const agent = request.agent(app);
    await loginAdmin(agent);

    await pool.query(
      `INSERT INTO pedidos (restaurante_id, cliente_nombre, total) VALUES (1, 'Cliente QA General 1', 1000), (2, 'Cliente QA General 2', 2000)`
    );

    const res = await agent.get("/admin/ventas?id=todos");
    expect(res.status).toBe(200);
    expect(res.text).toContain("General");
    expect(res.text).toContain("Cliente QA General 1");
    expect(res.text).toContain("Cliente QA General 2");
    // En modo general se muestra el restaurante de cada fila.
    expect(res.text).toContain("Afríca Restobar");
    expect(res.text).toContain("Bahía Restaurant");
  });
});
