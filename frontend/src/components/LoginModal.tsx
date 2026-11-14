import { FormEvent, useState } from "react";
import { useSesion } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";

export function LoginModal({ onCerrar }: { onCerrar: () => void }): JSX.Element {
  const { login, verificar2fa } = useSesion();
  const { mostrar } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigo2fa, setCodigo2fa] = useState("");
  const [pidiendo2fa, setPidiendo2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviarLogin(ev: FormEvent): Promise<void> {
    ev.preventDefault();
    setError(null);
    setEnviando(true);
    const res = await login(email, password);
    setEnviando(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo iniciar sesión.");
      return;
    }
    if (res.requiere2fa) {
      setPidiendo2fa(true);
      return;
    }
    mostrar("Sesión iniciada.", "exito");
    onCerrar();
  }

  async function enviar2fa(ev: FormEvent): Promise<void> {
    ev.preventDefault();
    setError(null);
    setEnviando(true);
    const res = await verificar2fa(codigo2fa);
    setEnviando(false);
    if (!res.ok) {
      setError(res.error ?? "Código incorrecto.");
      return;
    }
    mostrar("Sesión iniciada.", "exito");
    onCerrar();
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-caja" onClick={(e) => e.stopPropagation()}>
        <button className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>

        {!pidiendo2fa ? (
          <form onSubmit={enviarLogin} className="modal-form">
            <h2>Iniciar sesión</h2>
            <div className="campo">
              <label htmlFor="login-email">Email</label>
              <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="login-password">Contraseña</label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="campo-error">{error}</p>}
            <button type="submit" className="boton boton--primario boton--bloque" disabled={enviando}>
              {enviando ? "Entrando..." : "Entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={enviar2fa} className="modal-form">
            <h2>Verificación en dos pasos</h2>
            <p className="modal-texto-ayuda">Ingresá el código de tu app de autenticación.</p>
            <div className="campo">
              <label htmlFor="login-2fa">Código</label>
              <input
                id="login-2fa"
                inputMode="numeric"
                autoFocus
                required
                value={codigo2fa}
                onChange={(e) => setCodigo2fa(e.target.value)}
              />
            </div>
            {error && <p className="campo-error">{error}</p>}
            <button type="submit" className="boton boton--primario boton--bloque" disabled={enviando}>
              {enviando ? "Verificando..." : "Verificar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
