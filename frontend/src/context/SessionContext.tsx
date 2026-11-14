import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api, ApiError } from "../api";

function mensajeDeError(err: unknown, porDefecto: string): string {
  if (err instanceof ApiError && err.status === 429) return "Demasiados intentos. Esperá unos minutos y volvé a intentar.";
  return porDefecto;
}

interface SesionState {
  nombreUsuario: string | null;
  esAdmin: boolean;
  cargando: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; requiere2fa?: boolean; error?: string }>;
  verificar2fa: (codigo: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SesionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }): JSX.Element {
  const [nombreUsuario, setNombreUsuario] = useState<string | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    try {
      const datos = await api.sesion();
      setNombreUsuario(datos.nombreUsuario);
      setEsAdmin(datos.esAdmin);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.login(email, password);
      if (res.requiere2fa) return { ok: true, requiere2fa: true };
      setNombreUsuario(res.nombre ?? null);
      setEsAdmin(res.rol === "admin");
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mensajeDeError(err, "Email o contraseña incorrectos.") };
    }
  }, []);

  const verificar2fa = useCallback(async (codigo: string) => {
    try {
      const res = await api.verificar2fa(codigo);
      setNombreUsuario(res.nombre);
      setEsAdmin(res.rol === "admin");
      return { ok: true };
    } catch {
      return { ok: false, error: "Código incorrecto." };
    }
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setNombreUsuario(null);
    setEsAdmin(false);
  }, []);

  return (
    <SessionContext.Provider value={{ nombreUsuario, esAdmin, cargando, login, verificar2fa, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSesion(): SesionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <SessionProvider>");
  return ctx;
}
