import { Outlet } from "react-router-dom";
import { Header } from "./Header";

export function Layout(): JSX.Element {
  return (
    <>
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <footer className="text-center text-muted small py-3">© {new Date().getFullYear()} Carta Digital</footer>
    </>
  );
}
