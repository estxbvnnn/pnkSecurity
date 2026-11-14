import { Outlet } from "react-router-dom";
import { Header } from "./Header";

export function Layout(): JSX.Element {
  return (
    <>
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <footer className="pie-publico">
        <div className="contenedor pie-publico__fila">
          <span className="pie-publico__marca">
            <i className="ti-receipt" /> Carta Digital
          </span>
          <span className="pie-publico__nota">© {new Date().getFullYear()} — Menús digitales, pedidos desde la mesa.</span>
        </div>
      </footer>
    </>
  );
}
