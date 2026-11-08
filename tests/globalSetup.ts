// Corre UNA vez antes de toda la suite: aplica el esquema (db/schema.sql,
// que ya hace DROP/CREATE — deja la base de pruebas en un estado limpio y
// conocido en cada corrida) y siembra dos usuarios (admin/cliente) con
// bcrypt, igual que en producción. Usa su propia conexión a Postgres,
// independiente de src/config/db.ts, para no depender del orden de carga
// de módulos de Jest.
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const TEST_DB = {
  host: process.env.TEST_PGHOST ?? "127.0.0.1",
  port: Number(process.env.TEST_PGPORT ?? "5432"),
  database: process.env.TEST_PGDATABASE ?? "carta_digital_test",
  user: process.env.TEST_PGUSER ?? "carta_test",
  password: process.env.TEST_PGPASSWORD ?? "jenkins_test_only_2026",
};

export default async function globalSetup(): Promise<void> {
  const pool = new Pool(TEST_DB);
  try {
    const schema = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");
    await pool.query(schema);

    const hashAdmin = await bcrypt.hash("admin01", 12);
    await pool.query(
      `INSERT INTO usuarios (nombre, email, password, estado, rol) VALUES ($1, $2, $3, '1', 'admin')`,
      ["Admin QA", "admin@test.local", hashAdmin]
    );

    const hashCliente = await bcrypt.hash("cliente01", 12);
    await pool.query(
      `INSERT INTO usuarios (nombre, email, password, estado, rol) VALUES ($1, $2, $3, '1', 'cliente')`,
      ["Cliente QA", "cliente@test.local", hashCliente]
    );
  } finally {
    await pool.end();
  }
}
