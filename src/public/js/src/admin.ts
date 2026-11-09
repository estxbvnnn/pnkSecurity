// Cliente del panel de administración. Confirmaciones con SweetAlert2 para
// las acciones destructivas (eliminar producto), en vez de confirm() nativo.
//
// Importante: este archivo se carga con <script src="..."> normal (NO
// type="module"). Por eso todo va dentro de un IIFE (sin declarar nada en
// el scope global): si no, al compilarse junto a carrito.ts, tsc choca por
// nombres repetidos como "Swal" aunque los dos archivos nunca se cargan
// juntos en la misma página.
(function () {
  type SwalType = typeof import("sweetalert2")["default"];
  const Swal = (window as unknown as { Swal: SwalType }).Swal;

  function toastExito(mensaje: string): void {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: mensaje,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // --- Selector de restaurante (ventas): el CSP bloquea onchange="..."
    // inline (script-src-attr 'none'), por eso se enlaza aquí. ---
    document.querySelectorAll<HTMLSelectElement>(".selector-restaurante").forEach((select) => {
      select.addEventListener("change", () => select.form?.submit());
    });

    // --- Selector de estado de un pedido (Ventas): mismo motivo, auto-envía
    // su propio formulario al cambiar. ---
    document.querySelectorAll<HTMLSelectElement>(".selector-estado-pedido").forEach((select) => {
      select.addEventListener("change", () => select.form?.submit());
    });

    // --- Selector de restaurante (dashboard): navega a /admin/:id (ruta
    // limpia, sin ?id= en la URL). ---
    document.querySelectorAll<HTMLSelectElement>(".selector-restaurante-path").forEach((select) => {
      select.addEventListener("change", () => {
        window.location.href = `/admin/${select.value}`;
      });
    });

    // --- Mostrar/Ocultar carta: evita que el click abra/cierre el acordeón
    // (mismo motivo: el CSP bloquea onclick="event.stopPropagation()" inline). ---
    document.querySelectorAll<HTMLFormElement>(".form-toggle-carta").forEach((form) => {
      form.addEventListener("click", (ev) => ev.stopPropagation());
    });

    // --- Confirmar antes de desactivar el 2FA ---
    document.querySelectorAll<HTMLFormElement>(".form-desactivar-2fa").forEach((form) => {
      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const confirmacion = await Swal.fire({
          title: "¿Desactivar la verificación en dos pasos?",
          text: "El panel de administración quedará protegido solo con contraseña.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Sí, desactivar",
          cancelButtonText: "Cancelar",
          confirmButtonColor: "#b00020",
          cancelButtonColor: "#6c757d",
        });
        if (confirmacion.isConfirmed) form.submit();
      });
    });

    // --- Confirmar antes de eliminar un producto ---
    document.querySelectorAll<HTMLFormElement>(".form-eliminar-item").forEach((form) => {
      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const nombre = form.dataset.nombre ?? "este producto";
        const confirmacion = await Swal.fire({
          title: `¿Eliminar "${nombre}"?`,
          text: "El producto dejará de mostrarse en la carta.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Sí, eliminar",
          cancelButtonText: "Cancelar",
          confirmButtonColor: "#b00020",
          cancelButtonColor: "#6c757d",
        });
        if (confirmacion.isConfirmed) form.submit();
      });
    });

    // --- Mensaje de confirmación tras crear/editar/eliminar (?ok=...) ---
    const mensajes: Record<string, string> = {
      creado: "Producto creado correctamente.",
      actualizado: "Producto actualizado correctamente.",
      eliminado: "Producto eliminado.",
    };
    const ok = document.body.dataset.ok;
    if (ok && mensajes[ok]) toastExito(mensajes[ok]);

    // --- Error de validación del formulario de producto ---
    const errores: Record<string, string> = {
      "1": "Revisa el nombre, precio y categoría del producto.",
      foto_requerida: "Debes subir una foto del producto.",
      foto: "La imagen no es válida (solo JPG, PNG, WEBP o GIF, máx. 5 MB).",
    };
    const error = document.body.dataset.formError;
    if (error && errores[error]) {
      Swal.fire({
        icon: "error",
        title: "Datos inválidos",
        text: errores[error],
        confirmButtonColor: "#0b2e4f",
      });
    }
  });
})();
