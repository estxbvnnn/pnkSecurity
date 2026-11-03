/**
 * Siembra los usuarios de prueba con contraseña hasheada (bcrypt).
 * Uso: npm run seed
 */
import bcrypt from "bcryptjs";
import { pool } from "../config/db";
import { crearUsuario } from "../models/usuarioModel";

const USUARIOS: { nombre: string; email: string; password: string; rol: "admin" | "cliente" }[] = [
  { nombre: "Administrador", email: "admin@gmail.com", password: "admin01", rol: "admin" },
  { nombre: "Alondra", email: "alondra@gmail.com", password: "alondra01", rol: "cliente" },
];

async function main(): Promise<void> {
  for (const u of USUARIOS) {
    const hash = await bcrypt.hash(u.password, 12);
    await crearUsuario(u.nombre, u.email, hash, u.rol);
    console.log(`Usuario sembrado: ${u.email} (rol: ${u.rol})`);
  }
  await pool.end();
  console.log("Seed completado.");
}

main().catch((err) => {
  console.error("Error al sembrar usuarios:", err);
  process.exit(1);
});
