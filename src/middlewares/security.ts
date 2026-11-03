import helmet from "helmet";
import { RequestHandler } from "express";

/**
 * Cabeceras de seguridad HTTP (equivalente a VUL-19 del informe pnkSecurity:
 * CSP, X-Frame-Options, X-Content-Type-Options, etc.). helmet las aplica
 * automáticamente y de forma mantenida, en vez de setearlas a mano.
 */
export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  // Express ya no envía X-Powered-By si se usa app.disable('x-powered-by') (ver app.ts).
});
