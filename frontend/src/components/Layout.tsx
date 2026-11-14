import { Outlet } from "react-router-dom";
import { Header } from "./Header";

export function Layout(): JSX.Element {
  return (
    <>
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="contenedor footer__fila">
          <span>© {new Date().getFullYear()} Carta Digital</span>
          <span className="footer__nota">Proyecto académico — Node.js + Express + React</span>
        </div>
      </footer>
    </>
  );
}
