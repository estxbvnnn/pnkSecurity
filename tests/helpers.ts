import request from "supertest";

/** Extrae el token CSRF del formulario de login/admin (<input ... name="csrfToken" value="...">). */
export function csrfDeFormulario(html: string): string {
  const m = html.match(/name="csrfToken" value="([^"]+)"/);
  if (!m) throw new Error("No se encontró csrfToken en el HTML (formulario).");
  return m[1];
}

/** Extrae el token CSRF del <meta name="csrf-token" content="..."> usado por las llamadas fetch del cliente. */
export function csrfDeMeta(html: string): string {
  const m = html.match(/name="csrf-token" content="([^"]+)"/);
  if (!m) throw new Error("No se encontró csrf-token en el HTML (meta).");
  return m[1];
}

/**
 * CSRF para la API JSON pública (GET /api/csrf), consumida por el frontend
 * React vía header X-CSRF-Token en vez de un campo de formulario.
 */
export async function csrfDeApi(agent: ReturnType<typeof request.agent>): Promise<string> {
  const res = await agent.get("/api/csrf");
  return (res.body as { csrfToken: string }).csrfToken;
}
