import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/config/db";
import { csrfDeFormulario } from "./helpers";

const app = createApp();

async function loginAdmin(agent: ReturnType<typeof request.agent>): Promise<void> {
  const home = await agent.get("/restaurante/1");
  const csrf = csrfDeFormulario(home.text);
  await agent
    .post("/login")
    .type("form")
    .send({ email: "admin@test.local", password: "admin01", csrfToken: csrf });
}

describe("Panel de administración", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("el admin puede ver el dashboard de un restaurante", async () => {
    const agent = request.agent(app);
    await loginAdmin(agent);

    // /admin/1 solo cambia el restaurante activo en sesión y redirige a la
    // URL limpia /admin (sin importar qué restaurante se administre).
    const cambio = await agent.get("/admin/1");
    expect(cambio.status).toBe(302);
    expect(cambio.headers.location).toBe("/admin");

    const res = await agent.get("/admin");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Panel de Administración");
  });

  it("el admin puede crear una nueva categoría dentro de una carta", async () => {
    const agent = request.agent(app);
    await loginAdmin(agent);
    await agent.get("/admin/1"); // activa el restaurante 1 en sesión

    const dash = await agent.get("/admin");
    const csrf = csrfDeFormulario(dash.text);

    const res = await agent.post("/admin/categorias").type("form").send({
      cartaId: 1,
      nombre: "Categoria de Prueba QA",
      orden: 99,
      csrfToken: csrf,
    });
    expect(res.status).toBe(302);

    const dash2 = await agent.get("/admin");
    expect(dash2.text).toContain("Categoria de Prueba QA");
  });

  it("crear un producto sin foto es rechazado (la foto es obligatoria al crear)", async () => {
    const agent = request.agent(app);
    await loginAdmin(agent);

    const form = await agent.get("/admin/items/nuevo");
    const csrf = csrfDeFormulario(form.text);

    const res = await agent.post("/admin/items").type("form").send({
      nombre: "Producto sin foto",
      categoriaId: 1,
      precio: 1000,
      puntuacion: 0,
      csrfToken: csrf,
    });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=foto_requerida");
  });

  it("ocultar/mostrar una carta funciona (y se restaura: los demás tests dependen de que la carta 1 siga visible)", async () => {
    const agent = request.agent(app);
    await loginAdmin(agent);
    await agent.get("/admin/1"); // activa el restaurante 1 en sesión

    const dash = await agent.get("/admin");
    const csrf = csrfDeFormulario(dash.text);

    // Oculta la carta...
    const res = await agent.post("/admin/cartas/1/toggle").type("form").send({ csrfToken: csrf });
    expect(res.status).toBe(302);

    const publica = await agent.get("/restaurante/1");
    expect(publica.text).not.toContain("Ensalada Cesar");

    // ...y la vuelve a mostrar (otros tests/archivos comparten esta misma base
    // de datos de pruebas y esperan que la carta 1 esté visible).
    const vuelta = await agent.post("/admin/cartas/1/toggle").type("form").send({ csrfToken: csrf });
    expect(vuelta.status).toBe(302);

    const publicaDeVuelta = await agent.get("/restaurante/1");
    expect(publicaDeVuelta.text).toContain("Ensalada Cesar");
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
