import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// El frontend público (React) se compila a dist/public-spa, al lado de
// dist/public (assets del panel admin, que sigue siendo EJS) y dist/views.
// Express sirve ambos como estáticos (ver src/app.ts) y el panel admin NO
// se toca: este build es solo para el sitio público.
export default defineConfig({
  plugins: [react()],
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, "../dist/public-spa"),
    emptyOutDir: true,
  },
  server: {
    // Solo para `npm run dev:frontend` en desarrollo local: el server de
    // Express corre en :3000, Vite sirve el front en :5173 y le reenvía las
    // llamadas /api al backend real.
    proxy: {
      "/api": "http://localhost:3000",
      // Hojas de estilo/imágenes heredadas del sitio original (Bootstrap,
      // themify-icons, style.css/custom.css, fotos de restaurantes): viven
      // en src/public, servidas por el server real en :3000.
      "/vendors": "http://localhost:3000",
      "/css": "http://localhost:3000",
      "/img": "http://localhost:3000",
      "/imagenes": "http://localhost:3000",
    },
  },
});
