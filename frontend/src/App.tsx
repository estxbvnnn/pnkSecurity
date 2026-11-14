import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Listado } from "./pages/Listado";
import { Carrito } from "./pages/Carrito";
import { Carta } from "./pages/Carta";
import { NoEncontrado } from "./pages/NoEncontrado";

export function App(): JSX.Element {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Listado />} />
        {/* Rutas estáticas ANTES del slug dinámico, para que no choquen. */}
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/:slug" element={<Carta />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  );
}
