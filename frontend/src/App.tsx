import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Bienvenida } from "./pages/Bienvenida";
import { Carrito } from "./pages/Carrito";
import { Carta } from "./pages/Carta";
import { NoEncontrado } from "./pages/NoEncontrado";

export function App(): JSX.Element {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* No hay listado público de restaurantes: cada uno se accede
            directo vía QR a /<slug> (ver Carta.tsx). "/" es solo una
            pantalla neutra para quien entra sin slug. */}
        <Route path="/" element={<Bienvenida />} />
        {/* Rutas estáticas ANTES del slug dinámico, para que no choquen. */}
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/:slug" element={<Carta />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  );
}
