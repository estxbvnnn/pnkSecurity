import { createContext, useCallback, useContext, useState, ReactNode } from "react";

interface Toast {
  id: number;
  mensaje: string;
  tipo: "exito" | "error" | "info";
}

interface ToastState {
  mostrar: (mensaje: string, tipo?: Toast["tipo"]) => void;
}

const ToastContext = createContext<ToastState | null>(null);
let contador = 0;

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mostrar = useCallback((mensaje: string, tipo: Toast["tipo"] = "info") => {
    const id = ++contador;
    setToasts((actuales) => [...actuales, { id, mensaje, tipo }]);
    setTimeout(() => {
      setToasts((actuales) => actuales.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tipo}`}>
            {t.mensaje}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastState {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
