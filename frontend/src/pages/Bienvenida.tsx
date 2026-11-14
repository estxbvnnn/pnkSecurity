// No hay selector público de restaurantes: cada restaurante se accede
// escaneando el código QR de su mesa, que apunta directo a /<slug>
// (ver App.tsx). Esta es solo la pantalla que se ve si alguien entra a "/"
// sin un slug (por error, o probando el sitio).
export function Bienvenida(): JSX.Element {
  return (
    <section className="hero-publico">
      <div className="contenedor" style={{ textAlign: "center" }}>
        <span className="hero-publico__etiqueta">Carta Digital</span>
        <h1>Escaneá el código QR de tu mesa</h1>
        <p style={{ margin: "0 auto" }}>Cada mesa tiene su propio código QR que te lleva directo a la carta del restaurante.</p>
      </div>
    </section>
  );
}
