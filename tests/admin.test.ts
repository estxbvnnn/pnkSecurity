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

    const res = await agent.get("/admin/1");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Panel de Administración");
  });

  it("el admin puede crear una nueva categoría dentro de una carta", async () => {
    const agent = request.agent(app);
    await loginAdmin(agent);

    const dash = await agent.get("/admin/1");
    const csrf = csrfDeFormulario(dash.text);

    const res = await agent.post("/admin/categorias").type("form").send({
      cartaId: 1,
      nombre: "Categoria de Prueba QA",
      orden: 99,
      csrfToken: csrf,
    });
    expect(res.status).toBe(302);

    const dash2 = await agent.get("/admin/1");
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

    const dash = await agent.get("/admin/1");
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
});
