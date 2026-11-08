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
