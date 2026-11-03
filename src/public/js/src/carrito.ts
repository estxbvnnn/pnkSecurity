// Cliente del carrito, escrito en TypeScript y compilado a JS plano.
// Envía el token CSRF (leído del <meta name="csrf-token">) en cada petición.
//
// Importante: este archivo se carga con <script src="..."> normal (NO
// type="module"). Por eso:
//  - No puede tener ningún `import`/`export` real a nivel de archivo: eso
//    hace que tsc emita `export {};` en el JS compilado, que es un error de
//    sintaxis fuera de un módulo y rompe TODO el archivo en el navegador.
//  - Todo el contenido va dentro de un IIFE, para no declarar nada en el
//    scope global (si no, al compilar junto a admin.ts, tsc choca por
//    nombres repetidos como "Swal" aunque nunca se carguen en la misma
//    página).
(function () {
  type SwalType = typeof import("sweetalert2")["default"];
  const Swal = (window as unknown as { Swal: SwalType }).Swal;

  function csrfToken(): string {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? (meta.getAttribute("content") ?? "") : "";
  }

  interface RespuestaApi {
    ok: boolean;
    error?: string;
    posicion?: number;
  }

  async function postJson(url: string, data: Record<string, unknown>): Promise<RespuestaApi> {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
        body: JSON.stringify({ ...data, csrfToken: csrfToken() }),
      });
      if (!res.ok) {
        const texto = await res.text().catch(() => "");
        return { ok: false, error: texto || `HTTP ${res.status}` };
      }
      return (await res.json()) as RespuestaApi;
    } catch {
      return { ok: false, error: "No se pudo conectar con el servidor." };
    }
  }

  function toastExito(mensaje: string): void {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: mensaje,
      showConfirmButton: false,
      timer: 1800,
      timerProgressBar: true,
    });
  }

  function alertaError(mensaje: string): void {
    Swal.fire({ icon: "error", title: "Ups…", text: mensaje, confirmButtonColor: "#0b2e4f" });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // --- Agregar producto ---
    document.querySelectorAll<HTMLButtonElement>(".btn-seleccionar").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const itemId = btn.dataset.id;
        if (!itemId) return;
        const r = await postJson("/carrito/agregar", { itemId });
        if (r.ok) {
          toastExito("Producto agregado al carrito");
        } else {
          alertaError(r.error ?? "No se pudo agregar el producto.");
        }
      });
    });

    // --- Eliminar un ítem del carrito ---
    document.querySelectorAll<HTMLAnchorElement>(".btn-elim").forEach((btn) => {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const pos = btn.dataset.pos;
        if (!pos) return;
        const r = await postJson("/carrito/eliminar", { posicion: pos });
        if (r.ok) {
          location.reload();
        } else {
          alertaError(r.error ?? "No se pudo eliminar el producto.");
        }
      });
    });

    // --- Vaciar carrito (acción destructiva: se pide confirmación) ---
    const btnVaciar = document.getElementById("btnVaciar");
    btnVaciar?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const confirmacion = await Swal.fire({
        title: "¿Vaciar el carrito?",
        text: "Se eliminarán todos los productos agregados.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, vaciar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#b00020",
        cancelButtonColor: "#6c757d",
      });
      if (!confirmacion.isConfirmed) return;

      const r = await postJson("/carrito/vaciar", {});
      if (r.ok) {
        location.reload();
      } else {
        alertaError(r.error ?? "No se pudo vaciar el carrito.");
      }
    });

    // --- Confirmar pedido (se convierte en una venta real, no se puede deshacer) ---
    const formConfirmar = document.getElementById("formConfirmarPedido") as HTMLFormElement | null;
    formConfirmar?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const confirmacion = await Swal.fire({
        title: "¿Confirmar este pedido?",
        text: "Quedará registrado como una venta.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, confirmar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#2e7d32",
        cancelButtonColor: "#6c757d",
      });
      if (confirmacion.isConfirmed) formConfirmar.submit();
    });

    // --- Pestañas de la carta (Vinos, Bebidas, Entradas, ...) ---
    // Manejo 100% propio, sin usar data-toggle="tab": ese atributo hace que
    // el plugin NATIVO de Bootstrap también se auto-inicialice en los mismos
    // enlaces, y su lógica terminaba pisando el cambio de clase justo
    // después de aplicarlo (la pestaña quedaba "activa" visualmente pero el
    // panel de contenido no cambiaba). Al no usar ese atributo, solo corre
    // este código.
    document.querySelectorAll<HTMLAnchorElement>("#nav-tab a.carta-tab").forEach((tab) => {
      tab.addEventListener("click", (ev) => {
        ev.preventDefault();
        const destino = tab.getAttribute("href");
        if (!destino) return;
        const panelDestino = document.querySelector(destino);
        if (!panelDestino) return;

        document.querySelectorAll("#nav-tab a.carta-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        document.querySelectorAll(".tab-content .tab-pane").forEach((pane) => {
          pane.classList.remove("show", "active");
        });
        panelDestino.classList.add("show", "active");
      });
    });

    // --- Mensaje de error de login (reemplaza el texto plano del servidor) ---
    const loginError = document.body.dataset.loginError;
    if (loginError === "error") {
      alertaError("Credenciales inválidas.");
    } else if (loginError === "bloqueado") {
      Swal.fire({
        icon: "warning",
        title: "Demasiados intentos",
        text: "Espera unos minutos antes de volver a intentar iniciar sesión.",
        confirmButtonColor: "#0b2e4f",
      });
    }
  });
})();
