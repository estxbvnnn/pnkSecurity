import crypto from "crypto";
import { env } from "../config/env";

/**
 * Cifra en reposo el secreto TOTP del 2FA (OWASP A02 - Cryptographic
 * Failures): aunque es un dato "solo nuestro" y no una contraseña, si la
 * base de datos se filtrara, un secreto TOTP en texto plano permitiría
 * generar códigos válidos indefinidamente. Se cifra con AES-256-GCM usando
 * una clave derivada de SESSION_SECRET (ya es un secreto largo y aleatorio
 * requerido por la app — ver config/env.ts).
 */
const CLAVE = crypto.createHash("sha256").update(env.session.secret).digest();

export function cifrar(texto: string): string {
  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv("aes-256-gcm", CLAVE, iv);
  const cifrado = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  const tag = cifrador.getAuthTag();
  return Buffer.concat([iv, tag, cifrado]).toString("base64");
}

export function descifrar(valor: string): string {
  const datos = Buffer.from(valor, "base64");
  const iv = datos.subarray(0, 12);
  const tag = datos.subarray(12, 28);
  const cifrado = datos.subarray(28);
  const descifrador = crypto.createDecipheriv("aes-256-gcm", CLAVE, iv);
  descifrador.setAuthTag(tag);
  return Buffer.concat([descifrador.update(cifrado), descifrador.final()]).toString("utf8");
}
