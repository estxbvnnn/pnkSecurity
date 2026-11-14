import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { SessionProvider } from "./context/SessionContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <SessionProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </SessionProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
